import * as Tone from "tone";
import type { EffectConfig } from "@vibuca/synth8-core";

export const createEffectNodes = (effects?: EffectConfig): Tone.ToneAudioNode[] => {
    if (!effects) {
        return [];
    }

    const nodes: Tone.ToneAudioNode[] = [];

    if (effects.lowpass !== undefined) {
        nodes.push(new Tone.Filter(effects.lowpass, "lowpass"));
    }

    if (effects.highpass !== undefined) {
        nodes.push(new Tone.Filter(effects.highpass, "highpass"));
    }

    if (effects.distortion !== undefined && effects.distortion > 0) {
        nodes.push(new Tone.Distortion(effects.distortion));
    }

    if (effects.chorus !== undefined && effects.chorus > 0) {
        nodes.push(new Tone.Chorus(4, 2.5, effects.chorus).start());
    }

    if (effects.delay !== undefined && effects.delay > 0) {
        nodes.push(new Tone.FeedbackDelay(effects.delay, 0.15));
    }

    if (effects.echo !== undefined && effects.echo > 0) {
        nodes.push(new Tone.FeedbackDelay(0.25, effects.echo));
    }

    if (effects.room !== undefined && effects.room > 0) {
        nodes.push(new Tone.Freeverb(effects.room, 2500));
    }

    if (effects.reverb !== undefined && effects.reverb > 0) {
        nodes.push(new Tone.Reverb({
            decay: 0.2 + effects.reverb * 4,
            preDelay: 0.01,
            wet: Math.min(0.7, effects.reverb),
        }));
    }

    return nodes;
};
