export type MidiToSynth8Options = {
    step?: number;
    track?: string;
    includeVelocity?: boolean;
    trackOrder?: string[];
    compressSustains?: boolean;
};

export type SlotNote = {
    midi: number;
    token: string;
}
export type SplitPianoOptions = {
    splitMidi?: number;
    leadTrack?: string;
    bassTrack?: string;
    sourceTracks?: string[];
};

export type MidiImportMode = "literal" | "split-piano";

export type MidiToSynth8SourceOptions = MidiToSynth8Options & {
    mode?: MidiImportMode;
    splitPiano?: SplitPianoOptions;
    mapDrums?: boolean;
    drums?: MapDrumsOptions;
};

export type MapDrumsOptions = {
    drumTrack?: string;
    sourceTracks?: string[];
    drumMap?: Record<number, string>;
};