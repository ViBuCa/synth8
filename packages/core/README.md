# @vibuca/synth8-core

Core parser and compiler for Synth8, an MIT-licensed pattern music toolkit written in TypeScript.

Synth8 defines a small music DSL for rhythmic and melodic patterns.

## Install

```bash
npm install @vibuca/synth8-core
```

## Usage

```ts
import { compile } from "@vibuca/synth8-core";

const pattern = compile(`
  song(
    beat("kick+hihat _ snare hihat"),
    melody("c4+e4+g4 f4").transpose(12)
  )
`);

console.log(pattern);
```

## Syntax

### Beats

```ts
beat("kick snare hihat hihat")
```

### Melody

```ts
melody("c4 e4 g4 _")
```

### Song

```ts
song(
  beat("kick snare"),
  melody("c4 e4")
)
```

### Rests

```ts
beat("kick _ snare")
melody("c4 _ e4")
```

### Groups

```ts
beat("kick [snare hihat] kick")
melody("c4 [e4 g4] c5")
```

### Parallel hits and chords

```ts
beat("kick+hihat snare")
melody("c4+e4+g4 f4")
```

### Velocity

```ts
beat("kick:1 snare:0.7 hihat:0.4")
melody("c4:1 e4:0.6 g4:0.3")
```

### Timing modifiers

```ts
beat("kick snare").fast(2)
beat("kick snare").slow(2)
melody("c4 e4").rate(2)
```

### Transpose

```ts
melody("c4 e4 g4").transpose(12)
melody("c5 e5 g5").transpose(-12)
```

`transpose()` uses semitones and is only supported on melody patterns.

## Output

`compile()` returns:

```ts
type Pattern = {
  length: number;
  events: Event[];
};
```

Events are stored in beats, not seconds.

```ts
type Event =
  | {
      time: number;
      dur: number;
      type: "drum";
      value: string;
      velocity?: number;
    }
  | {
      time: number;
      dur: number;
      type: "note";
      value: string;
      velocity?: number;
    };
```

## Supported drum sounds

```txt
kick
snare
clap
hihat
openhat
tom
rim
cowbell
```

Use `_` for rests.

## Note names

Synth8 supports note names like:

```txt
c4
c#4
db4
f#5
bb3
```

Use `#` and `b` for accidentals.

## License

MIT
