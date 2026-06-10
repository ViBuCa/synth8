export type Waveform =
  | "sine"
  | "triangle"
  | "square"
  | "sawtooth";

export type PlaybackConfig = {
  sound?: Waveform;
  gain?: number;
  pan?: number; // -1 left, 1 right
};