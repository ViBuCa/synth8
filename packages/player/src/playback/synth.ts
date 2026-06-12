import * as Tone from 'tone';
import type { EnvelopeConfig, Waveform } from '@vibuca/synth8-core';

export const createSynth = (
    sound: Waveform,
    envelope?: EnvelopeConfig
): Tone.PolySynth<Tone.Synth> => {
    return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: sound,
        },
        ...(envelope ? { envelope } : {}),
    });
};
