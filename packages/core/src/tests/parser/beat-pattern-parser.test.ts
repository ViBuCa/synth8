import { describe, expect, it } from "vitest";
import { parseBeatPattern } from "../../parser/beat-pattern-parser"; 

describe("parseBeatPattern", () => {
    it("parses simple beat sounds", () => {
        expect(parseBeatPattern("kick snare hihat")).toEqual([
            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
            { kind: "BeatSound", value: "snare", velocity: undefined, duration: 1 },
            { kind: "BeatSound", value: "hihat", velocity: undefined, duration: 1 },
        ]);
    });

    it("ignores extra whitespace", () => {
        expect(parseBeatPattern("  kick   snare\n\thihat  ")).toEqual([
            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
            { kind: "BeatSound", value: "snare", velocity: undefined, duration: 1 },
            { kind: "BeatSound", value: "hihat", velocity: undefined, duration: 1 },
        ]);
    });

    it("parses parallel sounds", () => {
        expect(parseBeatPattern("kick+snare")).toEqual([
            {
                kind: "BeatParallel",
                sounds: [
                    { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
                    { kind: "BeatSound", value: "snare", velocity: undefined, duration: 1 },
                ],
            },
        ]);
    });

    it("parses parallel sounds inside a pattern", () => {
        expect(parseBeatPattern("kick snare+hihat kick")).toEqual([
            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
            {
                kind: "BeatParallel",
                sounds: [
                    { kind: "BeatSound", value: "snare", velocity: undefined, duration: 1 },
                    { kind: "BeatSound", value: "hihat", velocity: undefined, duration: 1 },
                ],
            },
            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
        ]);
    });

    it("parses groups", () => {
        expect(parseBeatPattern("kick [snare hihat]")).toEqual([
            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
            {
                kind: "BeatGroup",
                steps: [
                    { kind: "BeatSound", value: "snare", velocity: undefined, duration: 1 },
                    { kind: "BeatSound", value: "hihat", velocity: undefined, duration: 1 },
                ],
            },
        ]);
    });

    it("parses nested groups", () => {
        expect(parseBeatPattern("kick [snare [hihat kick]]")).toEqual([
            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
            {
                kind: "BeatGroup",
                steps: [
                    { kind: "BeatSound", value: "snare", velocity: undefined, duration: 1 },
                    {
                        kind: "BeatGroup",
                        steps: [
                            { kind: "BeatSound", value: "hihat", velocity: undefined, duration: 1 },
                            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
                        ],
                    },
                ],
            },
        ]);
    });

    it("parses parallel sounds inside groups", () => {
        expect(parseBeatPattern("[kick+snare hihat]")).toEqual([
            {
                kind: "BeatGroup",
                steps: [
                    {
                        kind: "BeatParallel",
                        sounds: [
                            { kind: "BeatSound", value: "kick", velocity: undefined, duration: 1 },
                            { kind: "BeatSound", value: "snare", velocity: undefined, duration: 1 },
                        ],
                    },
                    { kind: "BeatSound", value: "hihat", velocity: undefined, duration: 1 },
                ],
            },
        ]);
    });

    it("parses velocity tokens", () => {
        expect(parseBeatPattern("kick:0.5 snare:0.25")).toEqual([
            { kind: "BeatSound", value: "kick", velocity: 0.5, duration: 1 },
            { kind: "BeatSound", value: "snare", velocity: 0.25, duration: 1 },
        ]);
    });

    it("parses velocity tokens inside parallel sounds", () => {
        expect(parseBeatPattern("kick:0.8+snare:0.4")).toEqual([
            {
                kind: "BeatParallel",
                sounds: [
                    { kind: "BeatSound", value: "kick", velocity: 0.8, duration: 1 },
                    { kind: "BeatSound", value: "snare", velocity: 0.4, duration: 1 },
                ],
            },
        ]);
    });

    it("returns an empty array for an empty pattern", () => {
        expect(parseBeatPattern("")).toEqual([]);
    });

    it("returns an empty array for a whitespace-only pattern", () => {
        expect(parseBeatPattern("   \n\t  ")).toEqual([]);
    });

    it("throws on unexpected closing group", () => {
        expect(() => parseBeatPattern("kick ] snare")).toThrow(
            "Unexpected closing group ']'."
        );
    });

    it("throws on unterminated groups", () => {
        expect(() => parseBeatPattern("kick [snare hihat")).toThrow(
            "Unterminated group '['."
        );
    });
});