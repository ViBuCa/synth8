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
        gain: 0.8,
        envelope: {
            attack: 0.001,
            decay: 0.08,
            sustain: 0.12,
            release: 0.12,
        },
    },
    "arcade-pluck": {
        sound: "triangle",
        gain: 0.75,
        envelope: {
            attack: 0.001,
            decay: 0.09,
            sustain: 0.05,
            release: 0.08,
        },
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
    };
};
