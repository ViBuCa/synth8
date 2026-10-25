import type { SampleAssetData } from "./sample-bank";

const writeString = (view: DataView, offset: number, value: string): void => {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
};

/** Export one portable mono signed-8 sample as a standard 16-bit WAV file. */
export const encodeSampleWav = (asset: SampleAssetData): Blob => {
  const dataSize = asset.pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const sampleRate = Math.max(1, Math.floor(asset.sampleRate));
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  for (let index = 0; index < asset.pcm.length; index += 1) {
    const value = asset.pcm[index];
    view.setInt16(44 + index * 2, value < 0 ? value * 256 : value * 256, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
};
