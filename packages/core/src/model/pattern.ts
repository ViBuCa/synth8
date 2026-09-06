import type { Event, Synth8Event } from "./event";
import { toSynth8Event } from "./event";
import type { PlaybackConfig } from "./playback-config";

export type PatternLayer = {
  events: Event[];
  playback?: PlaybackConfig;
}

export type Synth8Pattern = {
  /** Return events whose onset is in [startTime, endTime), in beat units. */
  query(startTime: number, endTime: number): Synth8Event[];
};

export type PatternData = {
  length: number;
  loopLength: number;
  events: Event[];
  loop: boolean;
  layers: PatternLayer[];
};

export type Pattern = PatternData & Synth8Pattern;

/**
 * Query compiled layers without exposing the compiler's storage format.
 * Loop expansion is intentionally done here, rather than in a backend. This
 * makes repeated windows deterministic and makes adjacent windows safe to
 * schedule independently.
 */
const lowerBound = (events: Event[], time: number): number => {
  let low = 0;
  let high = events.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (events[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low;
};

export const queryPattern = (
  pattern: PatternData,
  startTime: number,
  endTime: number,
): Synth8Event[] => {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return [];
  const result: Synth8Event[] = [];
  const loopLength = pattern.loopLength;

  for (const layer of pattern.layers) {
    const sourceEvents = layer.events;
    if (sourceEvents.length === 0) continue;
    const firstCycle = pattern.loop && loopLength > 0
      ? Math.floor(startTime / loopLength)
      : 0;
    const lastCycle = pattern.loop && loopLength > 0
      ? Math.ceil(endTime / loopLength) - 1
      : 0;

    for (let cycle = firstCycle; cycle <= lastCycle; cycle++) {
      const offset = pattern.loop && loopLength > 0 ? cycle * loopLength : 0;
      const localStart = Math.max(0, startTime - offset);
      const localEnd = endTime - offset;
      const firstEvent = lowerBound(sourceEvents, localStart);
      for (let index = firstEvent; index < sourceEvents.length; index++) {
        const event = sourceEvents[index];
        if (event.time >= localEnd) break;
        const time = event.time + offset;
        if (time >= startTime && time < endTime) {
          result.push(toSynth8Event({ ...event, time }, layer.playback));
        }
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};
