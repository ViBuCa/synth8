import * as Tone from "tone";
import type { Pattern, PatternLayer, Event, Waveform } from "@vibuca/synth8-core";
import { createDrums, playDrum } from "../drum";
import { createSynth } from "./synth";
import { getLayers } from "./layers";
import { resolvePlaybackPreset } from "./presets";
import { createEffectNodes } from "./effects";

const DEFAULT_SOUND: Waveform = "sine";
type TransportLike = Pick<ReturnType<typeof Tone.getTransport>, "schedule">;
type PlaybackLayer = ReturnType<typeof getLayers>[number];

export type ScheduledLayer = {
    layer: PlaybackLayer;
    secondsPerBeat: number;
    gainNode: Tone.Gain;
    panner: Tone.Panner;
    synth: Tone.PolySynth<Tone.Synth> | Tone.NoiseSynth | undefined;
    drums: ReturnType<typeof createDrums> | undefined;
    effectNodes: Tone.ToneAudioNode[];
    sound: Waveform;
};

export const eventCount = (pattern: Pattern): number =>
    getLayers(pattern).reduce((count, layer) => count + layer.events.length, 0);

export const createScheduledLayers = (
    layers: PlaybackLayer[],
    secondsPerBeat: number,
    registerActiveLayer: (gainNode: Tone.Gain, panner: Tone.Panner,
        synth: ScheduledLayer["synth"], drums: ScheduledLayer["drums"], effectNodes: Tone.ToneAudioNode[]) => void,
    output?: Tone.ToneAudioNode
): ScheduledLayer[] => layers.map((layer) => {
    const playback = resolvePlaybackPreset(layer.playback);
    const noteEvents = layer.events.filter((event) => event.type === "note");
    const drumEvents = layer.events.filter((event) => event.type === "drum");
    const sound = playback?.sound ?? DEFAULT_SOUND;
    const gainNode = new Tone.Gain(playback?.gain ?? 1);
    const panner = new Tone.Panner(playback?.pan ?? 0);
    const effectNodes = createEffectNodes(playback?.effects, playback?.filter, playback?.pitch);
    let chainEnd: Tone.ToneAudioNode = gainNode;
    for (const effectNode of effectNodes) { chainEnd.connect(effectNode); chainEnd = effectNode; }
    chainEnd.connect(panner);
    if (output) panner.connect(output); else panner.toDestination();
    const synth = noteEvents.length > 0 ? createSynth(sound, playback?.envelope, playback?.pitch).connect(gainNode) : undefined;
    const drums = drumEvents.length > 0
        ? (playback?.bank ? createDrums(drumEvents.map((event) => event.value), playback.bank) : createDrums(drumEvents.map((event) => event.value)))
        : undefined;
    drums?.connect(gainNode);
    registerActiveLayer(gainNode, panner, synth, drums, effectNodes);
    return { layer, secondsPerBeat, gainNode, panner, synth, drums, effectNodes, sound };
});

export const scheduleLayerEvent = (runtime: ScheduledLayer, event: Event, time: number): void => {
    const playback = resolvePlaybackPreset(runtime.layer.playback);
    const eventDuration = event.dur * runtime.secondsPerBeat *
        (event.articulation === "staccato" ? 0.35 : event.articulation === "mute" ? 0.18 : 1);
    if (event.type === "note" && playback?.filter?.envelope) {
        const envelope = playback.filter.envelope;
        const filterNode = runtime.effectNodes.find((node) => node instanceof Tone.Filter) as Tone.Filter | undefined;
        if (filterNode) {
            filterNode.frequency.setValueAtTime(envelope.start, time);
            filterNode.frequency.linearRampToValueAtTime(envelope.peak, time + envelope.attack);
            filterNode.frequency.linearRampToValueAtTime(envelope.sustain, time + envelope.attack + envelope.decay);
            filterNode.frequency.linearRampToValueAtTime(envelope.sustain, time + eventDuration);
            filterNode.frequency.linearRampToValueAtTime(envelope.start, time + eventDuration + envelope.release);
        }
    }
    if (event.type === "drum" && runtime.drums) playDrum(runtime.drums, event.value, time, event.velocity ?? 1);
    if (event.type === "note" && runtime.synth) {
        const velocity = Math.min(1, (event.velocity ?? 0.8) * (event.articulation === "accent" ? 1.15 : 1));
        if (runtime.sound === "noise") runtime.synth.triggerAttackRelease(eventDuration, time, velocity);
        else runtime.synth.triggerAttackRelease(event.value, eventDuration, time, velocity);
    }
};

export const scheduleLayers = (
    layers: PlaybackLayer[], secondsPerBeat: number,
    registerActiveLayer: Parameters<typeof createScheduledLayers>[2],
    transport: TransportLike, output?: Tone.ToneAudioNode
): void => {
    const runtimes = createScheduledLayers(layers, secondsPerBeat, registerActiveLayer, output);
    const events = runtimes.flatMap((runtime) =>
        runtime.layer.events.map((event) => ({ runtime, event }))
    );
    // Tone's event timeline requires insertion times to be strictly ordered.
    // Layers commonly all start at beat zero, so scheduling layer-by-layer is
    // invalid for multi-layer patterns.
    events.sort((left, right) => left.event.time - right.event.time);
    for (let index = 0; index < events.length;) {
        const start = events[index].event.time;
        const group: typeof events = [];
        while (index < events.length && events[index].event.time === start) {
            group.push(events[index]);
            index += 1;
        }
        // One Transport event per timestamp is required: Tone's timeline does
        // not accept equal start times, while chords/layers commonly produce
        // several events that must still be triggered simultaneously.
        transport.schedule((time) => {
            for (const { runtime, event } of group) scheduleLayerEvent(runtime, event, time);
        }, start * secondsPerBeat);
    }
};
