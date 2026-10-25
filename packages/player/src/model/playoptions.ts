export type PreparedPlayback = {
    playbackMode: "rendered" | "live" | "streamed";
    start(): void | Promise<void>;
    ready?: Promise<void>;
    getPosition?(): number;
    getDuration?(): number;
    pause(): void;
    resume(): void;
    stop(): void;
    setMasterGain(gain: number): void;
    dispose(): void;
};

import type { AudioClock, Synth8AudioBackend } from "@vibuca/synth8-core";
import type { SampleBank } from "../module";

export type PlayOptions = {
    /** Optional backend for live playback. */
    backend?: Synth8AudioBackend;
    /** Optional existing context for applications that own sample assets. */
    context?: AudioContext;
    /** Destination for live playback (defaults to the AudioContext destination). */
    output?: AudioNode;
    sampleBank?: SampleBank;
    clock?: AudioClock;
    bpm?: number;
    lookAhead?: number;
    updateInterval?: number;
    playbackMode?: "auto" | "rendered" | "live" | "streamed";
    autoRenderedEventLimit?: number;
    streamChunkDuration?: number;
    streamTailDuration?: number;
    /** Number of chunks rendered concurrently ahead of the playing chunk. */
    streamPrefetchChunks?: number;
    onReady?: (playback: PreparedPlayback) => void | Promise<void>;
};
