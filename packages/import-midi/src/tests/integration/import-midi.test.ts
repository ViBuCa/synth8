// src/tests/import-midi.test.ts
import { describe, expect, it } from "vitest";
import {
    midiToMelodySource,
    midiToSynth8Source,
} from "../../exporter/exporter";
import { createMidiBuffer } from "./testhelper";
import { normalizeSource } from "../exporter/test-helper";
import { parseMidi } from "../../parser";

describe("MIDI import integration", () => {
    it("parses and exports a simple melody", () => {
        const buffer = createMidiBuffer([
            { track: "lead", midi: 60, time: 0, duration: 0.25 },
            { track: "lead", midi: 62, time: 0.25, duration: 0.25 },
            { track: "lead", midi: 64, time: 0.5, duration: 0.25 },
        ]);

        const song = parseMidi(buffer);

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4 d4 e4")`
        );
    });

    it("parses and exports rests", () => {
        const buffer = createMidiBuffer([
            { track: "lead", midi: 60, time: 0, duration: 0.25 },
            { track: "lead", midi: 64, time: 0.5, duration: 0.25 },
        ]);

        const song = parseMidi(buffer);

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4 _ e4")`
        );
    });

    it("parses and exports chords with plus", () => {
        const buffer = createMidiBuffer([
            { track: "lead", midi: 60, time: 0, duration: 0.25 },
            { track: "lead", midi: 64, time: 0, duration: 0.25 },
            { track: "lead", midi: 67, time: 0, duration: 0.25 },
        ]);

        const song = parseMidi(buffer);

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4+e4+g4")`
        );
    });

    it("parses and exports multiple tracks as song", () => {
        const buffer = createMidiBuffer([
            { track: "lead", midi: 72, time: 0, duration: 0.25 },
            { track: "bass", midi: 48, time: 0, duration: 0.25 },
        ]);

        const song = parseMidi(buffer);

        expect(
            normalizeSource(
                midiToSynth8Source(song, {
                    step: 0.25,
                    trackOrder: ["lead", "bass"],
                })
            )
        ).toBe(
            normalizeSource(`
        song(
          melody("c5"),
          melody("c3")
        )
      `)
        );
    });

    it("parses and exports durations", () => {
        const buffer = createMidiBuffer([
            { track: "lead", midi: 60, time: 0, duration: 0.5 },
            { track: "lead", midi: 62, time: 0.5, duration: 0.25 },
        ]);

        const song = parseMidi(buffer);

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4/2 d4")`
        );
    });

    it("parses and exports velocity when enabled", () => {
        const buffer = createMidiBuffer([
            { track: "lead", midi: 60, time: 0, duration: 0.25, velocity: 0.8 },
        ]);

        const song = parseMidi(buffer);

        expect(midiToMelodySource(song, { step: 0.25, includeVelocity: true })).toBe(
            `melody("c4:0.8")`
        );
    });

    it("parses, splits piano, and exports lead and bass", () => {
        const buffer = createMidiBuffer([
            { track: "piano", midi: 72, time: 0, duration: 0.25 },
            { track: "piano", midi: 48, time: 0, duration: 0.25 },
        ]);

        const song = parseMidi(buffer);

        expect(
            normalizeSource(
                midiToSynth8Source(song, {
                    step: 0.25,
                    mode: "split-piano",
                    trackOrder: ["lead", "bass"],
                })
            )
        ).toBe(
            normalizeSource(`
      song(
        melody("c5"),
        melody("c3")
      )
    `)
        );
    });

    it("parses, maps drums, and exports beat", () => {
        const buffer = createMidiBuffer([
            { track: "drums", midi: 36, time: 0, duration: 0.25 },
            { track: "drums", midi: 38, time: 0.5, duration: 0.25 },
        ]);

        const song = parseMidi(buffer);

        expect(
            normalizeSource(
                midiToSynth8Source(song, {
                    step: 0.25,
                    mapDrums: true,
                    trackOrder: ["drums"],
                })
            )
        ).toBe(
            normalizeSource(`
      song(
        beat("kick _ snare")
      )
    `)
        );
    });
});