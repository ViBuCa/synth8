import * as Tone from 'tone';
import type { PlayOptions, PreparedPlayback } from '../model';
import type { Pattern } from '@vibuca/synth8-core';
import { getLayers } from './layers';
import { addActiveNode, addDisposable, disposeActiveNodes } from './lifecycle';
import { clearPlaybackSession, pauseSession, resumeSession, setLiveSession, setRenderedSession } from './session';
import { eventCount, scheduleLayers } from './scheduler';

const DEFAULT_LOOK_AHEAD = 0.25;
const RENDERED_EVENT_LIMIT = 512;

const resolvePlaybackMode = (pattern: Pattern, options: PlayOptions): PreparedPlayback["playbackMode"] => {
    if (options.playbackMode === "rendered" || options.playbackMode === "live") {
        return options.playbackMode;
    }

    return eventCount(pattern) > RENDERED_EVENT_LIMIT ? "live" : "rendered";
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
        (gainNode, panner, synth, drums) => {
            if (synth) {
                addActiveNode(gainNode, panner, synth);
            } else {
                addActiveNode(gainNode, panner);
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
    const transport = Tone.getTransport();
    const secondsPerBeat = 60 / bpm;
    const loopDuration = pattern.length * secondsPerBeat;
    const layers = getLayers(pattern);

    transport.stop();
    transport.cancel();
    transport.loop = false;

    const buffer = await Tone.Offline(({ transport: offlineTransport }) => {
        offlineTransport.bpm.value = bpm;
        scheduleLayers(layers, secondsPerBeat, () => undefined, offlineTransport);
        offlineTransport.start(0);
    }, loopDuration);

    const player = new Tone.Player(buffer);

    player.loop = true;
    player.loopStart = 0;
    player.loopEnd = loopDuration;
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

export const prepare = async (
    pattern: Pattern,
    options: PlayOptions = {}
): Promise<PreparedPlayback> => {
    const bpm = options.bpm ?? 120;

    await Tone.start();
    configureScheduling(options);
    clearPlaybackSession();
    disposeActiveNodes();

    const playbackMode = resolvePlaybackMode(pattern, options);

    if (playbackMode === "live") {
        return prepareLive(pattern, bpm);
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
