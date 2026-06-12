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

export type PlaybackBank =
  | "default"
  | "808"
  | "arcade";

export type EffectConfig = {
  delay?: number;
  echo?: number;
  room?: number;
  reverb?: number;
  lowpass?: number;
  highpass?: number;
  distortion?: number;
  chorus?: number;
};

export type PlaybackConfig = {
  preset?: PlaybackPreset;
  bank?: PlaybackBank;
  sound?: Waveform;
  gain?: number;
  pan?: number; // -1 left, 1 right
  envelope?: EnvelopeConfig;
  effects?: EffectConfig;
};
