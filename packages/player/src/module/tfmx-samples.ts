import type { SampleAssetData } from "./sample-bank";

export type TfmxSampleCandidate = SampleAssetData & {
  sourceOffset: number;
  confidence: "candidate";
};

const u32 = (data: Uint8Array, offset: number): number =>
  ((data[offset] ?? 0) * 0x1000000) + ((data[offset + 1] ?? 0) << 16) + ((data[offset + 2] ?? 0) << 8) + (data[offset + 3] ?? 0);

const u16 = (data: Uint8Array, offset: number): number =>
  ((data[offset] ?? 0) << 8) | (data[offset + 1] ?? 0);

/**
 * Find embedded TFMX sample candidates without running the original replay
 * routine. TFMX variants use sample descriptors inside macro data; this
 * intentionally returns candidates rather than claiming complete instrument
 * decoding. It is useful for inspection and will be replaced/extended by the
 * format-specific importer as more TFMX variants are covered.
 */
export const extractTfmxSampleCandidates = (data: Uint8Array): TfmxSampleCandidate[] => {
  const magic = new TextDecoder("ascii").decode(data.subarray(0, 8));
  if (!magic.startsWith("TFMX-MOD") && magic.slice(0, 4) !== "TFHD") {
    throw new Error("Not a recognized TFMX-MOD or TFHD file.");
  }
  const tableEnd = u32(data, 0x1e8);
  const dataFloor = Math.max(0x200, u32(data, 0x1ec));
  const end = tableEnd > 0x200 && tableEnd < data.length ? tableEnd : Math.min(data.length, 0x4000);
  const byOffset = new Map<number, TfmxSampleCandidate>();
  for (let offset = 0x200; offset + 12 <= end; offset += 2) {
    if (u32(data, offset) !== 0 || data[offset + 4] !== 0x02) continue;
    const sourceOffset = u32(data, offset + 4) & 0x00ffffff;
    const length = u16(data, offset + 10) * 2;
    if (sourceOffset < dataFloor || length < 16 || sourceOffset + length > data.length) continue;
    const existing = byOffset.get(sourceOffset);
    if (existing && existing.pcm.length >= length) continue;
    byOffset.set(sourceOffset, {
      id: `tfmx-candidate-${sourceOffset.toString(16)}`,
      pcm: new Int8Array(data.slice(sourceOffset, sourceOffset + length).buffer),
      sampleRate: 8363,
      rootNote: 48,
      volume: 1,
      sourceOffset,
      confidence: "candidate",
    });
  }
  return [...byOffset.values()].sort((a, b) => a.sourceOffset - b.sourceOffset);
};
