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
    const cycles = pattern.loop && loopLength > 0
      ? Math.max(0, Math.ceil((endTime - pattern.length) / loopLength) + 1)
      : 1;

    for (let cycle = pattern.loop && loopLength > 0
      ? Math.floor(startTime / loopLength) - 1
      : 0; cycle < cycles + (pattern.loop ? 1 : 0); cycle++) {
      const offset = pattern.loop && loopLength > 0 ? cycle * loopLength : 0;
      for (const event of sourceEvents) {
        const time = event.time + offset;
        if (time >= startTime && time < endTime && (!pattern.loop || time < endTime)) {
          const converted = toSynth8Event({ ...event, time }, layer.playback);
          result.push(converted);
        }
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};
