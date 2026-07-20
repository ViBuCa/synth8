export type PreparedPlayback = {
    playbackMode: "rendered" | "live" | "streamed";
    start(): void;
    pause(): void;
    resume(): void;
    stop(): void;
    dispose(): void;
};

export type PlayOptions = {
    bpm?: number;
    lookAhead?: number;
    updateInterval?: number;
    playbackMode?: "auto" | "rendered" | "live" | "streamed";
    autoRenderedEventLimit?: number;
    streamChunkDuration?: number;
    streamTailDuration?: number;
    onReady?: (playback: PreparedPlayback) => void | Promise<void>;
};
