import { describe, expect, it } from "vitest";
import { extractTfmxSampleCandidates } from "../module";

const putU32 = (data: Uint8Array, offset: number, value: number): void => {
  data[offset] = value >>> 24;
  data[offset + 1] = value >>> 16;
  data[offset + 2] = value >>> 8;
  data[offset + 3] = value;
};

const putU16 = (data: Uint8Array, offset: number, value: number): void => {
  data[offset] = value >>> 8;
  data[offset + 1] = value;
};

describe("TFMX sample candidates", () => {
  it("extracts candidate PCM regions without requiring a replay engine", () => {
    const data = new Uint8Array(0x340);
    data.set(new TextEncoder().encode("TFMX-MOD"), 0);
    putU32(data, 0x1e8, 0x280);
    putU32(data, 0x1ec, 0x300);
    putU32(data, 0x220, 0);
    data[0x224] = 2;
    data[0x225] = 0;
    data[0x226] = 3;
    data[0x227] = 0;
    putU16(data, 0x22a, 8);
    for (let index = 0; index < 16; index += 1) data[0x300 + index] = index;
    const candidates = extractTfmxSampleCandidates(data);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ sourceOffset: 0x300, sampleRate: 8363, confidence: "candidate" });
    expect([...candidates[0].pcm]).toEqual([...Array(16).keys()]);
  });
});
