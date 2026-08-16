import * as Tone from 'tone';
import type { EnvelopeConfig, PitchExpression, Waveform } from '@vibuca/synth8-core';

export const createSynth = (
    sound: Waveform,
    envelope?: EnvelopeConfig,
    pitch?: PitchExpression
): Tone.PolySynth<Tone.Synth> | Tone.NoiseSynth => {
    if (sound === "noise") {
        return new Tone.NoiseSynth({
            noise: { type: "white" },
            ...(envelope ? { envelope } : {}),
        });
    }

    const oscillatorType = sound.startsWith("pulse") ? "pulse" : sound === "wavetable" ? "square" : sound;
    const pulseWidths: Record<string, number> = { pulse12: -0.75, pulse25: -0.5, pulse50: 0, pulse75: 0.5 };
    const pulseWidth = pulseWidths[sound];

    return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: oscillatorType as never,
            ...(pulseWidth !== undefined ? { width: pulseWidth } : {}),
        },
        ...(envelope ? { envelope } : {}),
        ...(pitch?.portamento !== undefined ? { portamento: pitch.portamento } : {}),
    });
};
