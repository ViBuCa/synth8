import * as Tone from 'tone';
import type { PlayOptions, PreparedPlayback } from '../model';
import { Synth8Scheduler } from '@vibuca/synth8-core';
import type { Pattern } from '@vibuca/synth8-core';
import { getLayers } from './layers';
import { addActiveNode, addDisposable, disposeActiveNodes } from './lifecycle';
import { clearPlaybackSession, pauseSession, resumeSession, setLiveSession, setRenderedSession, setStreamedSession, stopSession } from './session';
import { createScheduledLayers, eventCount, scheduleLayerEvents, scheduleLayers } from './scheduler';
import { normalizeAudioBuffer, renderChunkToAudioBuffer, renderToAudioBuffer } from './render';
import { recordTonePlaybackMetric } from './metrics';

const DEFAULT_LOOK_AHEAD = 0.25;
const RENDERED_EVENT_LIMIT = 512;
// Keep the first rendered chunk short so streamed/auto playback can start
// quickly. Later chunks are rendered ahead while the current chunk plays.
const DEFAULT_STREAM_CHUNK_DURATION = 2;
const DEFAULT_STREAM_TAIL_DURATION = 0.25;

const safeLoopEnd = (buffer: AudioBuffer, requestedLoopEnd: number): number => {
    const bufferDuration = buffer.duration;

    if (!Number.isFinite(bufferDuration) || bufferDuration <= 0) {
        return requestedLoopEnd;
    }

    return Math.min(requestedLoopEnd, bufferDuration);
};

const resolvePlaybackMode = (pattern: Pattern, options: PlayOptions, bpm: number): PreparedPlayback["playbackMode"] => {
    if (
        options.playbackMode === "rendered" ||
        options.playbackMode === "live" ||
        options.playbackMode === "streamed"
    ) {
        return options.playbackMode;
    }

    const renderedEventLimit = options.autoRenderedEventLimit ?? RENDERED_EVENT_LIMIT;
    const trackDuration = pattern.length * (60 / bpm);

    // Avoid a long upfront offline render for tracks that are small in event
    // count but long in wall-clock duration. They use the same chunked
    // look-ahead path as dense tracks.
    if (trackDuration > 8) return "streamed";

    // Dense patterns can overwhelm the live scheduler in a browser. Stream the
    // song in short rendered chunks instead of handing hundreds of callbacks
    // to Tone.Transport at once. This keeps startup bounded while avoiding
    // the long upfront render of a complete song.
    return eventCount(pattern) > renderedEventLimit ? "streamed" : "rendered";
};

type StreamChunk = {
    buffer: AudioBuffer;
    startOffset: number;
    playDuration: number;
};

const configureScheduling = (options: PlayOptions): void => {
    const context = Tone.getContext() as ReturnType<typeof Tone.getContext> & {
        updateInterval?: number;
    };
    const lookAhead = options.lookAhead ?? DEFAULT_LOOK_AHEAD;

    if (context.lookAhead < lookAhead) {
        context.lookAhead = lookAhead;
    }

    if (options.updateInterval !== undefined && "updateInterval" in context) {
        context.updateInterval = options.updateInterval;
    }
};

const stopPreparedPlayback = (): void => {
    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();
    transport.loop = false;

    disposeActiveNodes();
    clearPlaybackSession();
};

