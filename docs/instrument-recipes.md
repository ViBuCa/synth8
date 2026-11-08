# Synth8 Instrument Recipes

These examples define reusable Synth8 instruments with `instruments(...)` and `.instrument("name")`. They are based on common subtractive-synthesis recipes: sub oscillators for bass weight, detuned saws for width, pulse/square waves for bite, and filtered triangle/sine layers for softer tones.

Use them as starting points, then adjust `.gain()`, `.cutoff()`, `.resonance()`, `.distortion()`, `.chorus()`, and envelopes to fit your song.

## Fat Sub Bass

**Sound:** Deep, solid low end with a saw edge that still reads on small speakers. Useful for action loops, cyberpunk bass lines, and heavy game levels.

```ts
instrument("fat bass")
  .osc("sine", -12, 0.38)
  .osc("triangle", 0, 0.42)
  .osc("sawtooth", 0, 0.18)
  .attack(0.002)
  .decay(0.12)
  .sustain(0.78)
  .release(0.10)
  .cutoff(1200)
  .resonance(0.12)
  .distortion(0.18)
```

## Silent / Menu Bass

**Sound:** A restrained version of the bass for menus, pause screens, or lower-intensity game states. Keeps the harmonic theme while reducing impact.

```ts
instrument("silent bass")
  .osc("sine", -12, 0.32)
  .osc("triangle", 0, 0.30)
  .attack(0.01)
  .decay(0.18)
  .sustain(0.55)
  .release(0.35)
  .cutoff(650)
  .gain(0.45)
```

## Acid Bass

**Sound:** Nasal, resonant, animated bass. Works well for fast arpeggiated or repeated notes.

```ts
instrument("acid bass")
  .osc("sawtooth", 0, 0.7)
  .osc("pulse25", 0, 0.25)
  .attack(0.001)
  .decay(0.08)
  .sustain(0.35)
  .release(0.07)
  .cutoff(1700)
  .resonance(0.45)
  .distortion(0.22)
```

## Detuned Saw Lead

**Sound:** Wide, bright lead inspired by classic supersaw patches, but kept small enough for game playback.

```ts
instrument("detuned lead")
  .osc("sawtooth", 0, 0.38, -7)
  .osc("sawtooth", 0, 0.38, 7)
  .osc("square", 0, 0.16)
  .attack(0.006)
  .decay(0.16)
  .sustain(0.72)
  .release(0.28)
  .cutoff(5200)
  .chorus(0.22)
  .echo(0.14)
```

## Glass Lead

**Sound:** Clear, bell-like lead for melodies that should sit above the mix without much distortion.

```ts
instrument("glass lead")
  .osc("sine", 0, 0.55)
  .osc("triangle", 12, 0.20)
  .osc("pulse12", 0, 0.12)
  .attack(0.004)
  .decay(0.22)
  .sustain(0.24)
  .release(0.38)
  .echo(0.20)
  .reverb(0.16)
```

## Warm Pad

**Sound:** Soft chord bed with slow onset and gentle motion. Good for overworld maps, calm exploration, and menus.

```ts
instrument("warm pad")
  .osc("sawtooth", 0, 0.30, -6)
  .osc("sawtooth", 0, 0.30, 6)
  .osc("triangle", 0, 0.25)
  .attack(0.55)
  .decay(0.35)
  .sustain(0.70)
  .release(1.20)
  .cutoff(1800)
  .chorus(0.45)
  .reverb(0.20)
  .gain(0.55)
```

## Dark Pad

**Sound:** Muted, tense atmosphere for caves, stealth, or suspense scenes.

```ts
instrument("dark pad")
  .osc("triangle", 0, 0.42)
  .osc("sawtooth", -12, 0.18)
  .osc("sine", 12, 0.12)
  .attack(0.80)
  .decay(0.45)
  .sustain(0.55)
  .release(1.80)
  .cutoff(1050)
  .chorus(0.38)
  .reverb(0.24)
  .gain(0.38)
```

## Synth Brass Stab

**Sound:** Short, confident saw/square stab for accents, victory cues, and retro brass chords.

```ts
instrument("brass stab")
  .osc("sawtooth", 0, 0.52)
  .osc("square", 0, 0.22)
  .osc("sawtooth", 12, 0.10)
  .attack(0.025)
  .decay(0.18)
  .sustain(0.45)
  .release(0.20)
  .cutoff(2600)
  .resonance(0.18)
  .chorus(0.16)
```

## Arcade Pluck

**Sound:** Short, bright, percussive synth useful for arpeggios, UI motifs, and chiptune-like sequences.

```ts
instrument("arcade pluck")
  .osc("pulse25", 0, 0.55)
  .osc("triangle", 12, 0.20)
  .attack(0.001)
  .decay(0.09)
  .sustain(0.04)
  .release(0.07)
  .cutoff(4200)
  .echo(0.10)
```

## Noise Riser / Hit Layer

**Sound:** Noisy transient layer for impacts, risers, or percussion-like accents. Since `noise` ignores pitch, use short note patterns and envelope shaping.

```ts
instrument("noise hit")
  .sound("noise")
  .attack(0.001)
  .decay(0.08)
  .sustain(0.0)
  .release(0.05)
  .highpass(1400)
  .gain(0.22)
```

## Full Usage Example

```ts
instruments(
  instrument("fat bass")
    .osc("sine", -12, 0.38)
    .osc("triangle", 0, 0.42)
    .osc("sawtooth", 0, 0.18)
    .cutoff(1200)
    .distortion(0.18),

  instrument("detuned lead")
    .osc("sawtooth", 0, 0.38, -7)
    .osc("sawtooth", 0, 0.38, 7)
    .osc("square", 0, 0.16)
    .cutoff(5200)
    .chorus(0.22),

  song(
    melody("c2 c2 g1 c2 eb2 eb2 bb1 eb2")
      .instrument("fat bass")
      .loop(),

    melody("c5 eb5 g5 bb5 g5 eb5 d5 c5")
      .instrument("detuned lead")
      .gain(0.55),

    beat("kick _ snare _")
      .bank("909")
      .loop()
  )
)
```
