import { describe, expect, it } from "vitest";
import { analyzeSample, deduplicateSamples } from "../module";

describe("sample analysis", () => {
  it("deduplicates exact PCM assets", () => {
    const samples = [
      { id: "a", pcm: new Int8Array([1, 2]), sampleRate: 8363 },
      { id: "b", pcm: new Int8Array([1, 2]), sampleRate: 8363 },
      { id: "c", pcm: new Int8Array([1, 3]), sampleRate: 8363 },
    ];
    expect(deduplicateSamples(samples).map((sample) => sample.id)).toEqual(["a", "c"]);
  });

  it("reports useful imported sample diagnostics", () => {
    const result = analyzeSample({ id: "x", pcm: new Int8Array([-128, 127, -128, 127]), sampleRate: 1000 });
    expect(result.duration).toBeCloseTo(0.004);
    expect(result.peak).toBe(1);
    expect(result.rms).toBeCloseTo(1);
    expect(result.zeroCrossings).toBe(3);
  });
});
