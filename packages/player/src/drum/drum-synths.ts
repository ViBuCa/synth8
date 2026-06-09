import * as Tone from "tone";

export const createDrums = () => {

    const kick = new Tone.MembraneSynth();

    const snare = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: 0.15,
            sustain: 0
        }
    });

    const hihat = new Tone.NoiseSynth({
        noise: {
            type: "white",
        },
        envelope: {
            attack: 0.001,
            decay: 0.08,
            sustain: 0,
            release: 0.02,
        },
    });

    const hihatGain = new Tone.Gain(6);

    hihat.connect(hihatGain);

    const clap = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: 0.12,
            sustain: 0,
        },
    });

    const openhat = new Tone.NoiseSynth({
        noise: {
            type: "white",
        },
        envelope: {
            attack: 0.001,
            decay: 0.35,
            sustain: 0,
            release: 0.08,
        },
    });

    const tom = new Tone.MembraneSynth();

    const rim = new Tone.MembraneSynth({
        pitchDecay: 0.005,
        octaves: 2,
        oscillator: {
            type: "square",
        },
        envelope: {
            attack: 0.001,
            decay: 0.05,
            sustain: 0,
            release: 0.01,
        },
    });

    const cowbell = new Tone.AmplitudeEnvelope({
        attack: 0.001,
        decay: 0.18,
        sustain: 0,
        release: 0.03,
    });

    const cowbellA = new Tone.Oscillator(540, "square").connect(cowbell);
    const cowbellB = new Tone.Oscillator(800, "square").connect(cowbell);

    cowbellA.start();
    cowbellB.start();

    const connectableInstruments = [
        kick, snare, clap, openhat, tom, rim, cowbell
    ];

    return {
        kick, snare, hihat, clap, openhat, tom, rim, cowbell,
        connect(output: Tone.ToneAudioNode) {
            hihatGain.connect(output);
            for (const instrument of connectableInstruments) {
                instrument.connect(output);
            }
        },

        dispose() {
            hihat.dispose();
            hihatGain.dispose();
            for (const instrument of connectableInstruments) {
                instrument.dispose();
            }
        },

    };
}