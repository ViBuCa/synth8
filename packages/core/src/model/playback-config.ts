export type Waveform =
  | "sine"
  | "triangle"
  | "square"
  | "sawtooth";

export type EnvelopeConfig = {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
};

export type PlaybackPreset =
  | "chip-lead"
  | "chip-bass"
  | "soft-pad"
  | "metal-rhythm"
  | "arcade-pluck";

export type PlaybackConfig = {
  preset?: PlaybackPreset;
  sound?: Waveform;
  gain?: number;
  pan?: number; // -1 left, 1 right
  envelope?: EnvelopeConfig;
};
