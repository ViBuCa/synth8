// packages/import-midi/src/index.ts
import { Midi } from "@tonejs/midi";
import { ImportedMidiNote, ImportedMidiSong } from "../model/midi";


export const parseMidi = (buffer: ArrayBuffer): ImportedMidiSong => {
    const midi = new Midi(buffer);

    const notes: ImportedMidiNote[] = [];

    for (const [trackIndex, track] of midi.tracks.entries()) {
        const trackName = track.name || `track${trackIndex + 1}`;

        for (const note of track.notes) {
            notes.push({
                track: trackName,
                time: note.time,
                dur: note.duration,
                midi: note.midi,
                name: note.name.toLowerCase(),
                velocity: note.velocity,
            });
        }
    }

    notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

    return {
        length: midi.duration,
        notes,
    };
}