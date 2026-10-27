import { describe, expect, it } from "vitest";
import { TrackerClock } from "../module";

describe("TrackerClock", () => {
  it("uses classic tracker tick timing by default", () => {
    const clock = new TrackerClock({
      orders: [0],
      patternRows: new Map([[0, 2]]),
    });

    expect(clock.speed).toBe(6);
    expect(clock.tempo).toBe(125);
    expect(clock.tickDuration).toBeCloseTo(0.02);
  });

  it("advances ticks, rows and orders", () => {
    const clock = new TrackerClock({
      orders: [3, 7],
      patternRows: new Map([[3, 2], [7, 1]]),
      speed: 2,
      tempo: 100,
    });

    expect(clock.current).toMatchObject({ order: 0, pattern: 3, row: 0, tick: 0 });
    clock.advance();
    expect(clock.current).toMatchObject({ order: 0, pattern: 3, row: 0, tick: 1 });
    clock.advance();
    expect(clock.current).toMatchObject({ order: 0, pattern: 3, row: 1, tick: 0 });
    clock.advance();
    clock.advance();
    expect(clock.current).toMatchObject({ order: 1, pattern: 7, row: 0, tick: 0 });
    clock.advance();
    clock.advance();
    expect(clock.current).toMatchObject({ order: 0, pattern: 3, row: 0, tick: 0 });
  });

  it("can jump to an order and row", () => {
    const clock = new TrackerClock({ orders: [2, 5], patternRows: { 2: 4, 5: 8 } });
    clock.jump(1, 3);
    expect(clock.current).toMatchObject({ order: 1, pattern: 5, row: 3, tick: 0 });
  });

  it("keeps an empty module position valid when jumped", () => {
    const clock = new TrackerClock({ orders: [], patternRows: {} });
    clock.jump(4, 2);
    expect(clock.current).toMatchObject({ order: 0, pattern: 0, row: 0, tick: 0 });
  });

  it("supports runtime speed and tempo changes", () => {
    const clock = new TrackerClock({ orders: [0], patternRows: { 0: 8 }, speed: 6, tempo: 125 });
    clock.setSpeed(3);
    clock.setTempo(150);
    expect(clock.speed).toBe(3);
    expect(clock.tickDuration).toBeCloseTo(2.5 / 150);
  });

  it("restores initial timing when reset", () => {
    const clock = new TrackerClock({ orders: [0], patternRows: { 0: 8 }, speed: 6, tempo: 125 });
    clock.setSpeed(3);
    clock.setTempo(150);
    clock.advance();
    clock.reset();
    expect(clock.current).toMatchObject({ order: 0, pattern: 0, row: 0, tick: 0 });
    expect(clock.speed).toBe(6);
    expect(clock.tempo).toBe(125);
  });
});
