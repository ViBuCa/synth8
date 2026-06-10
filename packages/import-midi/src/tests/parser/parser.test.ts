import { Midi } from "@tonejs/midi";
import { describe, expect, it } from "vitest";
import { parseMidi } from "../../parser";
import { midiToMelodySource } from "../../exporter/simple-exporter";

function createTestMidiBuffer(): ArrayBuffer {
    const midi = new Midi();

    const track = midi.addTrack();
    track.name = "lead";

    track.addNote({
        midi: 60,
        time: 0,
        duration: 0.25,
        velocity: 0.8,
    });

    track.addNote({
        midi: 64,
        time: 0.5,
        duration: 0.25,
        velocity: 0.6,
    });

    const bytes = midi.toArray();

    return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
}

describe("parseMidi", () => {
    it("parses midi notes from a buffer", () => {
        const song = parseMidi(createTestMidiBuffer());

        expect(song.notes).toHaveLength(2);

        expect(song.notes[0]).toMatchObject({
            track: "lead",
            midi: 60,
            name: "c4",
            time: 0,
            dur: 0.25,
        });
        expect(song.notes[0].velocity).toBeCloseTo(0.8, 2)

        expect(song.notes[1]).toMatchObject({
            track: "lead",
            midi: 64,
            name: "e4",
            time: 0.5,
            dur: 0.25,
        });
        expect(song.notes[1].velocity).toBeCloseTo(0.6, 2)
    });

    it("can parse and export a generated midi melody", () => {
        const song = parseMidi(createTestMidiBuffer());

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4 _ e4")`
        );
    });
});