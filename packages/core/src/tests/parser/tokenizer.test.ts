import { describe, expect, it } from "vitest";
import { tokenize, type Token } from "../../parser/tokenizer";

const withoutPositions = (tokens: Token[]) => tokens.map(({ type, value }) => ({ type, value }));

describe("tokenize", () => {
    it("tokenizes a beat expression", () => {
        expect(withoutPositions(tokenize(`beat("kick snare hihat hihat").rate(2)`))).toEqual([
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
        expect(withoutPositions(tokenize("beat melody sequence song"))).toEqual([
            { type: "identifier", value: "beat" },
            { type: "identifier", value: "melody" },
            { type: "identifier", value: "sequence" },
            { type: "identifier", value: "song" },
        ]);
    });

    it("tokenizes identifiers with numbers and underscores", () => {
        expect(withoutPositions(tokenize("foo_1 bar2"))).toEqual([
            { type: "identifier", value: "foo_1" },
            { type: "identifier", value: "bar2" },
        ]);
    });

    it("tokenizes strings", () => {
        expect(withoutPositions(tokenize(`"kick snare"`))).toEqual([
            { type: "string", value: "kick snare" },
        ]);
    });

    it("tokenizes numbers", () => {
        expect(withoutPositions(tokenize("1 12 3.5"))).toEqual([
            { type: "number", value: 1 },
            { type: "number", value: 12 },
            { type: "number", value: 3.5 },
        ]);
    });

    it("tokenizes negative numbers", () => {
        expect(withoutPositions(tokenize("-1 -12 -3.5"))).toEqual([
            { type: "number", value: -1 },
            { type: "number", value: -12 },
            { type: "number", value: -3.5 },
        ]);
    });

    it("tokenizes symbols", () => {
        expect(withoutPositions(tokenize("().,"))).toEqual([
            { type: "symbol", value: "(" },
            { type: "symbol", value: ")" },
            { type: "symbol", value: "." },
            { type: "symbol", value: "," },
        ]);
    });

    it("ignores whitespace", () => {
        expect(withoutPositions(tokenize(`  beat \n\t ( "kick" )  `))).toEqual([
            { type: "identifier", value: "beat" },
            { type: "symbol", value: "(" },
            { type: "string", value: "kick" },
            { type: "symbol", value: ")" },
        ]);
    });

    it("ignores line and block comments", () => {
        expect(withoutPositions(tokenize(`// intro\nbeat("kick") /* layer */ .loop()`))).toEqual([
            { type: "identifier", value: "beat" },
            { type: "symbol", value: "(" },
            { type: "string", value: "kick" },
            { type: "symbol", value: ")" },
            { type: "symbol", value: "." },
            { type: "identifier", value: "loop" },
            { type: "symbol", value: "(" },
            { type: "symbol", value: ")" },
        ]);
    });

    it("tracks token source positions", () => {
        expect(tokenize(`\n  beat("kick")`)[0]).toMatchObject({
            type: "identifier",
            value: "beat",
            start: { line: 2, column: 3 },
        });
    });

    it("tokenizes a full expression", () => {
        expect(withoutPositions(tokenize(`melody("c4 d4").transpose(-12).repeat(2)`))).toEqual([
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
            "Unterminated string literal at line 1, column 6."
        );
    });

    it("throws on unexpected characters", () => {
        expect(() => tokenize(`beat["kick"]`)).toThrow("Unexpected character: [ at line 1, column 5.");
    });

    it("throws on unterminated block comments", () => {
        expect(() => tokenize(`beat("kick") /* nope`)).toThrow(
            "Unterminated block comment at line 1, column 14."
        );
    });

    it("treats a standalone minus as unexpected", () => {
        expect(() => tokenize(`transpose(-)`)).toThrow("Unexpected character: - at line 1, column 11.");
    });
});