import type { PlaybackConfig, PlaybackPreset } from "@vibuca/synth8-core";

const PRESET_PLAYBACK: Record<PlaybackPreset, PlaybackConfig> = {
    "chip-lead": {
        sound: "square",
        envelope: {
            attack: 0.005,
            decay: 0.08,
            sustain: 0.65,
            release: 0.08,
        },
    },
    "chip-bass": {
        sound: "triangle",
        gain: 0.9,
        envelope: {
            attack: 0.001,
            decay: 0.05,
            sustain: 0.75,
            release: 0.04,
        },
    },
    "soft-pad": {
        sound: "triangle",
        gain: 0.7,
        envelope: {
            attack: 0.35,
            decay: 0.25,
            sustain: 0.75,
            release: 0.9,
        },
    },
    "metal-rhythm": {
        sound: "sawtooth",
        gain: 0.58,
        envelope: {
            attack: 0.001,
            decay: 0.08,
            sustain: 0.12,
            release: 0.12,
        },
        effects: { distortion: 0.34, lowpass: 4200 },
    },
    "arcade-pluck": {
        sound: "square",
        gain: 0.62,
        envelope: {
            attack: 0.001,
            decay: 0.09,
            sustain: 0.05,
            release: 0.08,
        },
        effects: { echo: 0.1 },
    },
    "deep-bass": {
        sound: "sine",
        gain: 0.95,
        envelope: {
            attack: 0.002,
            decay: 0.12,
            sustain: 0.8,
            release: 0.12,
        },
        effects: {
            lowpass: 900,
        },
    },
    "warm-pad": {
        sound: "sawtooth",
        gain: 0.55,
        envelope: {
            attack: 0.55,
            decay: 0.35,
            sustain: 0.65,
            release: 1.2,
        },
        effects: {
            lowpass: 1800,
            chorus: 0.25,
        },
    },
    "glass-lead": {
        sound: "sine",
        gain: 0.65,
        envelope: {
            attack: 0.004,
            decay: 0.18,
            sustain: 0.25,
            release: 0.35,
        },
        effects: {
            echo: 0.18,
            reverb: 0.18,
        },
    },
    // Guitar-like roles use the available single-oscillator synth plus effects;
    // they are intentionally approximations, not sampled guitar models.
    "metal-lead": {
        sound: "sawtooth",
        gain: 0.55,
        envelope: { attack: 0.003, decay: 0.16, sustain: 0.82, release: 0.28 },
        effects: { distortion: 0.38, chorus: 0.16, echo: 0.16, highpass: 180 },
    },
    "anthem-lead": {
        sound: "sawtooth",
        gain: 0.52,
        envelope: { attack: 0.012, decay: 0.24, sustain: 0.84, release: 0.65 },
        effects: { distortion: 0.16, chorus: 0.32, echo: 0.28 },
    },
    "palm-muted": {
        sound: "square",
        gain: 0.62,
        envelope: { attack: 0.001, decay: 0.07, sustain: 0.04, release: 0.035 },
        effects: { distortion: 0.3 },
    },
    "arena-chords": {
        sound: "sawtooth",
        gain: 0.42,
        envelope: { attack: 0.08, decay: 0.28, sustain: 0.78, release: 0.9 },
        effects: { distortion: 0.08, chorus: 0.52, echo: 0.18 },
    },
    "picked-bass": {
        sound: "square",
        gain: 0.7,
        envelope: { attack: 0.001, decay: 0.11, sustain: 0.52, release: 0.08 },
        effects: { distortion: 0.12, lowpass: 2600 },
    },
    "metal-bass": {
        sound: "sawtooth",
        gain: 0.58,
        envelope: { attack: 0.001, decay: 0.14, sustain: 0.62, release: 0.1 },
        effects: { distortion: 0.28, lowpass: 3200 },
    },
    "synth-brass": {
        sound: "sawtooth",
        gain: 0.5,
        envelope: { attack: 0.025, decay: 0.16, sustain: 0.58, release: 0.16 },
        effects: { chorus: 0.2, distortion: 0.04 },
    },
    "dark-pad": {
        sound: "triangle",
        gain: 0.28,
        envelope: { attack: 0.8, decay: 0.45, sustain: 0.55, release: 1.8 },
        effects: { chorus: 0.4, lowpass: 1400, reverb: 0.22 },
    },
    "orchestra-hit": {
        sound: "sawtooth",
        gain: 0.42,
        envelope: { attack: 0.002, decay: 0.3, sustain: 0.2, release: 0.42 },
        effects: { chorus: 0.3, echo: 0.2, reverb: 0.16, distortion: 0.1 },
    },
    "warm-keys": {
        sound: "triangle",
        gain: 0.42,
        envelope: { attack: 0.08, decay: 0.3, sustain: 0.62, release: 0.9 },
        effects: { chorus: 0.16, lowpass: 2400 },
    },
};

export const resolvePlaybackPreset = (
    playback?: PlaybackConfig
): PlaybackConfig | undefined => {
    if (!playback?.preset) {
        return playback;
    }

    const preset = PRESET_PLAYBACK[playback.preset];

    if (!preset) {
        return playback;
    }

    return {
        ...preset,
        ...playback,
        bank: playback.bank ?? preset.bank,
        envelope: {
            ...preset.envelope,
            ...playback.envelope,
        },
        effects: {
            ...preset.effects,
            ...playback.effects,
        },
    };
};
