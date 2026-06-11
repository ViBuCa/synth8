import * as Tone from 'tone';
import type { PlayOptions, PreparedPlayback } from '../model';
import type { Pattern, Waveform } from '@vibuca/synth8-core';
import { getLayers } from './layers';
import { createDrums, playDrum } from '../drum';
import { createSynth } from './synth';
import { addActiveNode, addDisposable, disposeActiveNodes } from './lifecycle';
import { clearPlaybackSession, pauseSession, resumeSession, setLiveSession, setRenderedSession } from './session';

const DEFAULT_SOUND: Waveform = "sine";
const DEFAULT_LOOK_AHEAD = 0.25;
const RENDERED_EVENT_LIMIT = 512;
type TransportLike = Pick<ReturnType<typeof Tone.getTransport>, "schedule">;
type PlaybackLayer = ReturnType<typeof getLayers>[number];

const eventCount = (pattern: Pattern): number => {
    const layers = getLayers(pattern);

    return layers.reduce((count, layer) => count + layer.events.length, 0);
};

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

const scheduleLayers = (
    layers: PlaybackLayer[],
    secondsPerBeat: number,
    registerActiveLayer: (
        gainNode: Tone.Gain,
        panner: Tone.Panner,
        synth: Tone.PolySynth<Tone.Synth> | undefined,
        drums: ReturnType<typeof createDrums> | undefined
    ) => void,
    transport: TransportLike
): void => {
    for (const layer of layers) {
        const noteEvents = layer.events.filter((event) => event.type === "note");
        const drumEvents = layer.events.filter((event) => event.type === "drum");
        const sound = layer.playback?.sound ?? DEFAULT_SOUND;
        const gain = layer.playback?.gain ?? 1;

        const gainNode = new Tone.Gain(gain);
        const panner = new Tone.Panner(layer.playback?.pan ?? 0);

        gainNode.connect(panner);
        panner.toDestination();

        const synth = noteEvents.length > 0
            ? createSynth(sound).connect(gainNode)
            : undefined;
        const drums = drumEvents.length > 0
            ? createDrums(drumEvents.map((event) => event.value))
            : undefined;

        drums?.connect(gainNode);

        registerActiveLayer(gainNode, panner, synth, drums);

        for (const event of layer.events) {
            const eventTime = event.time * secondsPerBeat;
            const eventDuration = event.dur * secondsPerBeat;

            transport.schedule((time) => {
                if (event.type === "drum" && drums) {
                    playDrum(drums, event.value, time, event.velocity ?? 1);
                }

                if (event.type === "note" && synth) {
                    synth.triggerAttackRelease(
                        event.value,
                        eventDuration,
                        time,
                        event.velocity ?? 0.8
                    );
                }
            }, eventTime);
        }
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
