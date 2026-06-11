# @vibuca/synth8-import-midi

MIDI importer for Synth8.

Converts MIDI files into Synth8 source code.

Example output:

```
song(
  melody("c5/2 d5 e5"),
  melody("c3 _ g2"),
  beat("kick _ snare")
)
```

## Install

```
pnpm add @vibuca/synth8-import-midi
```

## Usage

```
import {
  parseMidi,
  midiToSynth8Source,
} from "@vibuca/synth8-import-midi";

const buffer = await file.arrayBuffer();

const midi = parseMidi(buffer);

const source = midiToSynth8Source(midi, {
  step: "auto",
  mode: "split-piano",
  splitPiano: {
    sourceTracks: ["piano", "track1"],
  },
  mapDrums: true,
  drums: {
    sourceTracks: ["drums"],
  },
  trackOrder: ["lead", "bass", "drums"],
});
```

## Features

* Parses MIDI files
* Exports melody(...)
* Exports beat(...) for mapped drums
* Exports song(...)
* Uses "_" for rests
* Uses "+" for parallel notes/chords
* Supports durations using "/n"
* Beat-based MIDI timing using MIDI ticks/PPQ
* Adaptive quantization with `step: "auto"`
* Optional velocity export using ":0.8"
* Optional sustain-rest compression
* Optional piano splitting into lead/bass
* Optional drum mapping

## API

### parseMidi

```
const song = parseMidi(buffer);
```

Parses a MIDI file into an ImportedMidiSong structure.

Note timing is stored in musical beats, not raw seconds. This keeps imported patterns aligned with Synth8 playback BPM.

### midiToMelodySource

```
const source = midiToMelodySource(song);
```

Exports a single melody track.

### midiToSongSource

```
const source = midiToSongSource(song);
```

Exports all tracks as a Synth8 song.

### midiToSynth8Source

```
const source = midiToSynth8Source(song, {
  mode: "split-piano",
  mapDrums: true,
});
```

High-level export function that can apply transforms before generating Synth8 source.

## Quantization

By default, exporters use a fixed `0.25` beat grid when no `step` is supplied.

For more complex MIDI files, especially dense game music with fast subdivisions or triplet timing, use adaptive quantization:

```
const source = midiToSynth8Source(song, {
  step: "auto",
});
```

`step: "auto"` inspects note onsets and durations and chooses a grid that preserves fast notes instead of collapsing them onto a coarser fixed step. You can still pass a number such as `0.25` when you want strict fixed-grid output.

The exporter encodes the selected grid in the generated Synth8 source. For example, `step: 0.25` produces `.fast(4)` so quarter-beat MIDI slots play back at the intended speed rather than as full Synth8 beats.

## Notes

MIDI import is approximate.

Real-world MIDI files often contain overlapping notes, expressive timing, and piano arrangements that do not map perfectly to a pattern-based DSL.

Imported songs may require manual cleanup for best results.

## License

MIT
