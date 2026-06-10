import { describe, it, expect } from 'vitest';
import { quantize } from '../../utils';

describe("quantize", () => {
  it("rounds to the nearest step", () => {
    expect(quantize(0.49, 0.25)).toBe(0.5);
    expect(quantize(0.12, 0.25)).toBe(0);
    expect(quantize(1.13, 0.25)).toBe(1.25);
  });
});
