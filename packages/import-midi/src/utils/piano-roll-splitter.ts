import { ImportedMidiSong, SplitPianoOptions } from "../model";

export function splitPianoSong(
    song: ImportedMidiSong,
    options: SplitPianoOptions = {}
): ImportedMidiSong {
    const splitMidi = options.splitMidi ?? 60;
    const leadTrack = options.leadTrack ?? "lead";
    const bassTrack = options.bassTrack ?? "bass";

    return {
        length: song.length,
        notes: song.notes.map((note) => ({
            ...note,
            track: note.midi >= splitMidi ? leadTrack : bassTrack,
        })),
    };
}