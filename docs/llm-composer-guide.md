# Synth8 LLM Composer Guide

Copy this file, or the prompt block below, into an LLM chat when you want the model to compose Synth8 music for you.

## Copy/paste prompt

```text
You are composing music in Synth8, a compact TypeScript music DSL for game-style pattern music.

Your task:
- Write a complete Synth8 source snippet.
- Return only the Synth8 source in one code block unless I ask for explanation.
- Prefer short, loopable game-music phrases.
- Use clear layers: drums, bass, chords/pad, lead/melody, optional countermelody or SFX-like accents.
- Keep it playable and valid according to the syntax below.

Core syntax:
- beat("...") creates a drum pattern.
- melody("...") creates a pitched note pattern.
- song(a, b, c) plays patterns/layers in parallel.
- sequence(a, b, c) plays patterns one after another.
- Comments are allowed between expressions: // line comment and /* block comment */.
- Strings can use double quotes or single quotes.

Pattern tokens:
- Tokens are separated by whitespace.
- _ is a rest/silence.
- Use + inside one token for simultaneous hits/chords: kick+hihat or c4+e4+g4.
- Notes use pitch plus octave: c4, d#4, eb4, f#5, bb3. Supported octaves: 0 through 8.
- Duration suffix: /number. Example: c4/2 lasts 2 steps; c4/0.5 lasts half a step.
- Velocity suffix: :number from 0 to 1. Example: hihat:0.35 or c4:0.7.
- If combining velocity and duration, use value:velocity/duration, e.g. c4:0.7/2.

Valid drums:
- kick, snare, clap, hihat, openhat
- tom, lowtom, midtom, hitom
- rim, cowbell, crash, ride, tambourine, shaker

Timing modifiers:
- .fast(n): plays n times faster. Example: .fast(2) halves durations.
- .slow(n): plays n times slower.
- .rate(n): exact speed multiplier.
- .repeat(n): repeats the pattern n times before continuing.
- .offset(n): delays the layer by n beats; fractions are allowed, e.g. .offset(0.5).
- .loop(): inside song(), repeats a shorter layer until the song length.

Melody-only modifiers:
- .transpose(semitones): integer semitone transposition. Example: .transpose(12).
- .arp("up"), .arp("down"), .arp("updown"): turns chord tokens into fast arpeggios.

Playback/layer modifiers:
- .sound("sine" | "triangle" | "square" | "sawtooth")
- .preset("chip-lead" | "chip-bass" | "soft-pad" | "metal-rhythm" | "arcade-pluck" | "deep-bass" | "warm-pad" | "glass-lead")
- .bank("default" | "808" | "909" | "arcade" | "chip") for drum character
- .gain(0..1)
- .pan(-1..1)

Envelope modifiers:
- .attack(seconds), .decay(seconds), .release(seconds): 0 to 30
- .sustain(level): 0 to 1

Effects:
- .delay(seconds): 0 to 2
- .echo(amount), .room(amount), .reverb(amount), .distortion(amount), .chorus(amount): 0 to 1
- .lowpass(hz), .highpass(hz): 20 to 20000

Semantics:
- song(...) layers play together.
- sequence(...) parts play one after another.
- Top-level playback loops the compiled pattern.
- In song(...), .loop() on a shorter layer repeats that layer to match the longest layer.
- For stable game loops, make drums/bass/chords .loop(), and let a lead sequence determine song length.
- Prefer 4, 8, 16, 32, or 64 beat structures.
- Good default BPM ranges: 90-120 relaxed, 120-150 energetic, 150-190 arcade/action.

Style tips:
- Use a bass layer such as c2 _ g1 _ or c2 c2 g1 _.
- Use drums like beat("kick _ snare _") plus a separate hihat layer .fast(2).
- Use chords like c4+e4+g4, f4+a4+c5, g4+b4+d5.
- Use .arp("up") or .arp("updown") for chiptune fake chords.
- Use .gain() to keep layers balanced; leads often 0.35-0.7, pads 0.2-0.5, bass 0.5-0.9, drums 0.3-0.8.

Example valid output:
song(
  // lead
  sequence(
    melody("c5 e5 g5 c6").preset("chip-lead"),
    melody("d5 f5 a5 d6").preset("chip-lead"),
    melody("e5 g5 b5 e6").preset("chip-lead"),
    melody("g5 e5 d5 c5").preset("chip-lead")
  ).repeat(2),

  // bass loop
  melody("c2 _ g1 _ a1 _ g1 _")
    .preset("deep-bass")
    .gain(0.75)
    .loop(),

  // chord/pad loop
  melody("c4+e4+g4 _ f4+a4+c5 _ g4+b4+d5 _ c4+e4+g4 _")
    .preset("warm-pad")
    .gain(0.35)
    .loop(),

  // drums
  beat("kick _ snare _")
    .bank("909")
    .gain(0.65)
    .loop(),

  beat("_ hihat _ hihat")
    .bank("chip")
    .fast(2)
    .gain(0.25)
    .loop()
)
```

## Quick syntax reference

### Expressions

```ts
beat("kick _ snare _")
melody("c4 e4 g4 c5")
sequence(melody("c4 e4"), melody("g4 c5"))
song(beat("kick _ snare _"), melody("c4 e4 g4 c5"))
```

### Notes, rests, chords, and drums

```ts
melody("c4 d4 e4 _")              // notes and rest
melody("c4+e4+g4 _ f4+a4+c5")    // chords
beat("kick+hihat _ snare _")      // stacked drum hits
```

### Durations and velocity

```ts
melody("c4/2 d4 e4/0.5")          // longer and shorter notes
melody("c4:0.4 d4:0.7 e4:1")      // note velocity
beat("kick:1 hihat:0.25 snare:0.8")
```

When combining velocity and duration, put velocity first:

```ts
melody("c4:0.7/2")
```

### Useful layer recipes

```ts
// basic drums
beat("kick _ snare _").loop()
beat("_ hihat _ hihat").fast(2).gain(0.25).loop()

// bass
melody("c2 _ g1 _ a1 _ g1 _").preset("deep-bass").loop()

// pad chords
melody("c4+e4+g4 _ f4+a4+c5 _").preset("warm-pad").gain(0.35).loop()

// chiptune arpeggio chords
melody("c4+e4+g4 f4+a4+c5 g4+b4+d5")
  .arp("updown")
  .preset("arcade-pluck")
  .fast(2)
```

## Constraints for generated music

- Avoid unsupported note names like `h4`.
- Avoid unsupported drum names like `hat`; use `hihat` or `openhat`.
- Do not use empty patterns like `melody("")` or `beat("")`.
- Keep `.gain()` between `0` and `1`.
- Keep `.pan()` between `-1` and `1`.
- Use `.bank(...)` mainly on `beat(...)` layers.
- Use `.preset(...)` mainly on `melody(...)` layers.
- If using many dense layers, prefer shorter loops or simpler hihat/arpeggio parts.

## Example requests you can ask an LLM

```text
Write a 32-beat optimistic chiptune loop at 150 BPM for a platformer overworld. Use Synth8 only.
```

```text
Write a dark 16-beat dungeon loop with sparse drums, deep bass, and an eerie lead. Use Synth8 only.
```

```text
Write three Synth8 sound effects: coin, laser, and explosion. Keep each under 2 seconds at 180 BPM.
```

```text
Make this Synth8 song more energetic by adding drums, bass movement, and a countermelody, but keep it valid.
```
