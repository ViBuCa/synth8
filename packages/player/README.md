# @vibuca/player

Tone.js player for Synt8 patterns.

This package plays patterns compiled by `@vibuca/core`.

## Install

```bash
npm install @vibuca/core @vibuca/player
```

## Usage

```ts
import { compile } from "@vibuca/core";
import { play, stop } from "@vibuca/player";

const pattern = compile(`
  song(
    beat("kick+hihat snare hihat snare"),
    melody("c4 e4 g4 e4")
  )
`);

await play(pattern, { bpm: 120 });

// later
stop();
```

## API

### `play(pattern, options)`

Plays a compiled Synt8 pattern.

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

## Supported events

`@vibuca/player` supports:

```ts
{ type: "drum", value: "kick" }
{ type: "note", value: "c4" }
```

Drums are synthesized with Tone.js percussion voices.

Notes are played with a Tone.js synth.

## License

MIT
