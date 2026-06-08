export type Waveform =
  | "sine"
  | "triangle"
  | "square"
  | "sawtooth";

export type PlaybackConfig = {
  sound?: Waveform;
  gain?: number;
};