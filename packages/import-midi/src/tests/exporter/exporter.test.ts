import { describe, expect, it } from "vitest";
import { ImportedMidiSong } from "../../model";
import { mapDrumsSong, midiToMelodySource, midiToSongSource, midiToSynth8Source } from "../../exporter/exporter";
import { normalizeSource } from "./test-helper";

describe("midiToMelodySource", () => {
    it("exports a simple melody", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.25, dur: 0.25, midi: 62, name: "d4", velocity: 1 },
                { track: "lead", time: 0.5, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4 d4 e4").fast(4)`
        );
    });

    it("exports rests as underscores", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.5, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4 _ e4").fast(4)`
        );
    });

    it("exports simultaneous notes with plus", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
                { track: "lead", time: 0, dur: 0.25, midi: 67, name: "g4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4+e4+g4").fast(4)`
        );
    });

    it("can filter by track", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "bass", time: 0, dur: 0.25, midi: 36, name: "c2", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25, track: "bass" })).toBe(
            `melody("c2").fast(4)`
        );
    });

    it("returns an empty melody when no notes match", () => {
        const song: ImportedMidiSong = {
            length: 0,
            notes: [],
        };

        expect(midiToMelodySource(song)).toBe(`melody("")`);
    });

    it("exports note durations", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.5, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.5, dur: 0.25, midi: 62, name: "d4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4/2 d4").fast(4)`
        );
    });

    it("exports durations inside chords", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.5, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25 })).toBe(
            `melody("c4/2+e4").fast(4)`
        );
    });

    it("can export velocity", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 0.7952755905511811 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25, includeVelocity: true })).toBe(
            `melody("c4:0.8").fast(4)`
        );
    });

    it("exports duration before velocity", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.5, midi: 60, name: "c4", velocity: 0.6 },
            ],
        };

        expect(midiToMelodySource(song, { step: 0.25, includeVelocity: true })).toBe(
            `melody("c4/2:0.6").fast(4)`
        );
    });

    it("can keep explicit rests under sustained notes", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.5, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.5, dur: 0.25, midi: 62, name: "d4", velocity: 1 },
            ],
        };

        expect(
            midiToMelodySource(song, {
                step: 0.25,
                compressSustains: false,
            })
        ).toBe(`melody("c4/2 _ d4").fast(4)`);
    });

    it("can infer a finer quantization step for fast notes", () => {
        const song: ImportedMidiSong = {
            length: 0.5,
            notes: [
                { track: "lead", time: 0, dur: 0.125, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.125, dur: 0.125, midi: 62, name: "d4", velocity: 1 },
                { track: "lead", time: 0.25, dur: 0.125, midi: 64, name: "e4", velocity: 1 },
            ],
        };

        expect(midiToMelodySource(song, { step: "auto" })).toBe(
            `melody("c4 d4 e4").fast(8)`
        );
    });
});

describe("midiToSongSource", () => {
    it("exports multiple tracks as a song", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "bass", time: 0, dur: 0.25, midi: 36, name: "c2", velocity: 1 },
            ],
        };

        expect(normalizeSource(midiToSongSource(song, { step: 0.25 }))).toBe(normalizeSource(`song(
            melody("c2").fast(4),
            melody("c4").fast(4)
        )`));
    });

    it("returns an empty song when no notes exist", () => {
        const song: ImportedMidiSong = {
            length: 0,
            notes: [],
        };

        expect(midiToSongSource(song)).toBe("song()");
    });

    it("keeps rests within each track", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "lead", time: 0, dur: 0.25, midi: 60, name: "c4", velocity: 1 },
                { track: "lead", time: 0.5, dur: 0.25, midi: 64, name: "e4", velocity: 1 },
                { track: "bass", time: 0.25, dur: 0.25, midi: 36, name: "c2", velocity: 1 },
            ],
        };

        expect(normalizeSource(midiToSongSource(song, { step: 0.25 }))).toBe(normalizeSource(`song(
            melody("_ c2").fast(4),
            melody("c4 _ e4").fast(4)
        )`));
    });
});