const prepareLive = (
    pattern: Pattern,
    bpm: number,
    options: PlayOptions
): PreparedPlayback => {
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    const secondsPerBeat = 60 / bpm;
    const loopDuration = pattern.length * secondsPerBeat;
    const lookAhead = Math.max(0.05, options.lookAhead ?? DEFAULT_LOOK_AHEAD);

    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = loopDuration;

    const registerActiveLayer = (gainNode: Tone.Gain, panner: Tone.Panner, synth: ReturnType<typeof createScheduledLayers>[number]["synth"], drums: ReturnType<typeof createScheduledLayers>[number]["drums"], effectNodes: Tone.ToneAudioNode[]) => {
        addActiveNode(gainNode, panner, ...(synth ? [synth] : []), ...effectNodes);
        if (drums) addDisposable(drums);
    };
    const scheduleRepeat = (transport as unknown as { scheduleRepeat?: Function }).scheduleRepeat;
    if (!scheduleRepeat) {
        scheduleLayers(getLayers(pattern), secondsPerBeat, registerActiveLayer, transport);
        return {
            playbackMode: "live",
            start() { stopSession(); transport.stop(); transport.cancel(); setLiveSession(); transport.start(); },
            pause() { pauseSession(); }, resume() { resumeSession(); },
            stop: stopPreparedPlayback, dispose: stopPreparedPlayback,
        };
    }
    const runtimes = createScheduledLayers(getLayers(pattern), secondsPerBeat, registerActiveLayer);
    const scheduled = new Set<string>();
    const interval = Math.max(0.05, lookAhead / 2);
    let cycle = 0;
    let cycleTime = 0;
    const scheduleWindow = (_time: number): void => {
        recordTonePlaybackMetric("scheduleCallbackCount");
        const candidates: Array<{ runtime: ReturnType<typeof createScheduledLayers>[number]; event: (typeof runtimes)[number]["layer"]["events"][number]; eventIndex: number; layerIndex: number; eventTime: number }> = [];
        for (let layerIndex = 0; layerIndex < runtimes.length; layerIndex++) {
            const runtime = runtimes[layerIndex];
            runtime.layer.events.forEach((event, eventIndex) => {
                const eventTime = event.time * secondsPerBeat;
                if (eventTime >= cycleTime && eventTime < cycleTime + lookAhead) {
                    candidates.push({ runtime, event, eventIndex, layerIndex, eventTime });
                }
            });
        }
        candidates.sort((left, right) => left.eventTime - right.eventTime);
        for (let index = 0; index < candidates.length;) {
            const eventTime = candidates[index].eventTime;
            const group = [] as typeof candidates;
            while (index < candidates.length && candidates[index].eventTime === eventTime) {
                const candidate = candidates[index++];
                const key = `${cycle}:${candidate.layerIndex}:${candidate.eventIndex}`;
                if (!scheduled.has(key)) {
                    scheduled.add(key);
                    group.push(candidate);
                }
            }
            if (group.length > 0) {
                transport.schedule((eventTransportTime) => {
                    scheduleLayerEvents(group, eventTransportTime);
                }, cycle * loopDuration + eventTime);
            }
        }
        cycleTime += interval;
        if (cycleTime >= loopDuration) {
            cycleTime -= loopDuration;
            cycle += 1;
        }
    };
    const rollingId = (transport as unknown as { scheduleRepeat: (callback: (time: number) => void, interval: number, start?: number) => number })
        .scheduleRepeat(scheduleWindow, interval, 0);
    const stopLive = (): void => {
        (transport as unknown as { clear: (id: number) => void }).clear(rollingId);
        stopPreparedPlayback();
    };

    return {
        playbackMode: "live",
        start() { stopSession(); transport.stop(); transport.cancel(); setLiveSession(); transport.start(); },
        pause() { pauseSession(); },
        resume() { resumeSession(); },
        stop: stopLive,
        dispose: stopLive,
    };
};

const prepareRendered = async (
    pattern: Pattern,
    bpm: number
): Promise<PreparedPlayback> => {
    const secondsPerBeat = 60 / bpm;
    const loopDuration = pattern.length * secondsPerBeat;
    const transport = Tone.getTransport();
    const buffer = await renderToAudioBuffer(pattern, { bpm });

    transport.loop = false;

    const player = new Tone.Player(normalizeAudioBuffer(buffer));

    player.loop = true;
    player.loopStart = 0;
    player.loopEnd = safeLoopEnd(buffer, loopDuration);
    player.toDestination();

    return {
        playbackMode: "rendered",
        start() {
            stopSession();
            disposeActiveNodes();
            addActiveNode(player);
            player.start();
            setRenderedSession(player, loopDuration);
        },
        pause() {
            pauseSession();
        },
        resume() {
            resumeSession();
        },
        stop: stopPreparedPlayback,
        dispose: stopPreparedPlayback,
    };
};

