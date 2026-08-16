import * as Tone from "tone";
import type { Pattern } from "@vibuca/synth8-core";
import type {
    GameAudio,
    GameAudioOptions,
    GameMusicOptions,
    GameSfxOptions,
    PlaySfxOptions,
    PreparedPlayback,
    PreparedSfx,
} from "./model";
import { normalizeAudioBuffer, renderChunkToAudioBuffer, renderToAudioBuffer } from "./playback/render";
import { prepare as preparePlayback } from "./playback/play";

const DEFAULT_BPM = 120;
const DEFAULT_SFX_VOICES = 8;
const DEFAULT_STREAM_CHUNK_DURATION = 5;
const DEFAULT_STREAM_TAIL_DURATION = 0.25;

type InternalPreparedSfx = PreparedSfx & {
    buffer: AudioBuffer;
    players: Tone.Player[];
    nextVoice: number;
};

type InternalPreparedMusic = PreparedPlayback;

const normalizeVolume = (volume: number): number => Math.max(0, volume);

const toDecibels = (volume: number): number => Tone.gainToDb(normalizeVolume(volume));

const setVolume = (gainNode: Tone.Gain, volume: number): void => {
    const gain = gainNode.gain;
    const value = normalizeVolume(volume);
    const now = Tone.now();

    gain.value = value;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(value, now);
};

const setPlayerVolume = (player: Tone.Player, volume: number): void => {
    player.volume.value = toDecibels(volume);
};

const safeLoopEnd = (buffer: AudioBuffer, requestedLoopEnd: number): number => {
    const bufferDuration = buffer.duration;

    if (!Number.isFinite(bufferDuration) || bufferDuration <= 0) {
        return requestedLoopEnd;
    }

    return Math.min(requestedLoopEnd, bufferDuration);
};

const loopOffset = (startedAt: number, loopDuration: number): number => {
    const elapsed = Tone.immediate() - startedAt;

    return ((elapsed % loopDuration) + loopDuration) % loopDuration;
};