describe("midiToSynth8Source", () => {
    it("exports literal midi by default", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "piano", time: 0, dur: 0.25, midi: 72, name: "c5", velocity: 1 },
                { track: "piano", time: 0, dur: 0.25, midi: 48, name: "c3", velocity: 1 },
            ],
        };

        expect(normalizeSource(midiToSynth8Source(song, { step: 0.25 }))).toBe(
            normalizeSource(`
        song(
          melody("c3+c5").fast(4)
        )
      `)
        );
    });

    it("can split piano before exporting", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "piano", time: 0, dur: 0.25, midi: 72, name: "c5", velocity: 1 },
                { track: "piano", time: 0, dur: 0.25, midi: 48, name: "c3", velocity: 1 },
            ],
        };

        expect(
            normalizeSource(
                midiToSynth8Source(song, {
                    step: 0.25,
                    mode: "split-piano",
                })
            )
        ).toBe(
            normalizeSource(`
        song(
          melody("c3").fast(4),
          melody("c5").fast(4)
        )
      `)
        );
    });

    it("passes split piano options through", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "piano", time: 0, dur: 0.25, midi: 59, name: "b3", velocity: 1 },
                { track: "piano", time: 0, dur: 0.25, midi: 62, name: "d4", velocity: 1 },
            ],
        };

        expect(
            normalizeSource(
                midiToSynth8Source(song, {
                    step: 0.25,
                    mode: "split-piano",
                    splitPiano: {
                        splitMidi: 61,
                    },
                })
            )
        ).toBe(
            normalizeSource(`
      song(
        melody("b3").fast(4),
        melody("d4").fast(4)
      )
    `)
        );
    });

    it("can export tracks in a custom order", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "bass", time: 0, dur: 0.25, midi: 36, name: "c2", velocity: 1 },
                { track: "lead", time: 0, dur: 0.25, midi: 72, name: "c5", velocity: 1 },
            ],
        };

        expect(
            normalizeSource(
                midiToSongSource(song, {
                    step: 0.25,
                    trackOrder: ["lead", "bass"],
                })
            )
        ).toBe(
            normalizeSource(`
      song(
        melody("c5").fast(4),
        melody("c2").fast(4)
      )
    `)
        );
    });
});

describe("mapDrumsSong", () => {
    it("maps midi drum notes to Synth8 drum names", () => {
        const song: ImportedMidiSong = {
            length: 1,
            notes: [
                { track: "piano", time: 0, dur: 0.25, midi: 36, name: "c2", velocity: 1 },
                { track: "piano", time: 0.5, dur: 0.25, midi: 38, name: "d2", velocity: 1 },
            ],
        };

        expect(mapDrumsSong(song)).toEqual({
            length: 1,
            notes: [
                {
                    track: "drums",
                    time: 0,
                    dur: 0.25,
                    midi: 36,
                    name: "c2",
                    velocity: 1,
                    kind: "drum",
                    drum: "kick",
                },
                {
                    track: "drums",
                    time: 0.5,
                    dur: 0.25,
                    midi: 38,
                    name: "d2",
                    velocity: 1,
                    kind: "drum",
                    drum: "snare",
                },
            ],
        });
    });

    it("exports mapped drums as beat", () => {
        const song = mapDrumsSong({
            length: 1,
            notes: [
                { track: "piano", time: 0, dur: 0.25, midi: 36, name: "c2", velocity: 1 },
                { track: "piano", time: 0.5, dur: 0.25, midi: 38, name: "d2", velocity: 1 },
            ],
        });

        expect(normalizeSource(midiToSongSource(song, { step: 0.25 }))).toBe(
            normalizeSource(`
      song(
        beat("kick _ snare").fast(4)
      )
    `)
        );
    });
});
