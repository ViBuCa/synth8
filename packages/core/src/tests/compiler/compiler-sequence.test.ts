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
})