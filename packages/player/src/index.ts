import * as Tone from "tone";
import { createDrums } from "./drum/drum-synths";
import type { Pattern, PatternLayer, Waveform } from "@vibuca/synth8-core";

export type PlayOptions = {
    bpm?: number;
};

const DEFAULT_SOUND: Waveform = "sine";

let activeNodes: Tone.ToneAudioNode[] = [];
let activeDisposables: { dispose: () => void}[] = []

const createSynth = (sound: Waveform): Tone.PolySynth<Tone.Synth> => {
    return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: sound,
        },
    });
};

const disposeActiveNodes = (): void => {
    for (const node of activeNodes) {
        node.dispose();
    }

    for (const disposable of activeDisposables) {
        disposable.dispose();
    }

    activeNodes = [];
};

type DrumKit = ReturnType<typeof createDrums>;

const playDrum = (drums: DrumKit, value: string, time: number, velocity = 1) => {
    switch (value) {
        case "kick":
            drums.kick.triggerAttackRelease("C1", "8n", time, velocity);
            break;

        case "snare":
            drums.snare.triggerAttackRelease("16n", time, velocity);
            break;

        case "clap":
            drums.clap.triggerAttackRelease("16n", time, velocity);
            break;

        case "hihat":
            drums.hihat.triggerAttackRelease("16n", time, velocity);
            break;

        case "openhat":
            drums.openhat.triggerAttackRelease("8n", time, velocity);
            break;

        case "tom":
            drums.tom.triggerAttackRelease("G1", "8n", time, velocity);
            break;

        case "rim":
            drums.rim.triggerAttackRelease("C5", "32n", time, velocity);
            break;

        case "cowbell":
            drums.cowbell.triggerAttackRelease("16n", time, velocity);
            break;

        default:
            console.warn(`Unknown drum sound: ${value}`);
    }
};

const getLayers = (pattern: Pattern): PatternLayer[] => {
    if (pattern.layers?.length > 0) {
        return pattern.layers;
    }

    return [{ events: pattern.events }];
};

export const play = async (
    pattern: Pattern,
    options: PlayOptions = {}
): Promise<void> => {
    const bpm = options.bpm ?? 120;

    await Tone.start();

    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();

    transport.bpm.value = bpm;

    const secondsPerBeat = 60 / bpm;
    const loopDuration = pattern.length * secondsPerBeat;

    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = loopDuration;

    const layers = getLayers(pattern);

    for (const layer of layers) {
        const sound = layer.playback?.sound ?? DEFAULT_SOUND;
        const gain = layer.playback?.gain ?? 1;

        const gainNode = new Tone.Gain(gain).toDestination();
        const synth = createSynth(sound).connect(gainNode);
        const drums = createDrums();
        drums.connect(gainNode);

        activeNodes.push(gainNode, synth);
        activeDisposables.push(drums);

        for (const event of layer.events) {
            const eventTime = event.time * secondsPerBeat;
            const eventDuration = event.dur * secondsPerBeat;

            transport.schedule((time) => {
                if (event.type === "drum") {
                    playDrum(drums, event.value, time, event.velocity ?? 1);
                    console.log("drum", event.value, event.velocity, layer.playback?.gain);
                }

                if (event.type === "note") {
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

    transport.start();
};

export const stop = (): void => {
    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();
    transport.loop = false;

    disposeActiveNodes();
};