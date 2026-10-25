import { describe, expect, it } from "vitest";
import { analyzeSample } from "../module";

describe("sample analysis", () => {
  it("reports useful imported sample diagnostics", () => {
    const result = analyzeSample({ id: "x", pcm: new Int8Array([-128, 127, -128, 127]), sampleRate: 1000 });
    expect(result.duration).toBeCloseTo(0.004);
    expect(result.peak).toBe(1);
    expect(result.rms).toBeCloseTo(1);
    expect(result.zeroCrossings).toBe(3);
  });
});