export const createGameAudio = async (
    options: GameAudioOptions = {}
): Promise<GameAudio> => {
    // AudioContext.resume() is commonly rejected on Android/WebView until a
    // user gesture. Do not make constructing the service fail; Tone.start()
    // will be retried by the first user-initiated play.
    try {
        await Tone.start();
    } catch {
        // The service remains usable and can be started from a pointer event.
    }

    let masterVolume = normalizeVolume(options.masterVolume ?? 1);
    let musicVolume = normalizeVolume(options.musicVolume ?? 1);
    let sfxVolume = normalizeVolume(options.sfxVolume ?? 1);
    let musicDucking = 1;
    const masterGain = new Tone.Gain(masterVolume);
    const musicGain = new Tone.Gain(musicVolume);
    const sfxGain = new Tone.Gain(sfxVolume);
    const limiter = new Tone.Limiter(-1);
    const disposables: Array<{ dispose: () => void }> = [
        masterGain,
        musicGain,
        sfxGain,
        limiter,
    ];

    let currentMusic: InternalPreparedMusic | undefined;
    const musicSet = new Set<InternalPreparedMusic>();
    const sfxSet = new Set<InternalPreparedSfx>();

    musicGain.connect(limiter);
    sfxGain.connect(limiter);
    limiter.connect(masterGain);
    masterGain.toDestination();

    const prepareRenderedMusic = async (
        pattern: Pattern,
        musicOptions: GameMusicOptions = {}
    ): Promise<InternalPreparedMusic> => {
        const bpm = musicOptions.bpm ?? DEFAULT_BPM;
        const buffer = await renderToAudioBuffer(pattern, { bpm });
        const duration = pattern.length * (60 / bpm);
        const player = new Tone.Player(normalizeAudioBuffer(buffer));
        let startedAt = 0;
        let offset = 0;
        let started = false;
        let paused = false;

        player.loop = true;
        player.loopStart = 0;
        player.loopEnd = safeLoopEnd(buffer, duration);
        player.connect(musicGain);

        const playback: InternalPreparedMusic = {
            playbackMode: "rendered",
            start() {
                const previousMusic = currentMusic && currentMusic !== playback
                    ? currentMusic
                    : undefined;

                if (started) {
                    player.stop();
                }

                offset = 0;
                startedAt = Tone.immediate();
                started = true;
                paused = false;
                currentMusic = playback;
                player.start();
                // Starting a new track must not dispose a prepared track: it
                // may be retained by the track cache or a music stack.
                previousMusic?.stop();
            },
            pause() {
                if (!started || paused) {
                    return;
                }

                offset = loopOffset(startedAt, duration);
                paused = true;
                player.stop();
            },
            resume() {
                if (!started || !paused) {
                    return;
                }

                startedAt = Tone.immediate() - offset;
                paused = false;
                player.start(undefined, offset);
            },
            stop() {
                if (!started) {
                    return;
                }

                player.stop();
                offset = 0;
                started = false;
                paused = false;
            },
            dispose() {
                playback.stop();
                player.dispose();

                if (currentMusic === playback) {
                    currentMusic = undefined;
                }

                musicSet.delete(playback);
            },
        };

        musicSet.add(playback);

        return playback;
    };

    const prepareStreamedMusic = async (
        pattern: Pattern,
        musicOptions: GameMusicOptions = {}
    ): Promise<InternalPreparedMusic> => {
        const bpm = musicOptions.bpm ?? DEFAULT_BPM;
        const chunkDuration = Math.max(
            0.5,
            musicOptions.streamChunkDuration ?? DEFAULT_STREAM_CHUNK_DURATION
        );
        const tailDuration = Math.max(0, musicOptions.streamTailDuration ?? DEFAULT_STREAM_TAIL_DURATION);
        const prefetchChunks = Math.max(0, Math.floor(musicOptions.streamPrefetchChunks ?? 0));
        const duration = pattern.length * (60 / bpm);
        const activePlayers = new Set<Tone.Player>();
        const renderTimers: ReturnType<typeof setTimeout>[] = [];
        let firstBuffer = await renderChunkToAudioBuffer(pattern, {
            bpm,
            start: 0,
            duration: Math.min(chunkDuration, duration),
            tail: tailDuration,
            cache: false,
        });
        let startedAt = 0;
        let offset = 0;
        let started = false;
        let paused = false;
        let generation = 0;
        let pendingReplacement: InternalPreparedMusic | undefined;
        const prefetched = new Map<number, Promise<{ buffer: AudioBuffer; playDuration: number; start: number }>>();

        const clearTimers = (): void => {
            for (const timer of renderTimers.splice(0)) {
                clearTimeout(timer);
            }
        };

        const disposePlayers = (): void => {
            clearTimers();

            for (const player of activePlayers) {
                player.stop();
                player.dispose();
            }

            activePlayers.clear();
            prefetched.clear();
        };

        const renderChunk = async (start: number) => {
            const playDuration = Math.min(chunkDuration, duration - start);
            const buffer = start === 0 && firstBuffer
                ? firstBuffer
                : await renderChunkToAudioBuffer(pattern, {
                    bpm,
                    start,
                    duration: playDuration,
                    tail: tailDuration,
                    cache: false,
                });

            return { buffer, playDuration, start };
        };

        const nextOffset = (start: number, playDuration: number): number => {
            const next = start + playDuration;

            return next >= duration ? 0 : next;
        };

        const getChunk = (start: number): Promise<{ buffer: AudioBuffer; playDuration: number; start: number }> => {
            const existing = prefetched.get(start);
            if (existing) return existing;
            const pending = renderChunk(start);
            prefetched.set(start, pending);
            void pending.catch(() => prefetched.delete(start));
            return pending;
        };

        const prefetch = (start: number, playDuration: number): void => {
            let next = start;
            let length = playDuration;
            for (let index = 0; index < prefetchChunks; index++) {
                next = nextOffset(next, length);
                if (next === start || prefetched.has(next)) break;
                void getChunk(next);
                length = Math.min(chunkDuration, duration - next);
            }
        };

        const scheduleNext = async (
            start: number,
            startTime: number,
            activeGeneration: number
        ): Promise<void> => {
            const chunk = await getChunk(start);
            prefetched.delete(start);

            if (!started || paused || generation !== activeGeneration) {
                return;
            }

            const player = new Tone.Player(normalizeAudioBuffer(chunk.buffer));

            activePlayers.add(player);
            player.connect(musicGain);
            currentMusic = playback;
            pendingReplacement?.dispose();
            pendingReplacement = undefined;

            if (chunk.playDuration >= duration) {
                player.loop = true;
                player.loopStart = 0;
                player.loopEnd = safeLoopEnd(chunk.buffer, duration);
            }

            player.start(startTime);
            prefetch(chunk.start, chunk.playDuration);

            if (chunk.playDuration >= duration) {
                return;
            }

            const nextStartTime = startTime + chunk.playDuration;
            const delay = Math.max(0, (nextStartTime - Tone.now() - chunkDuration) * 1000);
            const timer = setTimeout(() => {
                void scheduleNext(nextOffset(chunk.start, chunk.playDuration), nextStartTime, activeGeneration);
            }, delay);

            renderTimers.push(timer);
        };

        const currentOffset = (): number => {
            const elapsed = Tone.immediate() - startedAt;

            return ((elapsed % duration) + duration) % duration;
        };

        const startFrom = (start: number): void => {
            generation += 1;
            startedAt = Tone.immediate() - start;
            started = true;
            paused = false;

            void scheduleNext(start, Tone.now(), generation);
        };

        const playback: InternalPreparedMusic = {
            playbackMode: "streamed",
            start() {
                pendingReplacement = currentMusic && currentMusic !== playback
                    ? currentMusic
                    : undefined;
                disposePlayers();
                startFrom(0);
            },
            pause() {
                if (!started || paused) {
                    return;
                }

                offset = currentOffset();
                paused = true;
                generation += 1;
                disposePlayers();
            },
            resume() {
                if (!started || !paused) {
                    return;
                }

                startFrom(offset);
            },
            stop() {
                if (!started && !paused) {
                    return;
                }

                started = false;
                paused = false;
                offset = 0;
                generation += 1;
                disposePlayers();
            },
            dispose() {
                playback.stop();

                if (currentMusic === playback) {
                    currentMusic = undefined;
                }

                musicSet.delete(playback);
            },
        };

        musicSet.add(playback);

        return playback;
    };

    const prepareMusic = (
        pattern: Pattern,
        musicOptions: GameMusicOptions = {}
    ): Promise<PreparedPlayback> => {
        if (musicOptions.playbackMode === "live") {
            return preparePlayback(pattern, { ...musicOptions, playbackMode: "live" });
        }
        if (musicOptions.playbackMode === "rendered") {
            return prepareRenderedMusic(pattern, musicOptions);
        }

        return prepareStreamedMusic(pattern, musicOptions);
    };

    const prepareSfx = async (
        pattern: Pattern,
        sfxOptions: GameSfxOptions = {}
    ): Promise<PreparedSfx> => {
        const bpm = sfxOptions.bpm ?? DEFAULT_BPM;
        const voices = Math.max(1, Math.floor(sfxOptions.voices ?? DEFAULT_SFX_VOICES));
        const buffer = await renderToAudioBuffer(pattern, { bpm });
        const duration = pattern.length * (60 / bpm);
        const players = Array.from({ length: voices }, () => {
            const player = new Tone.Player(normalizeAudioBuffer(buffer));

            player.connect(sfxGain);
            return player;
        });
        const sfx: InternalPreparedSfx = {
            buffer,
            duration,
            voices,
            players,
            nextVoice: 0,
            dispose() {
                for (const player of players) {
                    player.dispose();
                }

                sfxSet.delete(sfx);
            },
        };

        sfxSet.add(sfx);

        return sfx;
    };

    const playSfx = (sfx: PreparedSfx, playOptions: PlaySfxOptions = {}): void => {
        const prepared = sfx as InternalPreparedSfx;
        const player = prepared.players[prepared.nextVoice];

        prepared.nextVoice = (prepared.nextVoice + 1) % prepared.players.length;
        player.stop();

        player.playbackRate = playOptions.playbackRate ?? 1;
        player.volume.value = Tone.gainToDb(normalizeVolume(playOptions.volume ?? 1));

        player.start();
    };

    return {
        prepareMusic,
        prepareSfx,
        playSfx,
        setMasterVolume(volume: number) {
            masterVolume = normalizeVolume(volume);
            setVolume(masterGain, masterVolume);
        },
        setMusicVolume(volume: number) {
            musicVolume = normalizeVolume(volume);
            setVolume(musicGain, musicVolume * musicDucking);
        },
        setSfxVolume(volume: number) {
            sfxVolume = normalizeVolume(volume);
            setVolume(sfxGain, sfxVolume);
        },
        setMusicDucking(ducking: { amount?: number; ramp?: number } | number) {
            const amount = typeof ducking === "number" ? ducking : ducking.amount ?? 0.5;
            musicDucking = Math.min(1, Math.max(0, amount));
            // Keep the public music volume independent from ducking.
            setVolume(musicGain, musicVolume * musicDucking);
        },
        dispose() {
            currentMusic?.dispose();

            for (const music of [...musicSet]) {
                music.dispose();
            }

            for (const sfx of [...sfxSet]) {
                sfx.dispose();
            }

            for (const disposable of disposables) {
                disposable.dispose();
            }
        },
    };
};
