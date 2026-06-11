import { describe, expect, it } from "vitest";
import type { ImportedMidiSong } from "../../model";
import { splitPianoSong } from "../../utils/piano-roll-splitter";
import { normalizeSource } from "../exporter/test-helper";
import { midiToSongSource } from "../../exporter/exporter";

describe("splitPianoSong", () => {
  it("splits notes into lead and bass by midi pitch", () => {
    const song: ImportedMidiSong = {
      length: 1,
      notes: [
        { track: "piano", time: 0, dur: 0.25, midi: 72, name: "c5", velocity: 1 },
        { track: "piano", time: 0, dur: 0.25, midi: 48, name: "c3", velocity: 1 },
      ],
    };

    expect(splitPianoSong(song)).toEqual({
      length: 1,
      notes: [
        { track: "lead", time: 0, dur: 0.25, midi: 72, name: "c5", velocity: 1 },
        { track: "bass", time: 0, dur: 0.25, midi: 48, name: "c3", velocity: 1 },
      ],
    });
  });

  it("can export a split piano song", () => {
    const song: ImportedMidiSong = {
      length: 1,
      notes: [
        { track: "piano", time: 0, dur: 0.25, midi: 72, name: "c5", velocity: 1 },
        { track: "piano", time: 0, dur: 0.25, midi: 48, name: "c3", velocity: 1 },
      ],
    };

    const split = splitPianoSong(song);

    expect(normalizeSource(midiToSongSource(split, { step: 0.25 }))).toBe(
      normalizeSource(`
        song(
          melody("c3").fast(4),
          melody("c5").fast(4)
        )
      `)
    );
  });
});