const renderStreamChunk = async (
    pattern: Pattern,
    bpm: number,
    startOffset: number,
    chunkDuration: number,
    tailDuration: number,
    loopDuration: number
): Promise<StreamChunk> => {
    const playDuration = Math.min(chunkDuration, loopDuration - startOffset);
    const buffer = await renderChunkToAudioBuffer(pattern, {
        bpm,
        start: startOffset,
        duration: playDuration,
        tail: tailDuration,
        cache: false,
    });

    return {
        buffer,
        startOffset,
        playDuration,
    };
};

const prepareStreamed = async (
    pattern: Pattern,
    bpm: number,
    options: PlayOptions
): Promise<PreparedPlayback> => {
    const chunkDuration = Math.max(0.5, options.streamChunkDuration ?? DEFAULT_STREAM_CHUNK_DURATION);
    const tailDuration = Math.max(0, options.streamTailDuration ?? DEFAULT_STREAM_TAIL_DURATION);
    // One chunk is rendered ahead by default. This is the look-ahead buffer;
    // callers can set streamPrefetchChunks to zero when memory is constrained.
    const prefetchChunks = Math.max(0, Math.floor(options.streamPrefetchChunks ?? 1));
    const loopDuration = pattern.length * (60 / bpm);
    const activePlayers: Tone.Player[] = [];
    const renderTimers: ReturnType<typeof setTimeout>[] = [];
    let firstChunk = await renderStreamChunk(pattern, bpm, 0, chunkDuration, tailDuration, loopDuration);
    let running = false;
    let paused = false;
    let streamGeneration = 0;
    let startedAt = 0;
    let pausedOffset = 0;
    const prefetched = new Map<number, Promise<StreamChunk>>();

    const disposePlayers = (): void => {
        for (const timer of renderTimers.splice(0)) {
            clearTimeout(timer);
        }

        for (const player of activePlayers.splice(0)) {
            player.stop();
            player.dispose();
        }
        prefetched.clear();
    };

    const nextOffset = (offset: number, duration: number): number => {
        const next = offset + duration;

        return next >= loopDuration ? 0 : next;
    };

    const getChunk = (offset: number): Promise<StreamChunk> => {
        const existing = prefetched.get(offset);
        if (existing) return existing;
        const pending = renderStreamChunk(pattern, bpm, offset, chunkDuration, tailDuration, loopDuration);
        prefetched.set(offset, pending);
        void pending.catch(() => prefetched.delete(offset));
        return pending;
    };

    const prefetch = (offset: number, playDuration: number): void => {
        let next = offset;
        let length = playDuration;
        for (let index = 0; index < prefetchChunks; index++) {
            next = nextOffset(next, length);
            if (next === offset || prefetched.has(next)) break;
            void getChunk(next);
            length = Math.min(chunkDuration, loopDuration - next);
        }
    };

    const scheduleChunk = (
        chunk: StreamChunk,
        startTime: number,
        generation: number
    ): void => {
        if (!running || generation !== streamGeneration) {
            return;
        }

        const player = new Tone.Player(normalizeAudioBuffer(chunk.buffer));

        activePlayers.push(player);
        player.toDestination();

        if (chunk.playDuration >= loopDuration) {
            player.loop = true;
            player.loopStart = 0;
            player.loopEnd = safeLoopEnd(chunk.buffer, loopDuration);
        }

        player.start(startTime);
        prefetch(chunk.startOffset, chunk.playDuration);

        if (chunk.playDuration >= loopDuration) {
            return;
        }

        const nextStartTime = startTime + chunk.playDuration;
        const delay = Math.max(0, (nextStartTime - Tone.now() - chunkDuration) * 1000);
        const timer = setTimeout(() => {
            void renderAndScheduleNext(
                nextOffset(chunk.startOffset, chunk.playDuration),
                nextStartTime,
                generation
            );
        }, delay);

        renderTimers.push(timer);
    };

    const renderAndScheduleNext = async (
        offset: number,
        startTime: number,
        generation: number
    ): Promise<void> => {
        const chunk = await getChunk(offset);
        prefetched.delete(offset);

        scheduleChunk(chunk, Math.max(startTime, Tone.now() + 0.05), generation);
    };

    const offsetNow = (): number => {
        const elapsed = Tone.immediate() - startedAt;

        return ((elapsed % loopDuration) + loopDuration) % loopDuration;
    };

    const startFrom = (offset: number): void => {
        running = true;
        paused = false;
        streamGeneration += 1;
        startedAt = Tone.immediate() - offset;

        const generation = streamGeneration;

        if (offset === firstChunk.startOffset) {
            scheduleChunk(firstChunk, Tone.now(), generation);
            return;
        }

        void renderStreamChunk(pattern, bpm, offset, chunkDuration, tailDuration, loopDuration)
            .then((chunk) => {
                scheduleChunk(chunk, Tone.now(), generation);
            });
    };

    const playback: PreparedPlayback = {
        playbackMode: "streamed",
        start() {
            stopSession();
            disposePlayers();
            startFrom(0);
            setStreamedSession(playback);
        },
        pause() {
            if (!running || paused) {
                return;
            }

            pausedOffset = offsetNow();
            running = false;
            paused = true;
            streamGeneration += 1;
            disposePlayers();
        },
        resume() {
            if (!paused) {
                return;
            }

            startFrom(pausedOffset);
        },
        stop() {
            running = false;
            paused = false;
            pausedOffset = 0;
            streamGeneration += 1;
            disposePlayers();
            clearPlaybackSession();
        },
        dispose() {
            playback.stop();
        },
    };

    return playback;
};

