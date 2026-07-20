import * as Tone from "tone";
import type { PlaybackBank } from "@vibuca/synth8-core";
import type { DrumInstrument, DrumKit } from "../model/drum";

type DrumSound =
    | "kick"
    | "snare"
    | "clap"
    | "hihat"
    | "openhat"
    | "tom"
    | "midtom"
    | "lowtom"
    | "hitom"
    | "rim"
    | "cowbell"
    | "crash"
    | "ride"
    | "tambourine"
    | "shaker";

const DRUM_SOUNDS: DrumSound[] = [
    "kick",
    "snare",
    "clap",
    "hihat",
    "openhat",
    "tom",
    "midtom",
    "lowtom",
    "hitom",
    "rim",
    "cowbell",
    "crash",
    "ride",
    "tambourine",
    "shaker",
];

const hasSound = (sounds: Set<string>, sound: DrumSound): boolean => sounds.has(sound);

export const createDrums = (
    sounds: Iterable<string> = DRUM_SOUNDS,
    bank: PlaybackBank = "default"
): DrumKit => {
    const requestedSounds = new Set(sounds);
    const connectableInstruments: DrumInstrument[] = [];
    const disposables: { dispose: () => void }[] = [];
    const is808 = bank === "808";
    const is909 = bank === "909";
    const isArcade = bank === "arcade";
    const isChip = bank === "chip";

    const addInstrument = <T extends DrumInstrument>(instrument: T): T => {
        connectableInstruments.push(instrument);
        return instrument;
    };

    const addDisposable = <T extends { dispose: () => void }>(disposable: T): T => {
        disposables.push(disposable);
        return disposable;
    };

    const kick = hasSound(requestedSounds, "kick")
        ? addInstrument(new Tone.MembraneSynth(
            isArcade
                ? {
                    pitchDecay: 0.015,
                    octaves: 5,
                    oscillator: { type: "square" },
                    envelope: {
                        attack: 0.001,
                        decay: 0.16,
                        sustain: 0,
                        release: 0.02,
                    },
                }
                : isChip
                    ? {
                        pitchDecay: 0.01,
                        octaves: 3,
                        oscillator: { type: "square" },
                        envelope: {
                            attack: 0.001,
                            decay: 0.09,
                            sustain: 0,
                            release: 0.01,
                        },
                    }
                    : is909
                        ? {
                            pitchDecay: 0.025,
                            octaves: 4,
                            oscillator: { type: "sine" },
                            envelope: {
                                attack: 0.001,
                                decay: 0.32,
                                sustain: 0,
                                release: 0.08,
                            },
                        }
                        : is808
                            ? {
                                pitchDecay: 0.035,
                                octaves: 6,
                                oscillator: { type: "sine" },
                                envelope: {
                                    attack: 0.001,
                                    decay: 0.55,
                                    sustain: 0,
                                    release: 0.18,
                                },
                            }
                            : undefined
        ))
        : undefined;

    const snare = hasSound(requestedSounds, "snare") ? addInstrument(new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: isArcade || isChip ? 0.08 : is909 ? 0.18 : is808 ? 0.28 : 0.15,
            sustain: 0,
            release: is808 ? 0.04 : undefined,
        }
    })) : undefined;

    const hihat = hasSound(requestedSounds, "hihat") ? new Tone.NoiseSynth({
        noise: {
            type: "white",
        },
        envelope: {
            attack: 0.001,
            decay: isArcade || isChip ? 0.035 : is909 ? 0.06 : is808 ? 0.05 : 0.08,
            sustain: 0,
            release: isArcade ? 0.005 : 0.02,
        },
    }) : undefined;

    const hihatGain = hihat ? addDisposable(new Tone.Gain(6)) : undefined;

    if (hihatGain) {
        hihat?.connect(hihatGain);
    }

    const clap = hasSound(requestedSounds, "clap") ? addInstrument(new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: isArcade || isChip ? 0.07 : is909 ? 0.11 : is808 ? 0.18 : 0.12,
            sustain: 0,
            release: is808 ? 0.03 : undefined,
        },
    })) : undefined;

    const openhat = hasSound(requestedSounds, "openhat") ? addInstrument(new Tone.NoiseSynth({
        noise: {
            type: "white",
        },
        envelope: {
            attack: 0.001,
            decay: isArcade || isChip ? 0.18 : is909 ? 0.32 : is808 ? 0.55 : 0.35,
            sustain: 0,
            release: isArcade ? 0.03 : 0.08,
        },
    })) : undefined;

    const lowtom = hasSound(requestedSounds, "lowtom")
        ? addInstrument(new Tone.MembraneSynth())
        : undefined;
    const midtom = hasSound(requestedSounds, "tom") || hasSound(requestedSounds, "midtom")
        ? addInstrument(new Tone.MembraneSynth())
        : undefined;
    const hitom = hasSound(requestedSounds, "hitom")
        ? addInstrument(new Tone.MembraneSynth())
        : undefined;

    const rim = hasSound(requestedSounds, "rim") ? addInstrument(new Tone.MembraneSynth({
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
    })) : undefined;

    const cowbell = hasSound(requestedSounds, "cowbell") ? addInstrument(new Tone.AmplitudeEnvelope({
        attack: 0.001,
        decay: 0.18,
        sustain: 0,
        release: 0.03,
    })) : undefined;

    const cowbellA = cowbell
        ? addDisposable(new Tone.Oscillator(540, "square"))
        : undefined;
    const cowbellB = cowbell
        ? addDisposable(new Tone.Oscillator(800, "square"))
        : undefined;

    if (cowbell) {
        cowbellA?.connect(cowbell);
        cowbellB?.connect(cowbell);
    }
    cowbellA?.start();
    cowbellB?.start();

    const crash = hasSound(requestedSounds, "crash") ? addInstrument(new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: 0.9,
            sustain: 0,
            release: 0.25,
        },
    })) : undefined;

    const ride = hasSound(requestedSounds, "ride") ? addInstrument(new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: 0.45,
            sustain: 0,
            release: 0.12,
        },
    })) : undefined;

    const tambourine = hasSound(requestedSounds, "tambourine") ? addInstrument(new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: 0.12,
            sustain: 0,
            release: 0.03,
        },
    })) : undefined;

    const shaker = hasSound(requestedSounds, "shaker") ? addInstrument(new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
            attack: 0.001,
            decay: 0.05,
            sustain: 0,
            release: 0.01,
        },
    })) : undefined;

    return {
        kick, snare, hihat, clap, openhat, rim, cowbell,
        crash, ride, tambourine, shaker,
        lowtom, midtom, hitom,
        connect(output: Tone.ToneAudioNode) {
            hihatGain?.connect(output);
            for (const instrument of connectableInstruments) {
                instrument.connect(output);
            }
        },

        dispose() {
            hihat?.dispose();
            for (const instrument of connectableInstruments) {
                instrument.dispose();
            }
            for (const disposable of disposables) {
                disposable.dispose();
            }
        },

    };
}
