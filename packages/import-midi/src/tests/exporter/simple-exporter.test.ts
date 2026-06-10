import { describe, expect, it } from "vitest";
import { ImportedMidiSong } from "../../model";
import { midiToMelodySource } from "../../exporter/simple-exporter";

describe("midiToMelodySource", () => {
    it("exports a simple melody", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.25, dur: 0.25, midi: 62, name: "d4", velocity: 1 },
                { track: "lead", time: 0.5, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4 d4 e4")`
        );
    });

    it("exports rests as underscores", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.5, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4 _ e4")`
        );
    });

    it("exports simultaneous notes with plus", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
                { track: "lead", time: 0, dur: 0.25, midi: 67, name: "g4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4+e4+g4")`
        );
    });

    it("can filter by track", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "bass", time: 0, dur: 0.25, midi: 36, name: "c2", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25, track: "bass" })).toBe(
            `melody("c2")`
        );
    });

    it("returns an empty melody when no notes match", () => {
        const song: ImportedMidiSong = {
            length: 0,
            notes: [],
        };

        expect(midiToMelodySource(song)).toBe(`melody("")`);
    });
});