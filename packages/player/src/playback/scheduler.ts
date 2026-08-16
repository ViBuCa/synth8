import * as Tone from "tone";
import type { Pattern, Waveform } from "@vibuca/synth8-core";
import { createDrums, playDrum } from "../drum";
import { createSynth } from "./synth";
import { getLayers } from "./layers";
import { resolvePlaybackPreset } from "./presets";
import { createEffectNodes } from "./effects";

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
        synth: Tone.PolySynth<Tone.Synth> | Tone.NoiseSynth | undefined,
        drums: ReturnType<typeof createDrums> | undefined,
        effectNodes: Tone.ToneAudioNode[]
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
        const effectNodes = createEffectNodes(playback?.effects, playback?.filter, playback?.pitch);

        let chainEnd: Tone.ToneAudioNode = gainNode;

        for (const effectNode of effectNodes) {
            chainEnd.connect(effectNode);
            chainEnd = effectNode;
        }

        chainEnd.connect(panner);

        if (output) {
            panner.connect(output);
        } else {
            panner.toDestination();
        }

        const synth = noteEvents.length > 0
            ? createSynth(sound, playback?.envelope, playback?.pitch).connect(gainNode)
            : undefined;
        const drums = drumEvents.length > 0
            ? playback?.bank
                ? createDrums(drumEvents.map((event) => event.value), playback.bank)
                : createDrums(drumEvents.map((event) => event.value))
            : undefined;

        drums?.connect(gainNode);

        registerActiveLayer(gainNode, panner, synth, drums, effectNodes);

        for (const event of layer.events) {
            const eventTime = event.time * secondsPerBeat;
            const eventDuration = event.dur * secondsPerBeat * (
                event.articulation === "staccato" ? 0.35 :
                event.articulation === "mute" ? 0.18 : 1
            );

            transport.schedule((time) => {
                if (event.type === "note" && playback?.filter?.envelope) {
                    const envelope = playback.filter.envelope;
                    const filterNode = effectNodes.find((node) => node instanceof Tone.Filter) as Tone.Filter | undefined;
                    if (filterNode) {
                        filterNode.frequency.setValueAtTime(envelope.start, time);
                        filterNode.frequency.linearRampToValueAtTime(envelope.peak, time + envelope.attack);
                        filterNode.frequency.linearRampToValueAtTime(envelope.sustain, time + envelope.attack + envelope.decay);
                        filterNode.frequency.linearRampToValueAtTime(envelope.sustain, time + eventDuration);
                        filterNode.frequency.linearRampToValueAtTime(envelope.start, time + eventDuration + envelope.release);
                    }
                }

                if (event.type === "drum" && drums) {
                    playDrum(drums, event.value, time, event.velocity ?? 1);
                }

                if (event.type === "note" && synth) {
                    const velocity = Math.min(1, (event.velocity ?? 0.8) * (event.articulation === "accent" ? 1.15 : 1));
                    if (sound === "noise") {
                        synth.triggerAttackRelease(eventDuration, time, velocity);
                    } else {
                        synth.triggerAttackRelease(event.value, eventDuration, time, velocity);
                    }
                }
            }, eventTime);
        }
    }
};
