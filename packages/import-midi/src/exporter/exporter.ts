import { ImportedMidiSong, MapDrumsOptions, MidiToSynth8Options, MidiToSynth8SourceOptions } from "../model";
import { DEFAULT_DRUM_MAP } from "../utils";
import { splitPianoSong } from "../utils/piano-roll-splitter";
import { getOrderedTracks } from "../utils/track-order-helper";
import { midiToPatternSource } from "./midi-to-pattern-mapper";

export const midiToSynth8Source = (
    song: ImportedMidiSong,
    options: MidiToSynth8SourceOptions = {}
): string => {
    let transformedSong = song;

    if (options.mapDrums) {
        transformedSong = mapDrumsSong(
            transformedSong,
            options.drums
        );
    }

    if ((options.mode ?? "literal") === "split-piano") {
        transformedSong = splitPianoSong(
            transformedSong,
            options.splitPiano
        );
    }

    return midiToSongSource(transformedSong, options);
}

export const midiToMelodySource = (
    song: ImportedMidiSong,
    options: MidiToSynth8Options = {}
): string => {
    return midiToPatternSource(song, options, 'melody');
}

const splitMixedDrumTracks = (song: ImportedMidiSong): ImportedMidiSong => {
    const trackKinds = new Map<string, { hasDrums: boolean; hasNotes: boolean }>();

    for (const note of song.notes) {
        const kinds = trackKinds.get(note.track) ?? { hasDrums: false, hasNotes: false };

        if (note.kind === "drum") {
            kinds.hasDrums = true;
        } else {
            kinds.hasNotes = true;
        }

        trackKinds.set(note.track, kinds);
    }

    return {
        length: song.length,
        notes: song.notes.map((note) => {
            const kinds = trackKinds.get(note.track);

            if (note.kind !== "drum" && kinds?.hasDrums && kinds.hasNotes) {
                return {
                    ...note,
                    track: `${note.track}-melody`,
                };
            }

            return note;
        }),
    };
};

export const midiToSongSource = (
    song: ImportedMidiSong,
    options: MidiToSynth8Options = {}
): string => {
    const exportSong = splitMixedDrumTracks(song);
    const tracks = getOrderedTracks(exportSong, options.trackOrder);

    if (tracks.length === 0) {
        return `song(\n        melody("_")\n    )`;
    }

    const patterns = tracks.map((track) => {
        const trackNotes = exportSong.notes.filter((note) => note.track === track);
        const isDrumTrack = trackNotes.every((note) => note.kind === "drum");
        return midiToPatternSource(
            exportSong,
            {
                ...options,
                track,
            },
            isDrumTrack ? "beat" : "melody"
        );
    }
    );

    return `song(
        ${patterns.join(",\n  ")}
    )`;
}

export const mapDrumsSong = (
    song: ImportedMidiSong,
    options: MapDrumsOptions = {}
): ImportedMidiSong => {
    const drumTrack = options.drumTrack ?? "drums";
    const sourceTracks = options.sourceTracks;
    const drumMap = options.drumMap ?? DEFAULT_DRUM_MAP;

    return {
        length: song.length,
        notes: song.notes.map((note) => {
            if (sourceTracks && !sourceTracks.includes(note.track)) {
                return note;
            }

            const drum = drumMap[note.midi];

            if (!drum) {
                return note;
            }

            return {
                ...note,
                track: drumTrack,
                kind: "drum",
                drum,
            };
        }),
    };
}