const prepareBackend = (
    pattern: Pattern,
    options: PlayOptions,
    bpm: number
): PreparedPlayback => {
    if (!options.backend || !options.clock) {
        throw new Error("A backend and audio clock are required together.");
    }
    const scheduler = new Synth8Scheduler(pattern, options.backend, options.clock, {
        bpm,
        lookAhead: options.lookAhead,
        updateInterval: options.updateInterval,
    });
    return {
        playbackMode: "live",
        start: () => scheduler.start(),
        pause: () => scheduler.pause(),
        resume: () => scheduler.resume(),
        stop: () => scheduler.stop(),
        dispose: () => scheduler.stop(),
    };
};

export const prepare = async (
    pattern: Pattern,
    options: PlayOptions = {}
): Promise<PreparedPlayback> => {
    const bpm = options.bpm ?? 120;

    if (options.backend || options.clock) {
        return prepareBackend(pattern, options, bpm);
    }

    // Mobile WebViews may reject resume() until a gesture. Preparation should
    // still be usable from a loading scene; start() will be retried by Tone
    // when the gesture arrives.
    try {
        await Tone.start();
    } catch {
        // Intentionally ignored for Android/WebView compatibility.
    }
    configureScheduling(options);
    // Do not tear down the active session while preparing. This is important
    // for menus that prepare the next track asynchronously. `start()` remains
    // the commit point for replacement.

    const playbackMode = resolvePlaybackMode(pattern, options, bpm);

    if (playbackMode === "live") {
        return prepareLive(pattern, bpm, options);
    }

    if (playbackMode === "streamed") {
        return prepareStreamed(pattern, bpm, options);
    }

    return prepareRendered(pattern, bpm);
};

export const play = async (
    pattern: Pattern,
    options: PlayOptions = {}
): Promise<void> => {
    const playback = await prepare(pattern, options);

    await options.onReady?.(playback);
    playback.start();
};
