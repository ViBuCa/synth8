import * as Tone from "tone";
import type { Pattern } from "@vibuca/synth8-core";
import { getLayers } from "./layers";
import { scheduleLayers } from "./scheduler";
import { runRender } from "./render-queue";
import type { WorkerRenderResponse } from "./render-worker";

export type RenderWorkerRequest = {
    pattern: Pattern;
    options: RenderOptions;
    chunk?: { start: number; duration: number; tail?: number };
};

/** A worker adapter can run the Tone/offline renderer in a worker bundle. */
export type RenderWorker = {
    render(request: RenderWorkerRequest): Promise<AudioBuffer>;
};

export type RenderOptions = {
    bpm?: number;
    cache?: boolean;
    channels?: number;
    sampleRate?: number;
    /** Optional worker adapter. Browsers use the built-in renderer worker by default. */
    worker?: RenderWorker;
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

export const renderToAudioBufferInWorker = async (
    pattern: Pattern,
    worker: RenderWorker,
    options: RenderOptions = {}
): Promise<AudioBuffer> => runRender(() => worker.render({ pattern, options }));

const audioBufferFromWorker = (response: WorkerRenderResponse): AudioBuffer => {
    const rawContext = (Tone.getContext() as unknown as { rawContext?: AudioContext }).rawContext;
    if (!rawContext?.createBuffer) throw new Error("The current audio context cannot create a rendered buffer.");
    const buffer = rawContext.createBuffer(response.channels, response.length, response.sampleRate);
    response.data.forEach((channel, index) =>
        buffer.copyToChannel(channel as unknown as Float32Array<ArrayBuffer>, index)
    );
    return buffer;
};

let builtInWorker: RenderWorker | undefined;
let workerId = 0;

const getBuiltInWorker = (): RenderWorker | undefined => {
    if (typeof Worker === "undefined" || typeof URL === "undefined") return undefined;
    if (builtInWorker) return builtInWorker;
    const worker = new Worker(new URL("./render-worker.ts", import.meta.url), { type: "module" });
    const pending = new Map<number, { resolve: (buffer: AudioBuffer) => void; reject: (error: Error) => void }>();
    worker.onmessage = (event: MessageEvent<WorkerRenderResponse>) => {
        const request = pending.get(event.data.id);
        if (!request) return;
        pending.delete(event.data.id);
        if (event.data.error) request.reject(new Error(event.data.error));
        else request.resolve(audioBufferFromWorker(event.data));
    };
    worker.onerror = (event) => {
        const error = new Error(event.message || "Synth8 rendering worker failed.");
        for (const request of pending.values()) request.reject(error);
        pending.clear();
        worker.terminate();
        builtInWorker = undefined;
    };
    builtInWorker = { render: (request) => new Promise((resolve, reject) => {
        const id = ++workerId;
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, pattern: request.pattern, bpm: request.options.bpm ?? DEFAULT_BPM,
            channels: request.options.channels ?? 2, sampleRate: request.options.sampleRate ?? Tone.getContext().sampleRate,
            ...request.chunk });
    }) };
    return builtInWorker;
};

export const renderToAudioBuffer = async (
    pattern: Pattern,
    options: RenderOptions = {}
): Promise<AudioBuffer> => runRender(async () => {
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

    const worker = options.worker ?? getBuiltInWorker();
    if (worker) {
        try {
            const workerBuffer = await worker.render({ pattern, options });
            if (cacheKey) rememberRender(cacheKey, workerBuffer);
            return workerBuffer;
        } catch (error) {
            if (options.worker) throw error;
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
});

export const renderChunkToAudioBuffer = async (
    pattern: Pattern,
    options: RenderChunkOptions
): Promise<AudioBuffer> => runRender(async () => {
    const worker = options.worker ?? getBuiltInWorker();
    if (worker) {
        try {
            return await worker.render({ pattern, options, chunk: { start: options.start, duration: options.duration, tail: options.tail } });
        } catch (error) {
            if (options.worker) throw error;
        }
    }
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
});

/** Copy a rendered buffer into the live context before handing it to a Player. */
export const normalizeAudioBuffer = (buffer: AudioBuffer): AudioBuffer => {
    const context = Tone.getContext() as unknown as { rawContext?: AudioContext };
    const rawContext = context.rawContext;
    if (!rawContext?.createBuffer) return buffer;

    const normalized = rawContext.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
    );
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        normalized.copyToChannel(buffer.getChannelData(channel), channel);
    }
    return normalized;
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
