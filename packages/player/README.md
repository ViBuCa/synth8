# @vibuca/synth8-player

Tone.js player for Synth8 patterns.

This package plays patterns compiled by `@vibuca/synth8-core`.

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
    beat("kick+hihat _ snare hihat"),
    melody("c4+e4+g4 f4").transpose(12)
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

## Supported event types

```ts
{ type: "drum", value: "kick" }
{ type: "note", value: "c4" }
```

Velocity is supported when present:

```ts
{ type: "note", value: "c4", velocity: 0.5 }
```

## Example

```ts
const pattern = compile(`
  song(
    beat("kick+hihat _ snare hihat"),
    melody("c4 e4 g4 c5"),
    melody("c3+g3 _ f3+a3 _")
  )
`);

await play(pattern, { bpm: 110 });
```

## License

MIT
