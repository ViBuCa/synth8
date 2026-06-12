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
      melody("c4/2 e4 g4").sound("triangle"),
      melody("f4 a4 c5").sound("square")
    ).repeat(2),

    beat("kick _ snare _").loop(),
    melody("c2 _ g1 _").sound("sawtooth").loop()
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

### Gain

```ts
melody("c4 e4 g4").gain(0.5)
beat("kick _ snare _").gain(0.7)
```

gain() controls the volume of a compiled playback layer.

It uses a value between 0 and 1:

```ts
0   = silent
0.5 = half volume
1   = full volume
```

Gain is layer-level playback information. It does not modify events.

Velocity controls individual notes or hits. Gain controls the whole layer.

## Pan

Use `.pan(value)` to place a layer in the stereo field.

```ts
melody("c4 e4 g4").pan(-0.5) // left
melody("c3 g3 c4").pan(0.5)  // right
```

Pan values use the range:

-1 full left
0 center
1 full right

Pan is stored on the layer playback config. It is not stored on individual events.

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
### Sound

```ts
melody("c4 e4 g4").sound("triangle")
melody("c4 e4 g4").sound("sine")
melody("c4 e4 g4").sound("square")
melody("c4 e4 g4").sound("sawtooth")
```
sound() stores playback information on the compiled pattern layer.

It does not modify events.

Supported sounds:
```ts
sine
triangle
square
sawtooth
```

### Envelope

Use envelope modifiers to shape melodic synth notes:

```ts
melody("c4 e4 g4")
  .sound("triangle")
  .attack(0.02)
  .decay(0.15)
  .sustain(0.5)
  .release(0.4)
```

`attack()`, `decay()`, and `release()` use seconds from `0` to `30`.

`sustain()` uses a level from `0` to `1`.

Envelope values are stored on the compiled layer playback config. They do not modify individual events.

### Presets

Use `.preset(name)` to apply a named playback preset to a layer:

```ts
melody("c5 e5 g5 c6").preset("chip-lead")
melody("c2 _ g1 _").preset("chip-bass")
melody("c4 e4 g4 c5").preset("soft-pad")
melody("c4+g4 _ eb4+bb4 _").preset("metal-rhythm")
melody("c6 g5 e5 c5").preset("arcade-pluck")
```

Supported presets:

```ts
chip-lead
chip-bass
soft-pad
metal-rhythm
arcade-pluck
```

Presets are stored on the compiled layer playback config. Explicit modifiers such as `.sound()` or `.release()` can override preset defaults during playback.

### Banks

Use `.bank(name)` to choose a broader instrument family for a layer. Banks are especially useful for drums:

```ts
beat("kick _ snare _").bank("808")
beat("_ hihat _ hihat").fast(2).bank("arcade")
```

Supported banks:

```ts
default
808
arcade
```

`808` is inspired by classic synthesized drum machines, with rounder, longer drum envelopes.

`arcade` is short and clicky, closer to retro game sound effects.

Banks are stored on the compiled layer playback config. They do not modify individual events.

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
  loopLength: number;
  events: Event[];
  loop: boolean;
  layers: PatternLayer[];
};

type PatternLayer = {
  events: Event[];
  playback?: PlaybackConfig;
};

type PlaybackConfig = {
  sound?: "sine" | "triangle" | "square" | "sawtooth";
};
```

length represents the total pattern length in beats.

Events contain absolute timing information after all modifiers, repeats, offsets, sequences and loops have been compiled.

Events are stored in beats, not seconds.

events is kept for compatibility and contains all compiled events.

layers preserves track-level playback information such as sound selection. Players should prefer layers when available.

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
lowtom
midtom
hitom
rim
cowbell
crash
ride
tambourine
shaker
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
