import { describe, expect, it } from "vitest";
import { compile } from "../../index";

describe("compile", () => {
  it("compiles a simple sample pattern", () => {
    expect(compile(`beat("kick snare hihat hihat")`)).toMatchObject({
      length: 4,
      loopLength: 4,
      loop: false,
      events: [
        { time: 0, type: "drum", value: "kick", dur: 1 },
        { time: 1, type: "drum", value: "snare", dur: 1 },
        { time: 2, type: "drum", value: "hihat", dur: 1 },
        { time: 3, type: "drum", value: "hihat", dur: 1 }
      ]
    });
  });

  it("compiles a simple fast pattern", () => {
    expect(compile(`beat("kick snare hihat snare").rate(2)`)).toMatchObject({
      length: 2,
      loopLength: 2,
      loop: false,
      events: [
        { time: 0, type: "drum", value: "kick", dur: 0.5 },
        { time: 0.5, type: "drum", value: "snare", dur: 0.5 },
        { time: 1, type: "drum", value: "hihat", dur: 0.5 },
        { time: 1.5, type: "drum", value: "snare", dur: 0.5 }
      ]
    });
  });

  it("supports rests", () => {
    expect(compile(`beat("kick _ snare hihat").rate(2)`)).toMatchObject({
      length: 2,
      loopLength: 2,
      loop: false,
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
    ).toMatchObject({
      length: 3,
      loopLength: 3,
      loop: false,
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
    expect(compile(`beat("kick [snare hihat] kick hihat")`)).toMatchObject({
      length: 4,
      loopLength: 4,
      loop: false,
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
    expect(compile(`beat("kick [snare [hihat hihat]] kick")`)).toMatchObject({
      length: 3,
      loopLength: 3,
      loop: false,
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
    expect(compile(`beat("kick+hihat snare hihat snare")`)).toMatchObject({
      length: 4,
      loopLength: 4,
      loop: false,
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

  it("transposes melody notes", () => {
    expect(compile('melody("c4 d4 e4").transpose(12)').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c5" },
      { time: 1, dur: 1, type: "note", value: "d5" },
      { time: 2, dur: 1, type: "note", value: "e5" },
    ]);
  });

  it("transposes melody chords", () => {
    expect(compile('melody("c4+e4+g4").transpose(12)').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c5" },
      { time: 0, dur: 1, type: "note", value: "e5" },
      { time: 0, dur: 1, type: "note", value: "g5" },
    ]);
  });

  it("composes transpose modifiers", () => {
    expect(compile('melody("c4").transpose(12).transpose(-12)').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4" },
    ]);
  });

  it("repeats beat patterns", () => {
    expect(compile('beat("kick snare").repeat(2)').events).toEqual([
      { time: 0, dur: 1, type: "drum", value: "kick" },
      { time: 1, dur: 1, type: "drum", value: "snare" },
      { time: 2, dur: 1, type: "drum", value: "kick" },
      { time: 3, dur: 1, type: "drum", value: "snare" },
    ]);
  });

  it("repeats melody patterns", () => {
    expect(compile('melody("c4 e4").repeat(2)').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4" },
      { time: 1, dur: 1, type: "note", value: "e4" },
      { time: 2, dur: 1, type: "note", value: "c4" },
      { time: 3, dur: 1, type: "note", value: "e4" },
    ]);
  });

  it("combines repeat and fast", () => {
    expect(compile('beat("kick snare").repeat(2).fast(2)').events).toEqual([
      { time: 0, dur: 0.5, type: "drum", value: "kick" },
      { time: 0.5, dur: 0.5, type: "drum", value: "snare" },
      { time: 1, dur: 0.5, type: "drum", value: "kick" },
      { time: 1.5, dur: 0.5, type: "drum", value: "snare" },
    ]);
  });

  it("combines repeat and transpose", () => {
    expect(compile('melody("c4 e4").repeat(2).transpose(12)').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c5" },
      { time: 1, dur: 1, type: "note", value: "e5" },
      { time: 2, dur: 1, type: "note", value: "c5" },
      { time: 3, dur: 1, type: "note", value: "e5" },
    ]);
  });

  it("preserves velocity when repeating melody", () => {
    expect(compile('melody("c4:0.5 e4").repeat(2)').events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4", velocity: 0.5 },
      { time: 1, dur: 1, type: "note", value: "e4", velocity: undefined },
      { time: 2, dur: 1, type: "note", value: "c4", velocity: 0.5 },
      { time: 3, dur: 1, type: "note", value: "e4", velocity: undefined },
    ]);
  });

  it("preserves velocity when repeating beats", () => {
    expect(compile('beat("kick:0.8 snare").repeat(2)').events).toEqual([
      { time: 0, dur: 1, type: "drum", value: "kick", velocity: 0.8 },
      { time: 1, dur: 1, type: "drum", value: "snare", velocity: undefined },
      { time: 2, dur: 1, type: "drum", value: "kick", velocity: 0.8 },
      { time: 3, dur: 1, type: "drum", value: "snare", velocity: undefined },
    ]);
  });

  it("loops shorter beat tracks until song length", () => {
    expect(
      compile(`song(
      beat("kick snare").loop(),
      melody("c4 d4 e4 f4")
    )`).events
    ).toEqual([
      { time: 0, dur: 1, type: "drum", value: "kick" },
      { time: 0, dur: 1, type: "note", value: "c4" },

      { time: 1, dur: 1, type: "drum", value: "snare" },
      { time: 1, dur: 1, type: "note", value: "d4" },

      { time: 2, dur: 1, type: "drum", value: "kick" },
      { time: 2, dur: 1, type: "note", value: "e4" },

      { time: 3, dur: 1, type: "drum", value: "snare" },
      { time: 3, dur: 1, type: "note", value: "f4" },
    ]);
  });

  it("offsets beat events", () => {
    expect(compile(`beat("kick snare").offset(2)`).events).toEqual([
      { time: 2, dur: 1, type: "drum", value: "kick" },
      { time: 3, dur: 1, type: "drum", value: "snare" },
    ]);
  });

  it("offsets melody events", () => {
    expect(compile(`melody("c4 e4").offset(2)`).events).toEqual([
      { time: 2, dur: 1, type: "note", value: "c4" },
      { time: 3, dur: 1, type: "note", value: "e4" },
    ]);
  });

  it("uses offset tracks when calculating song length", () => {
    expect(
      compile(`song(
      beat("kick snare"),
      melody("c4 e4").offset(2)
    )`).length
    ).toBe(4);
  });

  it("loops offset tracks until song length", () => {
    expect(
      compile(`song(
      beat("kick snare").offset(2).loop(),
      melody("c4 d4 e4 f4 f4 e4 d4 c4")
    )`).events
    ).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4" },
      { time: 1, dur: 1, type: "note", value: "d4" },

      { time: 2, dur: 1, type: "drum", value: "kick" },
      { time: 2, dur: 1, type: "note", value: "e4" },

      { time: 3, dur: 1, type: "drum", value: "snare" },
      { time: 3, dur: 1, type: "note", value: "f4" },

      { time: 4, dur: 1, type: "drum", value: "kick" },
      { time: 4, dur: 1, type: "note", value: "f4" },

      { time: 5, dur: 1, type: "drum", value: "snare" },
      { time: 5, dur: 1, type: "note", value: "e4" },

      { time: 6, dur: 1, type: "drum", value: "kick" },
      { time: 6, dur: 1, type: "note", value: "d4" },

      { time: 7, dur: 1, type: "drum", value: "snare" },
      { time: 7, dur: 1, type: "note", value: "c4" },
    ]);
  });

  it("supports beat durations", () => {
    expect(compile(`beat("kick/2 snare hihat")`).events).toEqual([
      { time: 0, dur: 2, type: "drum", value: "kick" },
      { time: 2, dur: 1, type: "drum", value: "snare" },
      { time: 3, dur: 1, type: "drum", value: "hihat" },
    ]);
  });

  it("supports melody durations", () => {
    expect(compile(`melody("c4/2 d4 e4")`).events).toEqual([
      { time: 0, dur: 2, type: "note", value: "c4" },
      { time: 2, dur: 1, type: "note", value: "d4" },
      { time: 3, dur: 1, type: "note", value: "e4" },
    ]);
  });

  it("supports velocity and duration together", () => {
    expect(compile(`melody("c4:0.5/2 d4")`).events).toEqual([
      { time: 0, dur: 2, type: "note", value: "c4", velocity: 0.5 },
      { time: 2, dur: 1, type: "note", value: "d4" },
    ]);
  });

  it("uses durations for pattern length", () => {
    expect(compile(`melody("c4/2 d4 e4")`).length).toBe(4);
  });

  it("compiles gain playback config", () => {
    expect(
      compile(
        `melody("c4").gain(0.5)`
      ).layers
    ).toMatchObject([
      {
        playback: {
          gain: 0.5,
        },
      },
    ]);
  });

  it("compiles sound and gain", () => {
    expect(
      compile(
        `melody("c4")
        .sound("triangle")
        .gain(0.5)`
      ).layers
    ).toMatchObject([
      {
        playback: {
          sound: "triangle",
          gain: 0.5,
        },
      },
    ]);
  });

  it("stores pan on melody layer playback config", () => {
    expect(compile('melody("c4 e4").pan(-0.5)').layers).toEqual([
      {
        playback: { pan: -0.5 },
        events: [
          { time: 0, dur: 1, type: "note", value: "c4" },
          { time: 1, dur: 1, type: "note", value: "e4" },
        ],
      },
    ]);
  });

  it("stores pan on beat layer playback config", () => {
    expect(compile('beat("kick snare").pan(0.75)').layers).toEqual([
      {
        playback: { pan: 0.75 },
        events: [
          { time: 0, dur: 1, type: "drum", value: "kick" },
          { time: 1, dur: 1, type: "drum", value: "snare" },
        ],
      },
    ]);
  });

  it("keeps pan out of events", () => {
    const pattern = compile('melody("c4 e4").pan(0.25)');

    expect(pattern.events).toEqual([
      { time: 0, dur: 1, type: "note", value: "c4" },
      { time: 1, dur: 1, type: "note", value: "e4" },
    ]);
  });

  it("combines sound gain and pan on playback config", () => {
    expect(
      compile('melody("c4").sound("square").gain(0.4).pan(-1)').layers[0]
        .playback
    ).toEqual({
      sound: "square",
      gain: 0.4,
      pan: -1,
    });
  });

  it("stores envelope on melody layer playback config", () => {
    expect(
      compile(
        'melody("c4").attack(0.01).decay(0.15).sustain(0.5).release(0.35)'
      ).layers[0].playback
    ).toEqual({
      envelope: {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.5,
        release: 0.35,
      },
    });
  });

  it("stores preset on layer playback config", () => {
    expect(compile('melody("c4").preset("metal-rhythm")').layers[0].playback)
      .toEqual({
        preset: "metal-rhythm",
      });
  });

  it("applies sequence envelope as layer playback default", () => {
    const pattern = compile(`
    sequence(
      melody("c4"),
      melody("e4").release(0.6)
    ).attack(0.02).release(0.2)
  `);

    expect(pattern.layers[0].playback).toEqual({
      envelope: {
        attack: 0.02,
        release: 0.2,
      },
    });
    expect(pattern.layers[1].playback).toEqual({
      envelope: {
        attack: 0.02,
        release: 0.6,
      },
    });
  });

  it("applies sequence pan as layer playback default", () => {
    const pattern = compile(`
    sequence(
      melody("c4"),
      melody("e4")
    ).pan(0.5)
  `);

    expect(pattern.layers[0].playback).toEqual({ pan: 0.5 });
  });
});
