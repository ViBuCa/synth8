export type Waveform =
  | "sine"
  | "triangle"
  | "square"
  | "sawtooth"
  | "pulse12"
  | "pulse25"
  | "pulse50"
  | "pulse75"
  | "noise"
  | "wavetable";

export type PitchExpression = {
  vibratoRate?: number;
  vibratoDepth?: number;
  vibratoDelay?: number;
  portamento?: number;
};

export type FilterEnvelope = {
  start: number;
  peak: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

export type FilterConfig = {
  cutoff?: number;
  resonance?: number;
  envelope?: FilterEnvelope;
};

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
  | "arcade-pluck"
  | "deep-bass"
  | "warm-pad"
  | "glass-lead"
  | "metal-lead"
  | "anthem-lead"
  | "palm-muted"
  | "arena-chords"
  | "picked-bass"
  | "metal-bass"
  | "synth-brass"
  | "dark-pad"
  | "orchestra-hit"
  | "warm-keys";

export type PlaybackBank =
  | "default"
  | "808"
  | "909"
  | "arcade"
  | "chip";

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
  pitch?: PitchExpression;
  filter?: FilterConfig;
};
