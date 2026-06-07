import { describe, expect, it } from "vitest";
import { tokenize } from "../../parser/tokenizer";

describe("tokenize", () => {
    it("tokenizes a beat expression", () => {
        expect(tokenize(`beat("kick snare hihat hihat").rate(2)`)).toEqual([
            { type: "identifier", value: "beat" },
            { type: "symbol", value: "(" },
            { type: "string", value: "kick snare hihat hihat" },
            { type: "symbol", value: ")" },
            { type: "symbol", value: "." },
            { type: "identifier", value: "rate" },
            { type: "symbol", value: "(" },
            { type: "number", value: 2 },
            { type: "symbol", value: ")" }
        ]);
    });

    it("tokenizes identifiers", () => {
        expect(tokenize("beat melody sequence song")).toEqual([
            { type: "identifier", value: "beat" },
            { type: "identifier", value: "melody" },
            { type: "identifier", value: "sequence" },
            { type: "identifier", value: "song" },
        ]);
    });

    it("tokenizes identifiers with numbers and underscores", () => {
        expect(tokenize("foo_1 bar2")).toEqual([
            { type: "identifier", value: "foo_1" },
            { type: "identifier", value: "bar2" },
        ]);
    });

    it("tokenizes strings", () => {
        expect(tokenize(`"kick snare"`)).toEqual([
            { type: "string", value: "kick snare" },
        ]);
    });

    it("tokenizes numbers", () => {
        expect(tokenize("1 12 3.5")).toEqual([
            { type: "number", value: 1 },
            { type: "number", value: 12 },
            { type: "number", value: 3.5 },
        ]);
    });

    it("tokenizes negative numbers", () => {
        expect(tokenize("-1 -12 -3.5")).toEqual([
            { type: "number", value: -1 },
            { type: "number", value: -12 },
            { type: "number", value: -3.5 },
        ]);
    });

    it("tokenizes symbols", () => {
        expect(tokenize("().,")).toEqual([
            { type: "symbol", value: "(" },
            { type: "symbol", value: ")" },
            { type: "symbol", value: "." },
            { type: "symbol", value: "," },
        ]);
    });

    it("ignores whitespace", () => {
        expect(tokenize(`  beat \n\t ( "kick" )  `)).toEqual([
            { type: "identifier", value: "beat" },
            { type: "symbol", value: "(" },
            { type: "string", value: "kick" },
            { type: "symbol", value: ")" },
        ]);
    });

    it("tokenizes a full expression", () => {
        expect(tokenize(`melody("c4 d4").transpose(-12).repeat(2)`)).toEqual([
            { type: "identifier", value: "melody" },
            { type: "symbol", value: "(" },
            { type: "string", value: "c4 d4" },
            { type: "symbol", value: ")" },
            { type: "symbol", value: "." },
            { type: "identifier", value: "transpose" },
            { type: "symbol", value: "(" },
            { type: "number", value: -12 },
            { type: "symbol", value: ")" },
            { type: "symbol", value: "." },
            { type: "identifier", value: "repeat" },
            { type: "symbol", value: "(" },
            { type: "number", value: 2 },
            { type: "symbol", value: ")" },
        ]);
    });

    it("throws on unterminated strings", () => {
        expect(() => tokenize(`beat("kick snare)`)).toThrow(
            "Unterminated string literal."
        );
    });

    it("throws on unexpected characters", () => {
        expect(() => tokenize(`beat["kick"]`)).toThrow("Unexpected character: [");
    });

    it("treats a standalone minus as unexpected", () => {
        expect(() => tokenize(`transpose(-)`)).toThrow("Unexpected character: -");
    });
});