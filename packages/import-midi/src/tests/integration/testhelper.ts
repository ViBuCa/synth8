// src/tests/helpers/create-test-midi.ts
import { Midi } from "@tonejs/midi";

const SECONDS_PER_BEAT = 0.5;

export const createMidiBuffer = (
    notes: Array<{
        track?: string;
        midi: number;
        time: number;
        duration: number;
        velocity?: number;
    }>
): ArrayBuffer => {
    const midi = new Midi();
    const tracks = new Map<string, ReturnType<Midi["addTrack"]>>();

    for (const note of notes) {
        const trackName = note.track ?? "track1";

        let track = tracks.get(trackName);

        if (!track) {
            track = midi.addTrack();
            track.name = trackName;
            tracks.set(trackName, track);
        }

        track.addNote({
            midi: note.midi,
            time: note.time * SECONDS_PER_BEAT,
            duration: note.duration * SECONDS_PER_BEAT,
            velocity: note.velocity ?? 1,
        });
    }

    const bytes = midi.toArray();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);

    return buffer;
}
