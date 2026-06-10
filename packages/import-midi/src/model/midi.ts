export type ImportedMidiNote = {
    track: string;
    time: number;
    dur: number;
    midi: number;
    name: string;
    velocity: number;
};

export type ImportedMidiSong = {
    length: number;
    notes: ImportedMidiNote[];
};
