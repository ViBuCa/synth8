export type PreparedPlayback = {
    playbackMode: "rendered" | "live" | "streamed";
    start(): void;
    pause(): void;
    resume(): void;
    stop(): void;
    dispose(): void;
};

import type { AudioClock, Synth8AudioBackend } from "@vibuca/synth8-core";

export type PlayOptions = {
    /** Optional non-Tone backend. Both backend and clock must be supplied. */
    backend?: Synth8AudioBackend;
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
