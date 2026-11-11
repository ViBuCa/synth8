# Synth8 Instrument Recipes

These examples define reusable Synth8 instruments with `instruments(...)` and `.instrument("name")`. They are based on common subtractive-synthesis recipes: harmonically rich oscillators, low-pass filtering, amplitude envelopes, detune/chorus for ensemble width, and controlled distortion for edge.

I checked public references while tuning these recipes:

- [Subtractive synthesis](https://en.wikipedia.org/wiki/Subtractive_synthesis): start from overtone-rich sources such as square/triangle/noise and attenuate harmonics with filters; ADSR envelopes shape the resulting sound.
- [Roland TB-303](https://en.wikipedia.org/wiki/Roland_TB-303): classic acid bass uses sawtooth or square waves into a resonant 24 dB/oct low-pass filter controlled by an envelope.
- [Supersaw](https://en.wikipedia.org/wiki/Supersaw): the classic wide lead/trance sound emulates multiple detuned sawtooth oscillators.
- [Sound On Sound — Synthesizing Strings: String Machines](https://www.soundonsound.com/techniques/synthesizing-strings-string-machines): string-machine-style patches rely on saw waves, detune/ensemble movement, partly closed low-pass filters, and slow amplitude contours.
- [Sound On Sound — Synthesizing Brass Instruments](https://www.soundonsound.com/techniques/synthesizing-brass-instruments): synth brass benefits from bright waveforms, quick attacks, evolving harmonic brightness, and filter/resonance changes.
- [Low-frequency oscillation](https://en.wikipedia.org/wiki/Low-frequency_oscillation): an LFO is a slow control signal commonly used for vibrato, tremolo, and filter movement; Synth8's `.lfo(...)` currently targets pitch or cutoff.
- [Chiptune](https://en.wikipedia.org/wiki/Chiptune): classic game sounds make expressive use of simple pulse/square waveforms, short patterns, and pitch movement. The recipes here are modern Synth8 approximations, not hardware emulations.

Use these as starting points, then adjust `.gain()`, `.cutoff()`, `.resonance()`, `.distortion()`, `.chorus()`, and envelopes to fit your song. Recipes intentionally stay within Synth8's current oscillator, filter, envelope, and effect features: for example, the mallet patch is layered sine/triangle synthesis, not FM, and the organ is an oscillator-stack approximation rather than a modeled drawbar organ.

## Fat Sub Bass

**Sound:** Deep, solid low end with a saw edge that still reads on small speakers. The sine sub carries weight, triangle adds body, and a quiet saw layer adds harmonics before filtering/distortion. Useful for action loops, cyberpunk bass lines, and heavy game levels.

```ts
instrument("fat bass")
  .osc("sine", -12, 0.40)
  .osc("triangle", 0, 0.40)
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

**Sound:** A restrained version of the bass for menus, pause screens, or lower-intensity game states. The sine sub adds weight, while a triangle at the played pitch and a quiet octave-above triangle provide harmonics that remain audible on small speakers. A pure low sine can be almost inaudible on laptop/phone speakers because it has no upper harmonics and its fundamental may be below the speaker's useful range.

```ts
instrument("silent bass")
  .osc("sine", -12, 0.24)
  .osc("triangle", 0, 0.42)
  .osc("triangle", 12, 0.16)
  .attack(0.01)
  .decay(0.18)
  .sustain(0.55)
  .release(0.35)
  .cutoff(1100)
  .gain(0.55)
```

## Acid Bass

**Sound:** Nasal, resonant, animated bass inspired by TB-303-style patches: saw/square-family waveforms, short envelope, resonant low-pass filter, and a little drive. Works well for fast repeated notes and slides.

```ts
instrument("acid bass")
  .osc("sawtooth", 0, 0.68)
  .osc("square", 0, 0.22)
  .attack(0.001)
  .decay(0.075)
  .sustain(0.32)
  .release(0.06)
  .cutoff(1650)
  .resonance(0.50)
  .distortion(0.24)
```

## Rounded 303 Bass

**Sound:** A slightly softer acid/bassline patch using pulse instead of full square and less drive. Good when the bass should move rhythmically without dominating the mix.

```ts
instrument("rounded 303")
  .osc("sawtooth", 0, 0.58)
  .osc("pulse25", 0, 0.26)
  .attack(0.001)
  .decay(0.11)
  .sustain(0.42)
  .release(0.08)
  .cutoff(1350)
  .resonance(0.36)
  .distortion(0.12)
```

## Disco-Funk Filter Bass

**Sound:** Punchy funk/disco bass with a per-note filter pop. The filter envelope opens quickly and falls back to a darker sustain, creating a wah-like transient.

```ts
instrument("disco funk bass")
  .osc("sawtooth", 0, 0.62)
  .osc("square", 0, 0.22)
  .osc("sine", -12, 0.18)
  .attack(0.003)
  .decay(0.14)
  .sustain(0.42)
  .release(0.07)
  .filterEnvelope(420, 2400, 0.012, 0.13, 680, 0.08)
  .resonance(0.36)
  .distortion(0.08)
```

## Cosmic LFO Bass

**Sound:** Slow sci-fi bass with continuous filter drift and delayed vibrato. Useful for space, underwater, or alien ambience.

```ts
instrument("cosmic bass")
  .osc("sawtooth", 0, 0.34, -6)
  .osc("sawtooth", 0, 0.34, 6)
  .osc("sine", -12, 0.32)
  .attack(0.08)
  .decay(0.45)
  .sustain(0.78)
  .release(0.70)
  .cutoff(1100)
  .resonance(0.42)
  .vibrato(0.45, 0.10, 0.35)
  .lfo("cutoff", 0.28, 0.50, "triangle")
  .chorus(0.25)
  .reverb(0.15)
```

## Amiga Crunch Bass

**Sound:** Tracker-like synth-rock bass. The patch is still synthesized, but light bit-depth reduction and drive push it toward a crunchy vintage sample character.

```ts
instrument("amiga crunch bass")
  .osc("sawtooth", 0, 0.62)
  .osc("triangle", 0, 0.32)
  .osc("sine", -12, 0.20)
  .attack(0.004)
  .decay(0.16)
  .sustain(0.62)
  .release(0.09)
  .cutoff(820)
  .resonance(0.10)
  .distortion(0.24)
  .bitcrush(7)
```

## Detuned Saw Lead

**Sound:** Wide, bright lead inspired by classic supersaw patches. Multiple saw oscillators are slightly detuned around the center pitch, with a square layer for bite.

```ts
instrument("detuned lead")
  .osc("sawtooth", 0, 0.28, -11)
  .osc("sawtooth", 0, 0.34, 0)
  .osc("sawtooth", 0, 0.28, 11)
  .osc("square", 0, 0.12)
  .attack(0.006)
  .decay(0.16)
  .sustain(0.72)
  .release(0.28)
  .cutoff(5200)
  .chorus(0.22)
  .echo(0.14)
```

## Anthem Lead

**Sound:** Wider and smoother than `detuned lead`, intended for long melodic hooks. It keeps distortion low and uses more release/echo so notes connect musically.

```ts
instrument("anthem lead")
  .osc("sawtooth", 0, 0.32, -8)
  .osc("sawtooth", 0, 0.32, 8)
  .osc("triangle", 0, 0.16)
  .attack(0.012)
  .decay(0.22)
  .sustain(0.82)
  .release(0.62)
  .cutoff(4800)
  .distortion(0.10)
  .chorus(0.34)
  .echo(0.26)
```

## Glass Lead

**Sound:** Clear, bell-like lead for melodies that should sit above the mix without much distortion. The octave triangle adds shimmer while the sine keeps the center clean.

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

**Sound:** Soft chord bed with slow onset and gentle motion. Detuned saws provide string-machine-style movement; triangle softens the center. Good for overworld maps, calm exploration, and menus.

```ts
instrument("warm pad")
  .osc("sawtooth", 0, 0.28, -7)
  .osc("sawtooth", 0, 0.28, 7)
  .osc("triangle", 0, 0.24)
  .attack(0.60)
  .decay(0.35)
  .sustain(0.72)
  .release(1.25)
  .cutoff(1800)
  .chorus(0.48)
  .reverb(0.20)
  .gain(0.55)
```

## String Machine

**Sound:** Brighter, more synthetic ensemble pad. This intentionally keeps a saw buzz but rounds it with a partly closed filter and strong chorus.

```ts
instrument("string machine")
  .osc("sawtooth", 0, 0.30, -9)
  .osc("sawtooth", 0, 0.30, 9)
  .osc("sawtooth", 12, 0.12, 4)
  .attack(0.35)
  .decay(0.25)
  .sustain(0.82)
  .release(1.40)
  .cutoff(2400)
  .chorus(0.58)
  .reverb(0.18)
  .gain(0.48)
```

## Dark Pad

**Sound:** Muted, tense atmosphere for caves, stealth, or suspense scenes. The low saw gives weight, while the upper sine adds an eerie overtone.

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

**Sound:** Short, confident saw/square stab for accents, victory cues, and retro brass chords. The quick attack and moderate decay emulate the punch of synth-brass patches.

```ts
instrument("brass stab")
  .osc("sawtooth", 0, 0.52)
  .osc("square", 0, 0.22)
  .osc("sawtooth", 12, 0.10)
  .attack(0.020)
  .decay(0.20)
  .sustain(0.42)
  .release(0.18)
  .cutoff(2800)
  .resonance(0.20)
  .chorus(0.14)
```

## Soft Brass

**Sound:** Less percussive brass for sustained harmonies. The lower filter cutoff and longer release make it sit behind a lead.

```ts
instrument("soft brass")
  .osc("sawtooth", 0, 0.45)
  .osc("triangle", 0, 0.22)
  .osc("square", 12, 0.08)
  .attack(0.045)
  .decay(0.26)
  .sustain(0.58)
  .release(0.38)
  .cutoff(2200)
  .resonance(0.14)
  .chorus(0.18)
  .gain(0.55)
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

## Warm Keys

**Sound:** Rounded keyboard/chord patch with a soft transient and gentle chorus. Good for unobtrusive harmonic support.

```ts
instrument("warm keys")
  .osc("triangle", 0, 0.48)
  .osc("sine", 12, 0.16)
  .osc("pulse50", 0, 0.12)
  .attack(0.055)
  .decay(0.28)
  .sustain(0.55)
  .release(0.70)
  .cutoff(2600)
  .chorus(0.18)
  .gain(0.48)
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

## Wobble Bass

**Sound:** A harmonically rich bass with a moderate cutoff LFO. The triangle LFO gives a rounded rise/fall rather than a hard on/off pulse; use it for action loops and moving ostinatos.

```ts
instrument("wobble bass")
  .osc("sawtooth", 0, 0.42)
  .osc("triangle", -12, 0.32)
  .attack(0.004)
  .decay(0.14)
  .sustain(0.62)
  .release(0.09)
  .cutoff(900)
  .resonance(0.28)
  .lfo("cutoff", 2.2, 0.42, "triangle")
  .gain(0.42)
```

## Hollow Pulse Lead

**Sound:** A restrained retro lead. The pulse provides a clear, narrow tone and the triangle adds enough body to keep it audible on small speakers.

```ts
instrument("hollow pulse lead")
  .osc("pulse25", 0, 0.48)
  .osc("triangle", 0, 0.20)
  .attack(0.006)
  .decay(0.12)
  .sustain(0.48)
  .release(0.12)
  .cutoff(3800)
  .gain(0.42)
```

## Soft Mallet

**Sound:** A short, rounded pluck for pickups and menu motifs. The upper partials are separate oscillators, not FM operators; keep their gains low for a gentle tone.

```ts
instrument("soft mallet")
  .osc("sine", 0, 0.48)
  .osc("triangle", 12, 0.18)
  .osc("sine", 19, 0.10)
  .attack(0.002)
  .decay(0.32)
  .sustain(0.08)
  .release(0.22)
  .gain(0.42)
```

## Retro Organ

**Sound:** A steady, octave-stacked tone for retro organ chords and sustained counter-melodies. The square waves add harmonics; the lower triangle fills the body.

```ts
instrument("organ")
  .osc("square", 0, 0.30)
  .osc("square", 12, 0.12)
  .osc("triangle", -12, 0.16)
  .attack(0.012)
  .decay(0.08)
  .sustain(0.82)
  .release(0.08)
  .cutoff(3000)
  .gain(0.34)
```

## Arcade Pulse Bass

**Sound:** Pulse-and-triangle bass with a quiet sine sub. Unlike an all-sine bass, the pulse/triangle layers contribute harmonics that make the part translate better on small speakers.

```ts
instrument("arcade pulse bass")
  .osc("pulse25", 0, 0.36)
  .osc("triangle", 12, 0.22)
  .osc("sine", -12, 0.18)
  .attack(0.002)
  .decay(0.10)
  .sustain(0.56)
  .release(0.07)
  .cutoff(1900)
  .gain(0.42)
```

## Noise Sweep

**Sound:** Filtered noise for transition sweeps, power-ups, and sci-fi ambience. Lengthen the note and adjust the LFO rate/depth to change its movement.

```ts
instrument("noise sweep")
  .sound("noise")
  .attack(0.04)
  .decay(0.28)
  .sustain(0.22)
  .release(0.16)
  .highpass(900)
  .lfo("cutoff", 0.35, 0.5, "triangle")
  .gain(0.24)
```

## Full Usage Example

```ts
instruments(
  instrument("fat bass")
    .osc("sine", -12, 0.40)
    .osc("triangle", 0, 0.40)
    .osc("sawtooth", 0, 0.18)
    .cutoff(1200)
    .distortion(0.18),

  instrument("detuned lead")
    .osc("sawtooth", 0, 0.28, -11)
    .osc("sawtooth", 0, 0.34, 0)
    .osc("sawtooth", 0, 0.28, 11)
    .osc("square", 0, 0.12)
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
