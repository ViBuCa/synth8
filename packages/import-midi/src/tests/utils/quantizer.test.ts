import { describe, it, expect } from 'vitest';
import { inferQuantizationStep, quantize } from '../../utils';

describe("quantize", () => {
  it("rounds to the nearest step", () => {
    expect(quantize(0.49, 0.25)).toBe(0.5);
    expect(quantize(0.12, 0.25)).toBe(0);
    expect(quantize(1.13, 0.25)).toBe(1.25);
  });

  it("infers a finer grid when fast notes would collapse", () => {
    expect(
      inferQuantizationStep([
        { track: "lead", time: 0, dur: 0.125, midi: 60, name: "c4", velocity: 1 },
        { track: "lead", time: 0.125, dur: 0.125, midi: 62, name: "d4", velocity: 1 },
        { track: "lead", time: 0.25, dur: 0.125, midi: 64, name: "e4", velocity: 1 },
      ])
    ).toBe(0.125);
  });

  it("supports triplet grids", () => {
    expect(
      inferQuantizationStep([
        { track: "lead", time: 0, dur: 1 / 3, midi: 60, name: "c4", velocity: 1 },
        { track: "lead", time: 1 / 3, dur: 1 / 3, midi: 62, name: "d4", velocity: 1 },
        { track: "lead", time: 2 / 3, dur: 1 / 3, midi: 64, name: "e4", velocity: 1 },
      ])
    ).toBe(1 / 3);
  });
});
