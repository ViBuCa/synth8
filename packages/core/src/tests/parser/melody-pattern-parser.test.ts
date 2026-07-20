import { describe, expect, it } from "vitest";
import { parseMelodyPattern } from "../../parser/melody-pattern-parser";

describe("parseMelodyPattern", () => {
    it("parses simple melody notes", () => {
        expect(parseMelodyPattern("c4 d4 e4")).toEqual([
            { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
            { kind: "MelodyNote", value: "d4", velocity: undefined, duration: 1 },
            { kind: "MelodyNote", value: "e4", velocity: undefined, duration: 1 },
        ]);
    });

    it("ignores extra whitespace", () => {
        expect(parseMelodyPattern("  c4   d4\n\te4  ")).toEqual([
            { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
            { kind: "MelodyNote", value: "d4", velocity: undefined, duration: 1 },
            { kind: "MelodyNote", value: "e4", velocity: undefined, duration: 1 },
        ]);
    });

    it("parses sharp and flat notes", () => {
        expect(parseMelodyPattern("c#4 db4")).toEqual([
            { kind: "MelodyNote", value: "c#4", velocity: undefined, duration: 1 },
            { kind: "MelodyNote", value: "db4", velocity: undefined, duration: 1 },
        ]);
    });

    it("parses rests", () => {
        expect(parseMelodyPattern("c4 _ d4")).toEqual([
            { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
            { kind: "MelodyNote", value: "_", velocity: undefined, duration: 1 },
            { kind: "MelodyNote", value: "d4", velocity: undefined, duration: 1 },
        ]);
    });

    it("parses parallel notes", () => {
        expect(parseMelodyPattern("c4+e4+g4")).toEqual([
            {
                kind: "MelodyParallel",
                notes: [
                    { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
                    { kind: "MelodyNote", value: "e4", velocity: undefined, duration: 1 },
                    { kind: "MelodyNote", value: "g4", velocity: undefined, duration: 1 },
                ],
            },
        ]);
    });

    it("parses parallel notes inside a melody", () => {
        expect(parseMelodyPattern("c4 e4+g4 d4")).toEqual([
            { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
            {
                kind: "MelodyParallel",
                notes: [
                    { kind: "MelodyNote", value: "e4", velocity: undefined, duration: 1 },
                    { kind: "MelodyNote", value: "g4", velocity: undefined, duration: 1 },
                ],
            },
            { kind: "MelodyNote", value: "d4", velocity: undefined, duration: 1 },
        ]);
    });

    it("parses groups", () => {
        expect(parseMelodyPattern("c4 [d4 e4]")).toEqual([
            { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
            {
                kind: "MelodyGroup",
                notes: [
                    { kind: "MelodyNote", value: "d4", velocity: undefined, duration: 1 },
                    { kind: "MelodyNote", value: "e4", velocity: undefined, duration: 1 },
                ],
            },
        ]);
    });

    it("parses nested groups", () => {
        expect(parseMelodyPattern("c4 [d4 [e4 g4]]")).toEqual([
            { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
            {
                kind: "MelodyGroup",
                notes: [
                    { kind: "MelodyNote", value: "d4", velocity: undefined, duration: 1 },
                    {
                        kind: "MelodyGroup",
                        notes: [
                            { kind: "MelodyNote", value: "e4", velocity: undefined, duration: 1 },
                            { kind: "MelodyNote", value: "g4", velocity: undefined, duration: 1 },
                        ],
                    },
                ],
            },
        ]);
    });

    it("parses parallel notes inside groups", () => {
        expect(parseMelodyPattern("[c4+e4 g4]")).toEqual([
            {
                kind: "MelodyGroup",
                notes: [
                    {
                        kind: "MelodyParallel",
                        notes: [
                            { kind: "MelodyNote", value: "c4", velocity: undefined, duration: 1 },
                            { kind: "MelodyNote", value: "e4", velocity: undefined, duration: 1 },
                        ],
                    },
                    { kind: "MelodyNote", value: "g4", velocity: undefined, duration: 1 },
                ],
            },
        ]);
    });

    it("parses velocity tokens", () => {
        expect(parseMelodyPattern("c4:0.5 d4:0.25")).toEqual([
            { kind: "MelodyNote", value: "c4", velocity: 0.5, duration: 1 },
            { kind: "MelodyNote", value: "d4", velocity: 0.25, duration: 1 },
        ]);
    });

    it("parses velocity tokens inside parallel notes", () => {
        expect(parseMelodyPattern("c4:0.8+e4:0.4")).toEqual([
            {
                kind: "MelodyParallel",
                notes: [
                    { kind: "MelodyNote", value: "c4", velocity: 0.8, duration: 1 },
                    { kind: "MelodyNote", value: "e4", velocity: 0.4, duration: 1 },
                ],
            },
        ]);
    });

    it("rejects empty parallel note parts", () => {
        expect(() => parseMelodyPattern("c4+")).toThrow(
            "Invalid parallel melody token: c4+"
        );
        expect(() => parseMelodyPattern("c4++e4")).toThrow(
            "Invalid parallel melody token: c4++e4"
        );
    });

    it("returns an empty array for an empty pattern", () => {
        expect(parseMelodyPattern("")).toEqual([]);
    });

    it("returns an empty array for a whitespace-only pattern", () => {
        expect(parseMelodyPattern("     ")).toEqual([]);
    });

    it("throws on unknown notes", () => {
        expect(() => parseMelodyPattern("c4 nope4")).toThrow("Unknown note: nope4");
    });

    it("throws on unknown notes inside parallel notes", () => {
        expect(() => parseMelodyPattern("c4+nope4")).toThrow("Unknown note: nope4");
    });

    it("throws on unexpected closing groups", () => {
        expect(() => parseMelodyPattern("c4 ] d4")).toThrow(
            "Unexpected closing group ']'."
        );
    });

    it("throws on unclosed groups", () => {
        expect(() => parseMelodyPattern("c4 [d4 e4")).toThrow(
            "Unclosed melody group"
        );
    });
});