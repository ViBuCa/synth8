# Synth8

Synth8 is an MIT-licensed music DSL and playback toolkit for TypeScript.

🎹 **Live Plaground:** https://vibuca.github.io/synth8/

📦 **Core Package:** @vibuca/synth8-core

🔊 **Player Package:** @vibuca/synth8-player

Inspired by pattern-based composition systems and live-coding environments, Synth8 provides a small declarative language for creating rhythmic and melodic music directly in code.

Synth8 is designed for:

* Games
* Interactive applications
* Procedural music
* Web audio projects
* Creative coding

Unlike many live-coding environments, Synth8 is designed from the ground up for integration into proprietary applications and commercial games.

## Features

### Composition

* Beat patterns
* Melody patterns
* Songs
* Sequences
* Groups
* Chords / parallel notes
* Rests

### Timing

* rate()
* fast()
* slow()
* repeat()
* offset()
* loop()

### Musical Expression

* Velocity
* Duration
* Transposition

### Playback Layers

* Multiple independent layers
* Per-layer waveform selection
* Support for gain, panning
* Future support for effects and instrument banks

### Audio Playback

* Tone.js based playback engine
* Drum synthesizers
* Polyphonic note playback
* Auto playback mode that avoids expensive pre-renders for dense songs
* Rendered loop playback for stable small/medium loops
* Optional live scheduling mode for interactive playback
* Prepare/start flow for game loading screens
* Pause, resume and stop controls

## Example

```ts
import { compile } from "@vibuca/synth8-core";
import { pause, play, prepare, resume, stop } from "@vibuca/synth8-player";

const pattern = compile(`
song(
  melody("c5 e5 g5 c6")
    .sound("square")
    .gain(0.4)
    .pan(-0.6),

  melody("c3 g3 c3 g3")
    .sound("triangle")
    .gain(0.6)
    .pan(0.6),

  beat("kick hihat snare hihat")
    .gain(0.5)
    .loop()
)
`);

await play(pattern, { bpm: 120 });

pause();
resume();
stop();
```

By default, playback uses `playbackMode: "auto"`. Small and medium patterns are pre-rendered into a looping audio buffer. Dense patterns use live playback to avoid long loading pauses.

For game loading screens, prepare music first and start it when the level begins:

```ts
const music = await prepare(pattern, { bpm: 120 });

await loadLevelAssets();

music.start();
startLevel();
```

For more immediate live synthesis, pass `playbackMode: "live"`:

```ts
await play(pattern, { bpm: 120, playbackMode: "live" });
```

The playground includes a playback mode switch so auto, rendered and live playback can be compared in the browser.

## Packages

| Package                    | Description                           |
| -------------------------- | ------------------------------------- |
| @vibuca/synth8-core        | Parser, AST and compiler              |
| @vibuca/synth8-player      | Tone.js playback engine               |
| @vibuca/synth8-import-midi | Midi importer for synth8              |
| Playground                 | Browser-based development environment |

## Current Status

Implemented:

* Parser
* AST
* Compiler
* Repeat
* Offset
* Looping
* Sequence composition
* Velocity
* Durations
* Transposition
* Layered playback model
* Waveform selection
* Gain
* Tone.js player
* Drum synthesizers
* Test suite
* Panning

Planned:

* Instrument banks
* Effects
* MIDI export
* Editor package
* Phaser examples
* Procedural composition helpers
