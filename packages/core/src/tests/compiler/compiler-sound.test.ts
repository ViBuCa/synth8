import { describe, expect, it } from "vitest";
import { compile } from "../../compiler";

describe('compile sounds', () => {

    it("adds playback sound to melody layers", () => {
        expect(compile(`melody("c4 e4").sound("triangle")`).layers).toMatchObject([
            {
                playback: { sound: "triangle" },
                events: [
                    { time: 0, dur: 1, type: "note", value: "c4" },
                    { time: 1, dur: 1, type: "note", value: "e4" },
                ],
            },
        ]);
    });

    it("adds playback sound to beat layers", () => {
        expect(compile(`beat("kick snare").sound("square")`).layers).toMatchObject([
            {
                playback: { sound: "square" },
                events: [
                    { time: 0, dur: 1, type: "drum", value: "kick" },
                    { time: 1, dur: 1, type: "drum", value: "snare" },
                ],
            },
        ]);
    });

    it("preserves different sounds per song layer", () => {
        expect(
            compile(`song(
      melody("c4 e4").sound("triangle"),
      melody("c3 g3").sound("sawtooth")
    )`).layers
        ).toMatchObject([
            {
                playback: { sound: "triangle" },
                events: [
                    { time: 0, dur: 1, type: "note", value: "c4" },
                    { time: 1, dur: 1, type: "note", value: "e4" },
                ],
            },
            {
                playback: { sound: "sawtooth" },
                events: [
                    { time: 0, dur: 1, type: "note", value: "c3" },
                    { time: 1, dur: 1, type: "note", value: "g3" },
                ],
            },
        ]);
    });

    it("loops layers with playback config", () => {
        expect(
            compile(`song(
      beat("kick snare").sound("square").loop(),
      melody("c4 d4 e4 f4")
    )`).layers[0]
        ).toMatchObject({
            playback: { sound: "square" },
            events: [
                { time: 0, dur: 1, type: "drum", value: "kick" },
                { time: 1, dur: 1, type: "drum", value: "snare" },
                { time: 2, dur: 1, type: "drum", value: "kick" },
                { time: 3, dur: 1, type: "drum", value: "snare" },
            ],
        });
    });

    it("preserves sequence layer playback config", () => {
        expect(
            compile(`sequence(
      melody("c4 d4").sound("triangle"),
      melody("e4 f4").sound("sine")
    )`).layers
        ).toMatchObject([
            {
                playback: { sound: "triangle" },
                events: [
                    { time: 0, dur: 1, type: "note", value: "c4" },
                    { time: 1, dur: 1, type: "note", value: "d4" },
                ],
            },
            {
                playback: { sound: "sine" },
                events: [
                    { time: 2, dur: 1, type: "note", value: "e4" },
                    { time: 3, dur: 1, type: "note", value: "f4" },
                ],
            },
        ]);
    });

});