import { describe, expect, it } from "vitest";
import { parse } from "../../parser/parser";
import { compile } from "../..";

describe("parse", () => {
    it("parses a beat expression", () => {
        expect(parse(`beat("kick snare hihat hihat").rate(2)`)).toEqual({
            kind: "BeatExpression",
            steps: [
                { kind: "BeatSound", value: "kick" },
                { kind: "BeatSound", value: "snare" },
                { kind: "BeatSound", value: "hihat" },
                { kind: "BeatSound", value: "hihat" }
            ],
            rate: 2
        });
    });

    it("defaults rate to 1", () => {
        expect(parse(`beat("kick snare")`)).toEqual({
            kind: "BeatExpression",
            steps: [
                { kind: "BeatSound", value: "kick" },
                { kind: "BeatSound", value: "snare" }
            ],
            rate: 1
        });
    });

    it("rejects unterminated groups", () => {
        expect(() => compile(`beat("kick [snare hihat")`)).toThrow("Unterminated group");
    });

    it("rejects unexpected closing groups", () => {
        expect(() => compile(`beat("kick snare] hihat")`)).toThrow("Unexpected closing group");
    });

    it("parses melody", () => {
        expect(parse('melody("c4 e4 g4")')).toEqual({
            kind: "MelodyExpression",
            rate: 1,
            notes: [
                { kind: "MelodyNote", value: "c4" },
                { kind: "MelodyNote", value: "e4" },
                { kind: "MelodyNote", value: "g4" },
            ],
        });
    });
});