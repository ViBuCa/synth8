// packages/import-midi/src/index.ts
import { Midi } from "@tonejs/midi";
import { ImportedMidiNote, ImportedMidiSong } from "../model/midi";


export const parseMidi = (buffer: ArrayBuffer): ImportedMidiSong => {
    const midi = new Midi(buffer);
    const ppq = midi.header.ppq;

    const notes: ImportedMidiNote[] = [];
    let length = 0;

    for (const [trackIndex, track] of midi.tracks.entries()) {
        const trackName = track.name || `track${trackIndex + 1}`;

        for (const note of track.notes) {
            const time = note.ticks / ppq;
            const dur = note.durationTicks / ppq;

            notes.push({
                track: trackName,
                time,
                dur,
                midi: note.midi,
                name: note.name.toLowerCase(),
                velocity: note.velocity,
            });

            length = Math.max(length, time + dur);
        }
    }

    notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

    return {
        length,
        notes,
    };
}
