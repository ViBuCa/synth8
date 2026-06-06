# @vibuca/synth8-core

Core parser and compiler for Synt8, an MIT-licensed pattern music toolkit written in TypeScript.

Synt8 defines its own small pattern DSL for rhythmic and melodic music patterns.

## Install

```bash
npm install @vibuca/synth8-core
```

## Usage

```ts
import { compile } from "@vibuca/synth8-core";

const pattern = compile(`
  song(
    beat("kick+hihat snare hihat snare"),
    melody("c4 e4 g4 _")
  )
`);

console.log(pattern);
```

## Supported syntax

### Beat patterns

```ts
beat("kick snare hihat hihat")
```

### Melody patterns

```ts
melody("c4 e4 g4 _")
```

### Songs

```ts
song(
  beat("kick snare"),
  melody("c4 e4")
)
```

### Rate

```ts
beat("kick snare").rate(2)
melody("c4 e4 g4").rate(2)
```

### Rests

```ts
beat("kick _ snare hihat")
melody("c4 _ e4 g4")
```

### Groups

```ts
beat("kick [snare hihat] kick")
melody("c4 [e4 g4] c5")
```

### Parallel drum hits

```ts
beat("kick+hihat snare hihat snare")
```

## Output

`compile()` returns a pattern:

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
    }
  | {
      time: number;
      dur: number;
      type: "note";
      value: string;
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

## License

MIT
