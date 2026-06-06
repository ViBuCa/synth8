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
});