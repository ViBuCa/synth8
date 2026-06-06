import { describe, expect, it } from "vitest";
import { compile } from "../index";

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
});