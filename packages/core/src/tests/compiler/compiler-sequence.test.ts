import { describe, expect, it } from "vitest";
import { compile } from "../../compiler";

describe('compile sequence-tests', () => {

    it("uses sequence length", () => {
        expect(
            compile(`sequence(
      beat("kick snare"),
      beat("hihat hihat")
    )`).length
        ).toBe(4);
    });

    it("uses sequences inside songs", () => {
        expect(
            compile(`song(
      sequence(
        melody("c4 d4"),
        melody("e4 f4")
      ),
      beat("kick snare").loop()
    )`).events
        ).toEqual([
            { time: 0, dur: 1, type: "note", value: "c4" },
            { time: 0, dur: 1, type: "drum", value: "kick" },

            { time: 1, dur: 1, type: "note", value: "d4" },
            { time: 1, dur: 1, type: "drum", value: "snare" },

            { time: 2, dur: 1, type: "note", value: "e4" },
            { time: 2, dur: 1, type: "drum", value: "kick" },

            { time: 3, dur: 1, type: "note", value: "f4" },
            { time: 3, dur: 1, type: "drum", value: "snare" },
        ]);
    });

    it("uses sequences inside songs", () => {
        expect(
            compile(`song(
      sequence(
        melody("c4 d4"),
        melody("e4 f4")
      ),
      beat("kick snare").loop()
    )`).events
        ).toEqual([
            { time: 0, dur: 1, type: "note", value: "c4" },
            { time: 0, dur: 1, type: "drum", value: "kick" },

            { time: 1, dur: 1, type: "note", value: "d4" },
            { time: 1, dur: 1, type: "drum", value: "snare" },

            { time: 2, dur: 1, type: "note", value: "e4" },
            { time: 2, dur: 1, type: "drum", value: "kick" },

            { time: 3, dur: 1, type: "note", value: "f4" },
            { time: 3, dur: 1, type: "drum", value: "snare" },
        ]);
    });

    it("repeats sequences", () => {
        expect(
            compile(`sequence(
      beat("kick snare"),
      beat("hihat hihat")
    ).repeat(2)`).events
        ).toEqual([
            { time: 0, dur: 1, type: "drum", value: "kick" },
            { time: 1, dur: 1, type: "drum", value: "snare" },
            { time: 2, dur: 1, type: "drum", value: "hihat" },
            { time: 3, dur: 1, type: "drum", value: "hihat" },
            { time: 4, dur: 1, type: "drum", value: "kick" },
            { time: 5, dur: 1, type: "drum", value: "snare" },
            { time: 6, dur: 1, type: "drum", value: "hihat" },
            { time: 7, dur: 1, type: "drum", value: "hihat" },
        ]);
    });

    it("repeats sequences", () => {
        expect(
            compile(`sequence(
      beat("kick snare"),
      beat("hihat hihat")
    ).repeat(2)`).events
        ).toEqual([
            { time: 0, dur: 1, type: "drum", value: "kick" },
            { time: 1, dur: 1, type: "drum", value: "snare" },
            { time: 2, dur: 1, type: "drum", value: "hihat" },
            { time: 3, dur: 1, type: "drum", value: "hihat" },
            { time: 4, dur: 1, type: "drum", value: "kick" },
            { time: 5, dur: 1, type: "drum", value: "snare" },
            { time: 6, dur: 1, type: "drum", value: "hihat" },
            { time: 7, dur: 1, type: "drum", value: "hihat" },
        ]);
    });

    it("coalesces repeated single-layer sequences without changing timing", () => {
        const pattern = compile(`sequence(
      melody("c4 d4")
    ).repeat(2)`);

        expect(pattern.length).toBe(4);
        expect(pattern.loopLength).toBe(4);
        expect(pattern.layers).toHaveLength(1);
        expect(pattern.layers[0].events).toEqual([
            { time: 0, dur: 1, type: "note", value: "c4" },
            { time: 1, dur: 1, type: "note", value: "d4" },
            { time: 2, dur: 1, type: "note", value: "c4" },
            { time: 3, dur: 1, type: "note", value: "d4" },
        ]);
    });

    it("keeps incompatible and multi-voice repeated sequences separate", () => {
        const pattern = compile(`sequence(
      melody("c4 d4").preset("chip-lead"),
      melody("e4 f4").preset("deep-bass")
    ).repeat(2)`);

        expect(pattern.layers).toHaveLength(4);
        expect(pattern.layers.map((layer) => layer.playback?.preset)).toEqual([
            "chip-lead", "deep-bass", "chip-lead", "deep-bass",
        ]);
    });

    it("preserves sequence offsets when coalescing", () => {
        const pattern = compile(`sequence(
      melody("c4 d4")
    ).repeat(2).offset(1)`);

        expect(pattern.length).toBe(5);
        expect(pattern.layers).toHaveLength(1);
        expect(pattern.layers[0].events.map((event) => event.time)).toEqual([1, 2, 3, 4]);
    });

    it("loops sequences inside songs", () => {
        expect(
            compile(`song(
      sequence(
        beat("kick snare"),
        beat("hihat hihat")
      ).loop(),
      melody("c4 d4 e4 f4 g4 a4")
    )`).events
        ).toEqual([
            { time: 0, dur: 1, type: "drum", value: "kick" },
            { time: 0, dur: 1, type: "note", value: "c4" },

            { time: 1, dur: 1, type: "drum", value: "snare" },
            { time: 1, dur: 1, type: "note", value: "d4" },

            { time: 2, dur: 1, type: "drum", value: "hihat" },
            { time: 2, dur: 1, type: "note", value: "e4" },

            { time: 3, dur: 1, type: "drum", value: "hihat" },
            { time: 3, dur: 1, type: "note", value: "f4" },

            { time: 4, dur: 1, type: "drum", value: "kick" },
            { time: 4, dur: 1, type: "note", value: "g4" },

            { time: 5, dur: 1, type: "drum", value: "snare" },
            { time: 5, dur: 1, type: "note", value: "a4" },
        ]);
    });

    it("repeats and offsets sequences", () => {
        expect(
            compile(`sequence(
      beat("kick snare"),
      beat("hihat _")
    ).repeat(2).offset(1)`).events
        ).toEqual([
            { time: 1, dur: 1, type: "drum", value: "kick" },
            { time: 2, dur: 1, type: "drum", value: "snare" },
            { time: 3, dur: 1, type: "drum", value: "hihat" },

            { time: 5, dur: 1, type: "drum", value: "kick" },
            { time: 6, dur: 1, type: "drum", value: "snare" },
            { time: 7, dur: 1, type: "drum", value: "hihat" },
        ]);
    });

})