import type { Pattern } from "@vibuca/synth8-core";
import type { TrackerModule } from "../module";
import type { PreparedPlayback } from "./playoptions";

export type GameAudioOptions = {
    masterVolume?: number;
    musicVolume?: number;
    sfxVolume?: number;
};

export type MusicDuckingOptions = {
    /** Multiplier applied to music while ducking (0..1). */
    amount?: number;
    /** Optional fade time in seconds. */
    ramp?: number;
};

export type GameMusicOptions = {
    bpm?: number;
    sampleBank?: import("../module").SampleBank;
    playbackMode?: "live" | "rendered" | "streamed";
    streamChunkDuration?: number;
    streamTailDuration?: number;
    /** Number of chunks rendered ahead while the current chunk is playing. */
    streamPrefetchChunks?: number;
};

export type GameModuleOptions = {
    sampleRate?: number;
    lookAhead?: number;
    updateInterval?: number;
};

export type GameSfxOptions = {
    bpm?: number;
    voices?: number;
};

export type PlaySfxOptions = {
    volume?: number;
    playbackRate?: number;
};

export type PreparedSfx = {
    duration: number;
    voices: number;
    dispose(): void;
};

export type GameAudio = {
    prepareMusic(pattern: Pattern, options?: GameMusicOptions): Promise<PreparedPlayback>;
    prepareModule(module: TrackerModule, options?: GameModuleOptions): Promise<PreparedPlayback>;
    prepareModuleBytes(data: ArrayBuffer | Uint8Array, options?: GameModuleOptions): Promise<PreparedPlayback>;
    prepareSfx(pattern: Pattern, options?: GameSfxOptions): Promise<PreparedSfx>;
    playSfx(sfx: PreparedSfx, options?: PlaySfxOptions): void;
    setMasterVolume(volume: number): void;
    setMusicVolume(volume: number): void;
    setSfxVolume(volume: number): void;
    /** Temporarily attenuate music, useful for dialogue and boss warnings. */
    setMusicDucking(ducking: MusicDuckingOptions | number): void;
    dispose(): void;
};
