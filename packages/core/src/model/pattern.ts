import type { Event } from "./event";
import { PlaybackConfig } from "./playback-config";

export type PatternLayer = {
  events: Event[];
  playback?: PlaybackConfig;
}

export type Pattern = {
  length: number;
  loopLength: number;
  events: Event[];
  loop: boolean;
  layers: PatternLayer[];
};