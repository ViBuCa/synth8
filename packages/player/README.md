# @vibuca/synth8-player

Tone.js player for Synth8 patterns.

This package plays compiled patterns produced by @vibuca/synth8-core.

All musical structure such as repeats, sequences, offsets, durations, transposition and looping is resolved during compilation. The player receives fully compiled events with absolute timing information.

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

## Example

```ts
const pattern = compile(`
  song(
    sequence(
      melody("d4/2 f#4 a4 c5"),
      melody("g4+b4 f#4+a4 e4+g4 d4+f#4")
    ),

    beat("kick _ snare _").loop(),
    beat("_ hihat _ hihat").fast(2).loop(),

    melody("d2 _ a1 _").loop()
  )
`);

await play(pattern, { bpm: 110 });
```

## Note
The player currently provides a built-in Tone.js playback engine.

Future Synth8 releases may support additional playback configuration such as waveform selection, instrument banks and effects while keeping the compiled event format stable.

## License

MIT
