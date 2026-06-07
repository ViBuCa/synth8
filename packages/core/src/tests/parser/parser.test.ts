import { describe, expect, it } from "vitest";
import { parse } from "../../parser/parser";
import { compile } from "../..";

describe("parse", () => {
    it("parses a beat expression", () => {
        expect(parse(`beat("kick snare hihat hihat").rate(2)`)).toEqual({
            kind: "BeatExpression",
            steps: [
                { kind: "BeatSound", value: "kick", duration: 1 },
                { kind: "BeatSound", value: "snare", duration: 1 },
                { kind: "BeatSound", value: "hihat", duration: 1 },
                { kind: "BeatSound", value: "hihat", duration: 1 }
            ],
            rate: 2,
            repeat: 1,
            offset: 0,
            loop: false
        });
    });

    it("defaults rate to 1", () => {
        expect(parse(`beat("kick snare")`)).toEqual({
            kind: "BeatExpression",
            steps: [
                { kind: "BeatSound", value: "kick", duration: 1 },
                { kind: "BeatSound", value: "snare", duration: 1 }
            ],
            rate: 1,
            repeat: 1,
            offset: 0,
            loop: false
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
            repeat: 1,
            transpose: 0,
            loop: false,
            offset: 0,
            notes: [
                { kind: "MelodyNote", value: "c4", duration: 1 },
                { kind: "MelodyNote", value: "e4", duration: 1 },
                { kind: "MelodyNote", value: "g4", duration: 1 },
            ],
        });
    });

    it("parses parallel melody notes", () => {
        expect(parse('melody("c4+e4+g4")')).toEqual({
            kind: "MelodyExpression",
            rate: 1,
            repeat: 1,
            transpose: 0,
            loop: false,
            offset: 0,
            notes: [
                {
                    kind: "MelodyParallel",
                    notes: [
                        { kind: "MelodyNote", value: "c4", duration: 1 },
                        { kind: "MelodyNote", value: "e4", duration: 1 },
                        { kind: "MelodyNote", value: "g4", duration: 1 },
                    ],
                },
            ],
        });
    });

    it("parses beat modifiers", () => {
        expect(
            parse(`beat("kick snare").fast(2).slow(4).repeat(3).loop().offset(2)`)
        ).toMatchObject({
            kind: "BeatExpression",
            rate: 0.5,
            repeat: 3,
            loop: true,
            offset: 2,
        });
    });

    it("parses melody modifiers", () => {
        expect(
            parse(`melody("c4 d4").rate(2).transpose(12).transpose(-5).repeat(2)`)
        ).toMatchObject({
            kind: "MelodyExpression",
            rate: 2,
            transpose: 7,
            repeat: 2,
        });
    });

    it("parses a sequence expression", () => {
        expect(
            parse(`sequence(beat("kick snare"), melody("c4 d4")).repeat(2).loop().offset(1)`)
        ).toMatchObject({
            kind: "SequenceExpression",
            repeat: 2,
            loop: true,
            offset: 1,
            patterns: [
                { kind: "BeatExpression" },
                { kind: "MelodyExpression" },
            ],
        });
    });

    it("parses a song expression", () => {
        expect(
            parse(`song(beat("kick"), melody("c4"))`)
        ).toMatchObject({
            kind: "SongExpression",
            tracks: [
                { kind: "BeatExpression" },
                { kind: "MelodyExpression" },
            ],
        });
    });

    it("rejects an empty sequence", () => {
        expect(() => parse(`sequence()`)).toThrow(
            "sequence() requires at least one pattern."
        );
    });

    it("rejects an empty song", () => {
        expect(() => parse(`song()`)).toThrow(
            "song() requires at least one track."
        );
    });

    it("rejects unknown expressions", () => {
        expect(() => parse(`foo("bar")`)).toThrow("Unknown expression: foo");
    });

    it("rejects trailing tokens", () => {
        expect(() => parse(`beat("kick") beat("snare")`)).toThrow(
            "Unexpected tokens after expression."
        );
    });

    it("rejects invalid rates", () => {
        expect(() => parse(`beat("kick").rate(0)`)).toThrow("Invalid rate: 0");
        expect(() => parse(`beat("kick").fast(101)`)).toThrow("Invalid fast: 101");
        expect(() => parse(`beat("kick").slow(0)`)).toThrow("Invalid slow: 0");
    });

    it("rejects invalid repeat values", () => {
        expect(() => parse(`beat("kick").repeat(0)`)).toThrow(
            "Repeat value must be an integer: 0"
        );
    });

    it("rejects decimal transpose values", () => {
        expect(() => parse(`melody("c4").transpose(1.5)`)).toThrow(
            "Transpose value must be an integer: 1.5"
        );
    });

    it("rejects decimal offset values", () => {
        expect(() => parse(`beat("kick").offset(1.5)`)).toThrow(
            "Offset value must be an integer: 1.5"
        );
    });

    it("rejects unknown modifiers", () => {
        expect(() => parse(`beat("kick").blub(2)`)).toThrow(
            "Unknown modifier: blub"
        );
    });
});