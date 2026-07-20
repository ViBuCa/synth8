import * as Tone from 'tone';
import type { PlayOptions, PreparedPlayback } from '../model';
import type { Pattern } from '@vibuca/synth8-core';
import { getLayers } from './layers';
import { addActiveNode, addDisposable, disposeActiveNodes } from './lifecycle';
import { clearPlaybackSession, pauseSession, resumeSession, setLiveSession, setRenderedSession, setStreamedSession, stopSession } from './session';
import { eventCount, scheduleLayers } from './scheduler';
import { renderChunkToAudioBuffer, renderToAudioBuffer } from './render';

const DEFAULT_LOOK_AHEAD = 0.25;
const RENDERED_EVENT_LIMIT = 512;
const DEFAULT_STREAM_CHUNK_DURATION = 5;
const DEFAULT_STREAM_TAIL_DURATION = 0.25;

const safeLoopEnd = (buffer: AudioBuffer, requestedLoopEnd: number): number => {
    const bufferDuration = buffer.duration;

    if (!Number.isFinite(bufferDuration) || bufferDuration <= 0) {
        return requestedLoopEnd;
    }

    return Math.min(requestedLoopEnd, bufferDuration);
};

const resolvePlaybackMode = (pattern: Pattern, options: PlayOptions): PreparedPlayback["playbackMode"] => {
    if (
        options.playbackMode === "rendered" ||
        options.playbackMode === "live" ||
        options.playbackMode === "streamed"
    ) {
        return options.playbackMode;
    }

    const renderedEventLimit = options.autoRenderedEventLimit ?? RENDERED_EVENT_LIMIT;

    return eventCount(pattern) > renderedEventLimit ? "live" : "rendered";
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
    bpm: number
): PreparedPlayback => {
    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();

    transport.bpm.value = bpm;

    const secondsPerBeat = 60 / bpm;
    const loopDuration = pattern.length * secondsPerBeat;

    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = loopDuration;

    scheduleLayers(
        getLayers(pattern),
        secondsPerBeat,
        (gainNode, panner, synth, drums, effectNodes) => {
            if (synth) {
                addActiveNode(gainNode, panner, synth, ...effectNodes);
            } else {
                addActiveNode(gainNode, panner, ...effectNodes);
            }

            if (drums) {
                addDisposable(drums);
            }
        },
        transport
    );

    return {
        playbackMode: "live",
        start() {
            setLiveSession();
            transport.start();
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

const prepareRendered = async (
    pattern: Pattern,
    bpm: number
): Promise<PreparedPlayback> => {
    const secondsPerBeat = 60 / bpm;
    const loopDuration = pattern.length * secondsPerBeat;
    const transport = Tone.getTransport();
    const buffer = await renderToAudioBuffer(pattern, { bpm });

    transport.stop();
    transport.cancel();
    transport.loop = false;

    const player = new Tone.Player(buffer);

    player.loop = true;
    player.loopStart = 0;
    player.loopEnd = safeLoopEnd(buffer, loopDuration);
    player.toDestination();

    addActiveNode(player);

    return {
        playbackMode: "rendered",
        start() {
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
    const loopDuration = pattern.length * (60 / bpm);
    const activePlayers: Tone.Player[] = [];
    const renderTimers: ReturnType<typeof setTimeout>[] = [];
    let firstChunk = await renderStreamChunk(pattern, bpm, 0, chunkDuration, tailDuration, loopDuration);
    let running = false;
    let paused = false;
    let streamGeneration = 0;
    let startedAt = 0;
    let pausedOffset = 0;

    const disposePlayers = (): void => {
        for (const timer of renderTimers.splice(0)) {
            clearTimeout(timer);
        }

        for (const player of activePlayers.splice(0)) {
            player.stop();
            player.dispose();
        }
    };

    const nextOffset = (offset: number, duration: number): number => {
        const next = offset + duration;

        return next >= loopDuration ? 0 : next;
    };

    const scheduleChunk = (
        chunk: StreamChunk,
        startTime: number,
        generation: number
    ): void => {
        if (!running || generation !== streamGeneration) {
            return;
        }

        const player = new Tone.Player(chunk.buffer);

        activePlayers.push(player);
        player.toDestination();

        if (chunk.playDuration >= loopDuration) {
            player.loop = true;
            player.loopStart = 0;
            player.loopEnd = safeLoopEnd(chunk.buffer, loopDuration);
        }

        player.start(startTime);

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
        const chunk = await renderStreamChunk(pattern, bpm, offset, chunkDuration, tailDuration, loopDuration);

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

export const prepare = async (
    pattern: Pattern,
    options: PlayOptions = {}
): Promise<PreparedPlayback> => {
    const bpm = options.bpm ?? 120;

    await Tone.start();
    configureScheduling(options);
    stopSession();
    clearPlaybackSession();
    disposeActiveNodes();

    const playbackMode = resolvePlaybackMode(pattern, options);

    if (playbackMode === "live") {
        return prepareLive(pattern, bpm);
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
