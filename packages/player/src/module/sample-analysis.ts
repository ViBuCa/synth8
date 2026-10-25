import type { SampleAssetData } from "./sample-bank";

export type SampleAnalysis = {
  duration: number;
  peak: number;
  rms: number;
  zeroCrossings: number;
};

/** Return lightweight diagnostics useful for identifying imported samples. */
export const analyzeSample = (sample: SampleAssetData): SampleAnalysis => {
  let peak = 0;
  let energy = 0;
  let zeroCrossings = 0;
  let previous = sample.pcm[0] ?? 0;
  for (const value of sample.pcm) {
    const normalized = value / 128;
    const magnitude = Math.abs(normalized);
    peak = Math.max(peak, magnitude);
    energy += normalized * normalized;
    if ((previous < 0 && value >= 0) || (previous >= 0 && value < 0)) zeroCrossings += 1;
    previous = value;
  }
  return {
    duration: sample.pcm.length / Math.max(1, sample.sampleRate),
    peak,
    rms: sample.pcm.length ? Math.sqrt(energy / sample.pcm.length) : 0,
    zeroCrossings,
  };
};

/** Remove exact PCM duplicates while retaining the first asset's metadata. */
export const deduplicateSamples = <T extends SampleAssetData>(samples: readonly T[]): T[] => {
  const seen = new Map<string, T>();
  for (const sample of samples) {
    const bytes = new Uint8Array(sample.pcm.buffer, sample.pcm.byteOffset, sample.pcm.byteLength);
    let key = `${sample.sampleRate}:${bytes.length}:`;
    for (const byte of bytes) key += String.fromCharCode(byte);
    if (!seen.has(key)) seen.set(key, sample);
  }
  return [...seen.values()];
};
