import { describe, expect, it } from "vitest";
import { parse } from "../../parser/parser";

describe("parse", () => {
    it("parses a beat expression", () => {
        expect(parse(`beat("kick snare hihat hihat").rate(2)`)).toEqual({
            kind: "BeatExpression",
            sounds: ["kick", "snare", "hihat", "hihat"],
            rate: 2
        });
    });

    it("defaults rate to 1", () => {
        expect(parse(`beat("kick snare")`)).toEqual({
            kind: "BeatExpression",
            sounds: ["kick", "snare"],
            rate: 1
        });
    });
});