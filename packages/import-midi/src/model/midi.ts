export type ImportedMidiNote = {
    track: string;
    time: number;
    dur: number;
    midi: number;
    name: string;
    velocity: number;
    kind?: 'note' | 'drum';
    drum?: string;
};

export type ImportedMidiSong = {
    length: number;
    notes: ImportedMidiNote[];
};
