import * as Tone from "tone";
import {
    kick,
    snare,
    hihat,
    clap,
    openhat,
    tom,
    cowbell,
    rim,
} from "./drum/drum-synths";
import type { Pattern, PatternLayer, Waveform } from "@vibuca/synth8-core";

export type PlayOptions = {
    bpm?: number;
};

const DEFAULT_SOUND: Waveform = "sine";

const createSynth = (sound: Waveform): Tone.PolySynth<Tone.Synth> => {
    return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: sound,
        },
    });
};

const playDrum = (value: string, time: number) => {
    switch (value) {
        case "kick":
            kick.triggerAttackRelease("C1", "8n", time);
            break;

        case "snare":
            snare.triggerAttackRelease("16n", time);
            break;

        case "clap":
            clap.triggerAttackRelease("16n", time);
            break;

        case "hihat":
            hihat.triggerAttackRelease("32n", time);
            break;

        case "openhat":
            openhat.triggerAttackRelease("8n", time);
            break;

        case "tom":
            tom.triggerAttackRelease("G1", "8n", time);
            break;

        case "rim":
            rim.triggerAttackRelease("32n", time);
            break;

        case "cowbell":
            cowbell.triggerAttackRelease("16n", time);
            break;

        default:
            console.warn(`Unknown drum sound: ${value}`);
    }
};

const getLayers = (pattern: Pattern): PatternLayer[] => {
    if (pattern.layers.length > 0) {
        return pattern.layers;
    }

    return [
        {
            events: pattern.events,
        },
    ];
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

    const layers = getLayers(pattern);

    for (const layer of layers) {
        const sound = layer.playback?.sound ?? DEFAULT_SOUND;
        const gainNode = new Tone.Gain(
            layer.playback?.gain ?? 1
        ).toDestination();
        console.log(layer.playback?.gain ?? 1)
        const synth = createSynth(sound).connect(gainNode);

        for (const event of layer.events) {
            const eventOffset = event.time * secondsPerBeat;
            const eventDuration = event.dur * secondsPerBeat;

            transport.scheduleRepeat(
                (time) => {
                    if (event.type === "drum") {
                        playDrum(event.value, time);
                    }

                    if (event.type === "note") {
                        synth.triggerAttackRelease(
                            event.value,
                            eventDuration,
                            time,
                            event.velocity ?? 0.8
                        );
                    }
                },
                loopDuration,
                eventOffset
            );
        }
    }

    transport.start();
};

export const stop = (): void => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
};