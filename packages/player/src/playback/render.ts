import * as Tone from "tone";
import type { Pattern } from "@vibuca/synth8-core";
import { getLayers } from "./layers";
import { scheduleLayers } from "./scheduler";

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

const DEFAULT_BPM = 120;
const MAX_RENDER_CACHE_ENTRIES = 8;

const renderCache = new Map<string, AudioBuffer>();

const renderCacheKey = (
    pattern: Pattern,
    bpm: number,
    channels: number,
    sampleRate: number
): string => JSON.stringify({ bpm, channels, sampleRate, pattern });

const rememberRender = (key: string, buffer: AudioBuffer): void => {
    renderCache.delete(key);
    renderCache.set(key, buffer);

    while (renderCache.size > MAX_RENDER_CACHE_ENTRIES) {
        const oldestKey = renderCache.keys().next().value;

        if (oldestKey === undefined) {
            break;
        }

        renderCache.delete(oldestKey);
    }
};

export const clearRenderCache = (): void => {
    renderCache.clear();
};

export const renderToAudioBuffer = async (
    pattern: Pattern,
    options: RenderOptions = {}
): Promise<AudioBuffer> => {
    const bpm = options.bpm ?? DEFAULT_BPM;
    const channels = options.channels ?? 2;
    const sampleRate = options.sampleRate ?? Tone.getContext().sampleRate;
    const useCache = options.cache ?? true;
    const cacheKey = useCache
        ? renderCacheKey(pattern, bpm, channels, sampleRate)
        : undefined;

    if (cacheKey) {
        const cached = renderCache.get(cacheKey);

        if (cached) {
            renderCache.delete(cacheKey);
            renderCache.set(cacheKey, cached);
            return cached;
        }
    }

    const secondsPerBeat = 60 / bpm;
    const duration = pattern.length * secondsPerBeat;
    const layers = getLayers(pattern);
    const buffer = await Tone.Offline(({ transport }) => {
        const output = new Tone.Gain(1);

        output.toDestination();
        transport.bpm.value = bpm;
        scheduleLayers(layers, secondsPerBeat, () => undefined, transport, output);
        transport.start(0);
    }, duration, channels, sampleRate);
    const audioBuffer = buffer.get();

    if (!audioBuffer) {
        throw new Error("Rendered audio buffer is empty.");
    }

    if (cacheKey) {
        rememberRender(cacheKey, audioBuffer);
    }

    return audioBuffer;
};

export const renderChunkToAudioBuffer = async (
    pattern: Pattern,
    options: RenderChunkOptions
): Promise<AudioBuffer> => {
    const bpm = options.bpm ?? DEFAULT_BPM;
    const channels = options.channels ?? 2;
    const sampleRate = options.sampleRate ?? Tone.getContext().sampleRate;
    const secondsPerBeat = 60 / bpm;
    const renderDuration = options.duration + (options.tail ?? 0);
    const startBeat = options.start / secondsPerBeat;
    const endBeat = (options.start + options.duration) / secondsPerBeat;
    const layers = getLayers(pattern).map((layer) => ({
        playback: layer.playback,
        events: layer.events
            .filter((event) => event.time >= startBeat && event.time < endBeat)
            .map((event) => ({
                ...event,
                time: event.time - startBeat,
            })),
    }));
    const buffer = await Tone.Offline(({ transport }) => {
        const output = new Tone.Gain(1);

        output.toDestination();
        transport.bpm.value = bpm;
        scheduleLayers(layers, secondsPerBeat, () => undefined, transport, output);
        transport.start(0);
    }, renderDuration, channels, sampleRate);
    const audioBuffer = buffer.get();

    if (!audioBuffer) {
        throw new Error("Rendered audio chunk is empty.");
    }

    return audioBuffer;
};

const writeString = (view: DataView, offset: number, value: string): void => {
    for (let index = 0; index < value.length; index++) {
        view.setUint8(offset + index, value.charCodeAt(index));
    }
};

export const encodeWav = (audioBuffer: AudioBuffer): Blob => {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = audioBuffer.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let offset = 0;

    writeString(view, offset, "RIFF");
    offset += 4;
    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;
    writeString(view, offset, "WAVE");
    offset += 4;
    writeString(view, offset, "fmt ");
    offset += 4;
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, channels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * blockAlign, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, bytesPerSample * 8, true);
    offset += 2;
    writeString(view, offset, "data");
    offset += 4;
    view.setUint32(offset, dataSize, true);
    offset += 4;

    const channelData = Array.from({ length: channels }, (_, channel) =>
        audioBuffer.getChannelData(channel)
    );

    for (let sample = 0; sample < audioBuffer.length; sample++) {
        for (let channel = 0; channel < channels; channel++) {
            const value = Math.max(-1, Math.min(1, channelData[channel][sample]));
            const pcm = value < 0 ? value * 0x8000 : value * 0x7fff;

            view.setInt16(offset, pcm, true);
            offset += bytesPerSample;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
};

export const renderWav = async (
    pattern: Pattern,
    options: RenderOptions = {}
): Promise<Blob> => encodeWav(await renderToAudioBuffer(pattern, options));
