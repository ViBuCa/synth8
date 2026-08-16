import type { Pattern } from "@vibuca/synth8-core";
import type { PreparedPlayback } from "./playoptions";

export type GameAudioOptions = {
    masterVolume?: number;
    musicVolume?: number;
    sfxVolume?: number;
};

export type GameMusicOptions = {
    bpm?: number;
    playbackMode?: "rendered" | "streamed";
    streamChunkDuration?: number;
    streamTailDuration?: number;
    /** Number of chunks rendered ahead while the current chunk is playing. */
    streamPrefetchChunks?: number;
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
    prepareSfx(pattern: Pattern, options?: GameSfxOptions): Promise<PreparedSfx>;
    playSfx(sfx: PreparedSfx, options?: PlaySfxOptions): void;
    setMasterVolume(volume: number): void;
    setMusicVolume(volume: number): void;
    setSfxVolume(volume: number): void;
    dispose(): void;
};
