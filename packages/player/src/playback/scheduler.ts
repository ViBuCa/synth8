import * as Tone from "tone";
import type { Pattern, Waveform } from "@vibuca/synth8-core";
import { createDrums, playDrum } from "../drum";
import { createSynth } from "./synth";
import { getLayers } from "./layers";
import { resolvePlaybackPreset } from "./presets";

const DEFAULT_SOUND: Waveform = "sine";

type TransportLike = Pick<ReturnType<typeof Tone.getTransport>, "schedule">;
type PlaybackLayer = ReturnType<typeof getLayers>[number];

export const eventCount = (pattern: Pattern): number => {
    const layers = getLayers(pattern);

    return layers.reduce((count, layer) => count + layer.events.length, 0);
};

export const scheduleLayers = (
    layers: PlaybackLayer[],
    secondsPerBeat: number,
    registerActiveLayer: (
        gainNode: Tone.Gain,
        panner: Tone.Panner,
        synth: Tone.PolySynth<Tone.Synth> | undefined,
        drums: ReturnType<typeof createDrums> | undefined
    ) => void,
    transport: TransportLike,
    output?: Tone.ToneAudioNode
): void => {
    for (const layer of layers) {
        const playback = resolvePlaybackPreset(layer.playback);
        const noteEvents = layer.events.filter((event) => event.type === "note");
        const drumEvents = layer.events.filter((event) => event.type === "drum");
        const sound = playback?.sound ?? DEFAULT_SOUND;
        const gain = playback?.gain ?? 1;

        const gainNode = new Tone.Gain(gain);
        const panner = new Tone.Panner(playback?.pan ?? 0);

        gainNode.connect(panner);

        if (output) {
            panner.connect(output);
        } else {
            panner.toDestination();
        }

        const synth = noteEvents.length > 0
            ? createSynth(sound, playback?.envelope).connect(gainNode)
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
