import type { Pattern } from "@vibuca/synth8-core";
import { renderNative, renderNativeChunk } from "../backend/native-render";

export type RenderOptions = {
  bpm?: number;
  cache?: boolean;
  channels?: number;
  sampleRate?: number;
};

export type RenderChunkOptions = RenderOptions & {
  start: number;
  duration: number;
  tail?: number;
};

const cache = new Map<string, AudioBuffer>();
const keyFor = (pattern: Pattern, options: RenderOptions): string => JSON.stringify({
  pattern,
  bpm: options.bpm ?? 120,
  channels: options.channels ?? 2,
  sampleRate: options.sampleRate ?? 44100,
});

export const clearRenderCache = (): void => cache.clear();

export const renderToAudioBuffer = async (
  pattern: Pattern,
  options: RenderOptions = {},
): Promise<AudioBuffer> => {
  const key = options.cache === false ? undefined : keyFor(pattern, options);
  if (key) {
    const existing = cache.get(key);
    if (existing) return existing;
  }
  const buffer = await renderNative(pattern, options);
  if (key) {
    cache.set(key, buffer);
    while (cache.size > 8) cache.delete(cache.keys().next().value!);
  }
  return buffer;
};

export const renderChunkToAudioBuffer = (
  pattern: Pattern,
  options: RenderChunkOptions,
): Promise<AudioBuffer> => renderNativeChunk(pattern, options.start, options.duration, options);

export const normalizeAudioBuffer = (buffer: AudioBuffer): AudioBuffer => buffer;

const writeString = (view: DataView, offset: number, value: string): void => {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
};

export const encodeWav = (audioBuffer: AudioBuffer): Blob => {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const blockAlign = channels * 2;
  const dataSize = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF"); view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE"); writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); writeString(view, 36, "data"); view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let sample = 0; sample < audioBuffer.length; sample += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const value = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[sample]));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
};

export const renderWav = async (pattern: Pattern, options: RenderOptions = {}): Promise<Blob> =>
  encodeWav(await renderToAudioBuffer(pattern, options));

export type OggRenderOptions = RenderOptions & { quality?: number };

export const renderOgg = async (pattern: Pattern, options: OggRenderOptions = {}): Promise<Blob> => {
  const audioBuffer = await renderToAudioBuffer(pattern, options);
  const { default: ogg } = await import("@audio/encode-ogg");
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, channel) => audioBuffer.getChannelData(channel));
  const encoder = await ogg({ sampleRate: audioBuffer.sampleRate, channels: audioBuffer.numberOfChannels, quality: options.quality });
  try {
    const pages = [encoder.encode(channels), encoder.flush()];
    const output = new Uint8Array(pages.reduce((total, page) => total + page.byteLength, 0));
    let offset = 0;
    for (const page of pages) { output.set(page, offset); offset += page.byteLength; }
    return new Blob([output.buffer], { type: "audio/ogg; codecs=vorbis" });
  } finally { encoder.free(); }
};
