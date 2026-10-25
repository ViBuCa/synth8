import { describe, expect, it } from "vitest";
import { decodeSampleBank, encodeSampleBank } from "../module";

describe("sample bank format", () => {
  it("round-trips portable PCM assets", () => {
    const source = [{
      id: "bass",
      name: "Imported bass",
      pcm: new Int8Array([-128, -4, 0, 127]),
      sampleRate: 8363,
      rootNote: 48,
      volume: 0.8,
      loop: { type: "forward" as const, start: 1, end: 4 },
    }];
    const decoded = decodeSampleBank(encodeSampleBank(source));
    expect(decoded[0]).toMatchObject({ id: "bass", name: "Imported bass", sampleRate: 8363, rootNote: 48 });
    expect([...decoded[0].pcm]).toEqual([-128, -4, 0, 127]);
  });
});
