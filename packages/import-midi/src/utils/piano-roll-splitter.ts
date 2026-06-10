import { ImportedMidiSong, SplitPianoOptions } from "../model";

export const splitPianoSong = (
    song: ImportedMidiSong,
    options: SplitPianoOptions = {}
): ImportedMidiSong => {
    const splitMidi = options.splitMidi ?? 60;
    const leadTrack = options.leadTrack ?? "lead";
    const bassTrack = options.bassTrack ?? "bass";
    const sourceTracks = options.sourceTracks;

    return {
        length: song.length,
        notes: song.notes.map((note) => {
            if (note.kind === "drum") {
                return note;
            }

            if (sourceTracks && !sourceTracks.includes(note.track)) {
                return note;
            }

            return {
                ...note,
                track: note.midi >= splitMidi ? leadTrack : bassTrack,
            };
        }),
    };
}