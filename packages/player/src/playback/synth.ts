import * as Tone from 'tone';
import { Waveform } from '@vibuca/synth8-core';

export const createSynth = (sound: Waveform): Tone.PolySynth<Tone.Synth> => {
    return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: sound,
        },
    });
};