export type PreparedPlayback = {
    playbackMode: "rendered" | "live";
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
    playbackMode?: "auto" | "rendered" | "live";
    onReady?: (playback: PreparedPlayback) => void | Promise<void>;
};
