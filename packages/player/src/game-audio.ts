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
import { getLayers } from "./playback/layers";
import { scheduleLayers } from "./playback/scheduler";

const DEFAULT_BPM = 120;
const DEFAULT_SFX_VOICES = 8;

type InternalPreparedSfx = PreparedSfx & {
    buffer: Tone.ToneAudioBuffer;
    players: Tone.Player[];
    nextVoice: number;
};

type InternalPreparedMusic = PreparedPlayback & {
    player: Tone.Player;
};

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

const renderPattern = async (
    pattern: Pattern,
    bpm: number
): Promise<{ buffer: Tone.ToneAudioBuffer; duration: number }> => {
    const secondsPerBeat = 60 / bpm;
    const duration = pattern.length * secondsPerBeat;
    const layers = getLayers(pattern);

    const buffer = await Tone.Offline(({ transport }) => {
        const output = new Tone.Gain(1);

        output.toDestination();
        transport.bpm.value = bpm;
        scheduleLayers(layers, secondsPerBeat, () => undefined, transport, output);
        transport.start(0);
    }, duration);

    return { buffer, duration };
};

const loopOffset = (startedAt: number, loopDuration: number): number => {
    const elapsed = Tone.immediate() - startedAt;

    return ((elapsed % loopDuration) + loopDuration) % loopDuration;
};

export const createGameAudio = async (
    options: GameAudioOptions = {}
): Promise<GameAudio> => {
    await Tone.start();

    let masterVolume = normalizeVolume(options.masterVolume ?? 1);
    let musicVolume = normalizeVolume(options.musicVolume ?? 1);
    let sfxVolume = normalizeVolume(options.sfxVolume ?? 1);
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

    const applyMusicPlayerVolume = (music: InternalPreparedMusic): void => {
        setPlayerVolume(music.player, masterVolume * musicVolume);
    };

    const applyAllMusicPlayerVolumes = (): void => {
        for (const music of musicSet) {
            applyMusicPlayerVolume(music);
        }
    };

    const prepareMusic = async (
        pattern: Pattern,
        musicOptions: GameMusicOptions = {}
    ): Promise<PreparedPlayback> => {
        const bpm = musicOptions.bpm ?? DEFAULT_BPM;
        const { buffer, duration } = await renderPattern(pattern, bpm);
        const player = new Tone.Player(buffer);
        let startedAt = 0;
        let offset = 0;
        let started = false;
        let paused = false;

        player.loop = true;
        player.loopStart = 0;
        player.loopEnd = duration;
        player.toDestination();

        const playback: InternalPreparedMusic = {
            player,
            playbackMode: "rendered",
            start() {
                if (currentMusic && currentMusic !== playback) {
                    currentMusic.dispose();
                }

                if (started) {
                    player.stop();
                }

                offset = 0;
                startedAt = Tone.immediate();
                started = true;
                paused = false;
                currentMusic = playback;
                applyMusicPlayerVolume(playback);
                player.start();
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

    const prepareSfx = async (
        pattern: Pattern,
        sfxOptions: GameSfxOptions = {}
    ): Promise<PreparedSfx> => {
        const bpm = sfxOptions.bpm ?? DEFAULT_BPM;
        const voices = Math.max(1, Math.floor(sfxOptions.voices ?? DEFAULT_SFX_VOICES));
        const { buffer, duration } = await renderPattern(pattern, bpm);
        const players = Array.from({ length: voices }, () => {
            const player = new Tone.Player(buffer);

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
            applyAllMusicPlayerVolumes();
        },
        setMusicVolume(volume: number) {
            musicVolume = normalizeVolume(volume);
            setVolume(musicGain, musicVolume);
            applyAllMusicPlayerVolumes();
        },
        setSfxVolume(volume: number) {
            sfxVolume = normalizeVolume(volume);
            setVolume(sfxGain, sfxVolume);
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
