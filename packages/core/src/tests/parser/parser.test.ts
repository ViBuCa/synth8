import { describe, expect, it } from "vitest";
import { parse } from "../../parser/parser";
import { compile } from "../..";

describe("parse", () => {
    it("parses a beat expression", () => {
        expect(parse(`beat("kick snare hihat hihat").rate(2)`)).toMatchObject({
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
        expect(parse(`beat("kick snare")`)).toMatchObject({
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
        expect(parse('melody("c4 e4 g4")')).toMatchObject({
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
        expect(parse('melody("c4+e4+g4")')).toMatchObject({
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

    it("ignores comments between expressions and modifiers", () => {
        expect(
            parse(`// lead layer
melody("c4 e4")
  /* playback */
  .sound("square")`)
        ).toMatchObject({
            kind: "MelodyExpression",
            sound: "square",
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

    it("rejects empty beat and melody patterns", () => {
        expect(() => parse(`beat("")`)).toThrow(
            "beat() requires at least one step."
        );
        expect(() => parse(`melody("")`)).toThrow(
            "melody() requires at least one note."
        );
    });

    it("rejects unknown expressions", () => {
        expect(() => parse(`foo("bar")`)).toThrow("Unknown expression: foo");
    });

    it("rejects trailing tokens", () => {
        expect(() => parse(`beat("kick") beat("snare")`)).toThrow(
            "Unexpected tokens after expression at line 1, column 14."
        );
    });

    it("includes source positions in syntax errors", () => {
        expect(() => parse(`song(\n  beat("kick"),\n  melody("c4")\n  beat("snare")\n)`)).toThrow(
            "Expected \")\" at line 4, column 3."
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

    it("parses fractional offset values", () => {
        expect(parse(`beat("kick").offset(1.5)`)).toMatchObject({
            offset: 1.5,
        });
    });

    it("rejects negative offset values", () => {
        expect(() => parse(`beat("kick").offset(-1)`)).toThrow(
            "Offset value must be a non-negative number: -1"
        );
    });

    it("rejects unknown modifiers", () => {
        expect(() => parse(`beat("kick").blub(2)`)).toThrow(
            "Unknown modifier: blub"
        );
    });

    it("parses gain modifier", () => {
        const ast = parse(
            `melody("c4").gain(0.5)`
        );

        expect(ast).toMatchObject({
            gain: 0.5,
        });
    });

    it("parses envelope modifiers", () => {
        expect(
            parse(`melody("c4").attack(0.01).decay(0.2).sustain(0.6).release(0.4)`)
        ).toMatchObject({
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.6,
                release: 0.4,
            },
        });
    });

    it("parses preset modifiers", () => {
        expect(parse(`melody("c4").preset("chip-lead")`)).toMatchObject({
            preset: "chip-lead",
        });
        expect(parse(`melody("c2").preset("chip-bass")`)).toMatchObject({
            preset: "chip-bass",
        });
        expect(parse(`melody("c4").preset("soft-pad")`)).toMatchObject({
            preset: "soft-pad",
        });
        expect(parse(`melody("c4").preset("metal-rhythm")`)).toMatchObject({
            preset: "metal-rhythm",
        });
        expect(parse(`melody("c6").preset("arcade-pluck")`)).toMatchObject({
            preset: "arcade-pluck",
        });
        expect(parse(`melody("c2").preset("deep-bass")`)).toMatchObject({
            preset: "deep-bass",
        });
        expect(parse(`melody("c4").preset("warm-pad")`)).toMatchObject({
            preset: "warm-pad",
        });
        expect(parse(`melody("c6").preset("glass-lead")`)).toMatchObject({
            preset: "glass-lead",
        });
    });

    it("parses bank modifiers", () => {
        expect(parse(`beat("kick snare").bank("808")`)).toMatchObject({
            bank: "808",
        });
        expect(parse(`beat("kick snare").bank("arcade")`)).toMatchObject({
            bank: "arcade",
        });
        expect(parse(`beat("kick snare").bank("909")`)).toMatchObject({
            bank: "909",
        });
        expect(parse(`beat("kick snare").bank("chip")`)).toMatchObject({
            bank: "chip",
        });
        expect(parse(`beat("kick snare").bank("default")`)).toMatchObject({
            bank: "default",
        });
    });

    it("parses effect modifiers", () => {
        expect(
            parse(
                `melody("c4")
                    .delay(0.2)
                    .echo(0.35)
                    .room(0.4)
                    .reverb(0.5)
                    .lowpass(1200)
                    .highpass(120)
                    .distortion(0.25)
                    .chorus(0.6)`
            )
        ).toMatchObject({
            effects: {
                delay: 0.2,
                echo: 0.35,
                room: 0.4,
                reverb: 0.5,
                lowpass: 1200,
                highpass: 120,
                distortion: 0.25,
                chorus: 0.6,
            },
        });
    });

    it("rejects invalid envelope values", () => {
        expect(() => parse(`melody("c4").attack(-0.1)`)).toThrow(
            "attack() must be between 0 and 30 seconds."
        );
        expect(() => parse(`melody("c4").sustain(1.1)`)).toThrow(
            "sustain() must be between 0 and 1."
        );
    });

    it("rejects unknown sound values", () => {
        expect(() => parse(`melody("c4").sound("noise")`)).toThrow(
            "Illegal sound value: noise"
        );
    });

    it("rejects unknown preset values", () => {
        expect(() => parse(`melody("c4").preset("space-pad")`)).toThrow(
            "Illegal preset value: space-pad"
        );
    });

    it("rejects unknown bank values", () => {
        expect(() => parse(`beat("kick").bank("vinyl")`)).toThrow(
            "Illegal bank value: vinyl"
        );
    });

    it("rejects invalid effect values", () => {
        expect(() => parse(`melody("c4").delay(3)`)).toThrow(
            "delay() must be between 0 and 2 seconds."
        );
        expect(() => parse(`melody("c4").chorus(1.5)`)).toThrow(
            "chorus() must be between 0 and 1."
        );
        expect(() => parse(`melody("c4").lowpass(10)`)).toThrow(
            "lowpass() must be between 20 and 20000 Hz."
        );
    });
});
