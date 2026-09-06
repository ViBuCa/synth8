import { describe, expect, it } from "vitest";
import { compile } from "../../compiler";

describe("backend-independent pattern query", () => {
  it("returns notes and omits rests", () => {
    const pattern = compile('melody("c4 _ e4")');
    expect(pattern.query?.(0, 3)).toMatchObject([
      { kind: "note", time: 0, duration: 1, pitch: "c4" },
      { kind: "note", time: 2, duration: 1, pitch: "e4" },
    ]);
  });

  it("preserves simultaneous chord and song events", () => {
    const pattern = compile('song(melody("c4+e4"), beat("kick"))');
    const events = pattern.query?.(0, 1) ?? [];
    expect(events.filter((event) => event.kind === "note")).toHaveLength(2);
    expect(events.find((event) => event.kind === "drum")).toMatchObject({ drum: "kick" });
  });

  it("queries dense tracks from a window index instead of rescanning the song", () => {
    const pattern = compile(`song(
      melody("c4/16 e4/16 g4/16 b4/16").repeat(64),
      melody("c3/16 g2/16").repeat(64),
      beat("kick+hihat snare+hihat").repeat(64)
    )`);
    let count = 0;
    for (let start = 0; start < pattern.length; start += 0.05) {
      count += pattern.query(start, Math.min(pattern.length, start + 0.05)).length;
    }
    expect(count).toBe(pattern.events.length);
  });

  it("queries loop windows without duplicating a boundary", () => {
    const pattern = compile('melody("c4 d4").loop()');
    const first = pattern.query?.(0, 1) ?? [];
    const second = pattern.query?.(1, 2) ?? [];
    expect(first).toMatchObject([{ time: 0, pitch: "c4" }]);
    expect(second).toMatchObject([{ time: 1, pitch: "d4" }]);
    expect(pattern.query?.(1, 2)).toEqual(second);
  });
});
