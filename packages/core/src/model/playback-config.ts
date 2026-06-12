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

export type PlaybackConfig = {
  sound?: Waveform;
  gain?: number;
  pan?: number; // -1 left, 1 right
  envelope?: EnvelopeConfig;
};
