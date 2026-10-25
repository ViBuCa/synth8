import type { SampleAssetData, SampleLoop } from "./sample-bank";

export type SerializedSampleBank = {
  version: 1;
  samples: Array<{
    id: string;
    name?: string;
    pcm: string;
    sampleRate: number;
    rootNote?: number;
    finetune?: number;
    volume?: number;
    loop?: SampleLoop;
  }>;
};

const toBase64 = (data: Int8Array): string => {
  let binary = "";
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Int8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Int8Array(bytes.buffer);
};

/** Serialize imported sample assets into a portable JSON bank. */
export const encodeSampleBank = (samples: readonly SampleAssetData[]): string => JSON.stringify({
  version: 1,
  samples: samples.map((sample) => ({ ...sample, pcm: toBase64(sample.pcm) })),
} satisfies SerializedSampleBank);

/** Validate and decode a portable JSON sample bank. */
export const decodeSampleBank = (source: string): SampleAssetData[] => {
  const parsed = JSON.parse(source) as Partial<SerializedSampleBank>;
  if (parsed.version !== 1 || !Array.isArray(parsed.samples)) throw new Error("Unsupported Synth8 sample bank format.");
  return parsed.samples.map((sample) => {
    if (!sample || typeof sample.id !== "string" || typeof sample.pcm !== "string" || typeof sample.sampleRate !== "number") {
      throw new Error("Invalid Synth8 sample bank entry.");
    }
    return {
      id: sample.id,
      name: sample.name,
      pcm: fromBase64(sample.pcm),
      sampleRate: sample.sampleRate,
      rootNote: sample.rootNote,
      finetune: sample.finetune,
      volume: sample.volume,
      loop: sample.loop,
    };
  });
};
