# @vibuca/synth8-player

Tone.js player for Synth8 patterns.

This package plays compiled patterns produced by @vibuca/synth8-core.

All musical structure such as repeats, sequences, offsets, durations, transposition and looping is resolved during compilation. The player receives fully compiled events with absolute timing information.

🎹 **Live Plaground:** https://vibuca.github.io/synth8/

## Install

```bash
npm install @vibuca/synth8-core @vibuca/synth8-player
```

## Usage

```ts
import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

const pattern = compile(`
  song(
    sequence(
      melody("c4/2 e4 g4"),
      melody("f4 a4 c5")
    ).repeat(2),

    beat("kick _ snare _").loop(),
    beat("_ hihat _ hihat").fast(2).loop()
  )
`);

await play(pattern, { bpm: 120 });

// later
stop();
```

## API

### `play(pattern, options)`

Plays a compiled Synth8 pattern.

```ts
play(pattern, { bpm: 120 });
```

Options:

```ts
type PlayOptions = {
  bpm: number;
};
```

### `stop()`

Stops playback.

```ts
stop();
```

## Timing

Synth8 events use beat-based timing.

Playback speed is controlled via the bpm option passed to play().

Example:
```ts
play(pattern, { bpm: 90 });
play(pattern, { bpm: 120 });
play(pattern, { bpm: 160 });
```

## Supported event types

```ts
{ type: "drum", value: "kick" }
{ type: "note", value: "c4" }
```

Velocity is supported when present:

```ts
{ type: "note", value: "c4", velocity: 0.5 }
```
The player automatically creates separate Tone.js synthesizers for each layer.

## Supported waveforms
```ts
sine
triangle
square
sawtooth
```

## Layer playback
Synth8 patterns may contain multiple playback layers.

Each layer can define its own playback configuration:
```ts
melody("c4 e4 g4").sound("triangle")
melody("c3 g3").sound("sawtooth")
melody("c5 d5 e5").sound("square")
```

## Event Structure
The player consumes compiled events:
```ts
{
  time: 0,
  dur: 1,
  type: "note",
  value: "c4"
}
```
Velocity is optional:
```ts
{
  time: 0,
  dur: 1,
  type: "note",
  value: "c4",
  velocity: 0.5
}
```

## Compilation
Typical workflow:

```ts
import { compile } from "@vibuca/synth8-core";
import { play } from "@vibuca/synth8-player";

const pattern = compile(source);

await play(pattern, { bpm: 120 });
```
The player intentionally does not parse Synth8 source code directly. Source code is compiled by @vibuca/synth8-core first.

## Playback configuration
Playback configuration is stored on pattern layers rather than individual events.

### Example:
```ts
{
  playback: {
    sound: "triangle"
  },
  events: [...]
}
```
This allows multiple tracks in the same song to use different synthesizer waveforms while keeping the event model simple.

### Gain

The player supports layer gain compiled by `@vibuca/synth8-core`.

```ts
song(
  melody("c5 e5 g5").sound("square").gain(0.7),
  melody("c2 _ g1 _").sound("triangle").gain(0.4)
)
```

The player applies gain per layer, so different melodies, bass lines and drum tracks can be mixed independently.

## Example

```ts
const pattern = compile(`
  song(
    melody("d5/2 c#5/2 d5/2 _ a4/2 g4/2 f4/2 e4/2")
      .sound("square")
      .gain(0.45),

    melody("d3/2 _ a2/2 _")
      .sound("triangle")
      .gain(0.65)
      .loop(),

    beat("kick _ _ _ snare _ _ _")
      .gain(0.55)
      .loop()
  )
`);

await play(pattern, { bpm: 110 });
```

## Note
The player currently provides a built-in Tone.js playback engine.

Playback configuration currently supports waveform selection.

Future releases may add gain, panning, effects and instrument banks without changing the compiled event format.

## License

MIT
