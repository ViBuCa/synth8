import type { ModuleFormat, ModuleMetadata } from "./index";

export type TrackerNote = {
  /** MIDI note number. Undefined means no note on this cell. */
  note?: number;
  instrument?: number;
  volume?: number;
  effect?: TrackerEffect;
};

export type TrackerEffect =
  | { type: "arpeggio"; x: number; y: number }
  | { type: "pitch-slide-up" | "pitch-slide-down"; amount: number }
  | { type: "portamento"; amount: number }
  | { type: "vibrato"; speed: number; depth: number }
  | { type: "volume-slide"; amount: number }
  | { type: "pattern-break"; row: number }
  | { type: "pattern-jump"; order: number }
  | { type: "set-speed"; speed: number }
  | { type: "set-tempo"; bpm: number }
  | { type: "note-cut"; tick: number }
  | { type: "note-delay"; tick: number }
  | { type: "sample-offset"; offset: number }
  | { type: "unknown"; command: string; value: number };

export type TrackerRow = {
  cells: TrackerNote[];
};

export type TrackerPattern = {
  index: number;
  rows: TrackerRow[];
};

export type TrackerSample = {
  index: number;
  name?: string;
  assetId: string;
  rootNote: number;
  volume: number;
  length: number;
  loopStart?: number;
  loopEnd?: number;
};

export type TrackerInstrument = {
  index: number;
  name?: string;
  sampleIndexes: number[];
};

export type TrackerModule = ModuleMetadata & {
  format: ModuleFormat;
  orders: number[];
  patterns: TrackerPattern[];
  samples: TrackerSample[];
  instruments: TrackerInstrument[];
  initialSpeed: number;
  initialTempo: number;
  restartOrder?: number;
};

export const trackerPattern = (
  index: number,
  rows: TrackerRow[],
): TrackerPattern => ({ index, rows });

export const emptyTrackerNote = (): TrackerNote => ({});
