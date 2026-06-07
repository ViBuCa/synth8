import { describe, expect, it } from "vitest";
import { compile } from "../../index";

describe("compile", () => {
  it("compiles a simple sample pattern", () => {
    expect(compile(`beat("kick snare hihat hihat")`)).toEqual({
      length: 4,
      events: [
        { time: 0, type: "drum", value: "kick", dur: 1 },
        { time: 1, type: "drum", value: "snare", dur: 1 },
        { time: 2, type: "drum", value: "hihat", dur: 1 },
        { time: 3, type: "drum", value: "hihat", dur: 1 }
      ]
    });
  });

  it("compiles a simple fast pattern", () => {
    expect(compile(`beat("kick snare hihat snare").rate(2)`)).toEqual({
      length: 2,
      events: [
        { time: 0, type: "drum", value: "kick", dur: 0.5 },
        { time: 0.5, type: "drum", value: "snare", dur: 0.5 },
        { time: 1, type: "drum", value: "hihat", dur: 0.5 },
        { time: 1.5, type: "drum", value: "snare", dur: 0.5 }
      ]
    });
  });

  it("supports rests", () => {
    expect(compile(`beat("kick _ snare hihat").rate(2)`)).toEqual({
      length: 2,
      events: [
        { time: 0, dur: 0.5, type: "drum", value: "kick" },
        { time: 1, dur: 0.5, type: "drum", value: "snare" },
        { time: 1.5, dur: 0.5, type: "drum", value: "hihat" },
      ],
    });
  });

  it("supports additional drum sounds", () => {
    expect(
      compile(`beat("kick clap openhat tom rim cowbell").rate(2)`)
    ).toEqual({
      length: 3,
      events: [
        { time: 0, dur: 0.5, type: "drum", value: "kick" },
        { time: 0.5, dur: 0.5, type: "drum", value: "clap" },
        { time: 1, dur: 0.5, type: "drum", value: "openhat" },
        { time: 1.5, dur: 0.5, type: "drum", value: "tom" },
        { time: 2, dur: 0.5, type: "drum", value: "rim" },
        { time: 2.5, dur: 0.5, type: "drum", value: "cowbell" },
      ],
    });
  });

  it("rejects unknown drum sounds", () => {
    expect(() => compile(`beat("kick slap")`)).toThrow("Unknown drum sound");
  });

  it("supports groups", () => {
    expect(compile(`beat("kick [snare hihat] kick hihat")`)).toEqual({
      length: 4,
      events: [
        { time: 0, dur: 1, type: "drum", value: "kick" },
        { time: 1, dur: 0.5, type: "drum", value: "snare" },
        { time: 1.5, dur: 0.5, type: "drum", value: "hihat" },
        { time: 2, dur: 1, type: "drum", value: "kick" },
        { time: 3, dur: 1, type: "drum", value: "hihat" },
      ],
    });
  });

  it("supports nested groups", () => {
    expect(compile(`beat("kick [snare [hihat hihat]] kick")`)).toEqual({
      length: 3,
      events: [
        { time: 0, dur: 1, type: "drum", value: "kick" },
        { time: 1, dur: 0.5, type: "drum", value: "snare" },
        { time: 1.5, dur: 0.25, type: "drum", value: "hihat" },
        { time: 1.75, dur: 0.25, type: "drum", value: "hihat" },
        { time: 2, dur: 1, type: "drum", value: "kick" },
      ],
    });
  });

  it("supports parallel hits", () => {
    expect(compile(`beat("kick+hihat snare hihat snare")`)).toEqual({
      length: 4,
      events: [
        { time: 0, dur: 1, type: "drum", value: "kick" },
        { time: 0, dur: 1, type: "drum", value: "hihat" },
        { time: 1, dur: 1, type: "drum", value: "snare" },
        { time: 2, dur: 1, type: "drum", value: "hihat" },
        { time: 3, dur: 1, type: "drum", value: "snare" },
      ],
    });
  });

  it("compiles melody", () => {
    expect(compile('melody("c4 e4 g4")').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4" },
      { time: 1, dur: 1, type: "note", value: "e4" },
      { time: 2, dur: 1, type: "note", value: "g4" },
    ]);
  });

  it("compiles song", () => {
    const pattern = compile(`
    song(
      beat("kick snare"),
      melody("c4 e4")
    )
  `);

    expect(pattern.events).toContainEqual({
      time: 0,
      dur: 1,
      type: "drum",
      value: "kick",
    });

    expect(pattern.events).toContainEqual({
      time: 0,
      dur: 1,
      type: "note",
      value: "c4",
    });
  });

  it("compiles parallel melody notes", () => {
    expect(compile('melody("c4+e4+g4 f4")').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4" },
      { time: 0, dur: 1, type: "note", value: "e4" },
      { time: 0, dur: 1, type: "note", value: "g4" },
      { time: 1, dur: 1, type: "note", value: "f4" },
    ]);
  });

  it("compiles parallel melody notes in groups", () => {
    expect(compile('melody("c4 [e4+g4 a4]")').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4" },
      { time: 1, dur: 0.5, type: "note", value: "e4" },
      { time: 1, dur: 0.5, type: "note", value: "g4" },
      { time: 1.5, dur: 0.5, type: "note", value: "a4" },
    ]);
  });

  it("compiles drum velocity", () => {
    expect(compile('beat("kick:0.5 snare")').events).toEqual([
      { time: 0, dur: 1, type: "drum", value: "kick", velocity: 0.5 },
      { time: 1, dur: 1, type: "drum", value: "snare", velocity: undefined },
    ]);
  });

  it("compiles melody velocity", () => {
    expect(compile('melody("c4:0.25 e4")').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4", velocity: 0.25 },
      { time: 1, dur: 1, type: "note", value: "e4", velocity: undefined },
    ]);
  });

  it("compiles parallel melody velocity", () => {
    expect(compile('melody("c4:1+e4:0.5+g4:0.25")').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4", velocity: 1 },
      { time: 0, dur: 1, type: "note", value: "e4", velocity: 0.5 },
      { time: 0, dur: 1, type: "note", value: "g4", velocity: 0.25 },
    ]);
  });

  it("supports fast", () => {
    expect(compile('beat("kick snare").fast(2)').events).toEqual([
      { time: 0, dur: 0.5, type: "drum", value: "kick" },
      { time: 0.5, dur: 0.5, type: "drum", value: "snare" },
    ]);
  });

  it("supports slow", () => {
    expect(compile('beat("kick snare").slow(2)').events).toEqual([
      { time: 0, dur: 2, type: "drum", value: "kick" },
      { time: 2, dur: 2, type: "drum", value: "snare" },
    ]);
  });

  it("composes timing modifiers", () => {
    expect(compile('melody("c4 e4").fast(2).slow(4)').events).toEqual([
      { time: 0, dur: 2, type: "note", value: "c4" },
      { time: 2, dur: 2, type: "note", value: "e4" },
    ]);
  });

});