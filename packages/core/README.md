# @vibuca/synth8-core

Core parser and compiler for Synth8, an MIT-licensed pattern music toolkit written in TypeScript.

Synth8 defines a small music DSL for rhythmic and melodic pattern composition.

## Install

```bash
npm install @vibuca/synth8-core
```

## Usage

```ts
import { compile } from "@vibuca/synth8-core";

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

### Duration

```ts
beat("kick/2 snare hihat")
melody("c4/2 d4 e4")
```

Durations are expressed in beats.

```ts
melody("c4:0.5/2 d4")
```

Velocity and duration can be combined on the same note or drum hit.

A duration of 1 is implied when omitted.

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

### Repeat

```ts
beat("kick snare").repeat(4)
melody("c4 e4 g4").repeat(2)
```

### Offset

```ts
beat("kick snare").offset(4)
melody("c4 e4 g4").offset(8)
```

### Sequence

```ts
sequence(
  beat("kick snare"),
  beat("hihat hihat")
)
```
Patterns inside a sequence are played one after another.

```ts
sequence(
  melody("c4 d4"),
  melody("e4 f4")
)
```
Sequences support the same structural modifiers as tracks:
```ts
sequence(
  beat("kick snare"),
  beat("hihat hihat")
).repeat(2)

sequence(
  melody("c4 d4"),
  melody("e4 f4")
).offset(4)
```


### Looping

```ts
song(
  beat("kick _ snare _").loop(),
  melody("c4 d4 e4 f4")
)
```

Looping is performed at song compilation time.

Tracks marked with `.loop()` are repeated until the longest track in the song has completed.

Looping does not modify the Event model. Events remain simple timing and musical data:

- time
- dur
- type
- value
- optional velocity

## Output

`compile()` returns:

```ts
type Pattern = {
  length: number;
  events: Event[];
};
```

length represents the total pattern length in beats.

Events contain absolute timing information after all modifiers, repeats, offsets, sequences and loops have been compiled.

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
