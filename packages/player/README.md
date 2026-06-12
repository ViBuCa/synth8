# @vibuca/synth8-player

Tone.js player for Synth8 patterns.

This package plays compiled patterns produced by @vibuca/synth8-core.

All musical structure such as repeats, sequences, offsets, durations, transposition and looping is resolved during compilation. The player receives fully compiled events with absolute timing information.

🎹 **Live Plaground:** https://vibuca.github.io/synth8/

## Install

```bash
npm install @vibuca/synth8-core @vibuca/synth8-player
```

## Usage

```ts
import { compile } from "@vibuca/synth8-core";
import { pause, play, prepare, resume, stop } from "@vibuca/synth8-player";

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
pause();
resume();
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
  bpm?: number;
  playbackMode?: "auto" | "rendered" | "live" | "streamed";
  lookAhead?: number;
  updateInterval?: number;
  streamChunkDuration?: number;
  streamTailDuration?: number;
  onReady?: (playback: PreparedPlayback) => void | Promise<void>;
};

type PreparedPlayback = {
  playbackMode: "rendered" | "live" | "streamed";
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  dispose(): void;
};
```

Defaults:

```ts
{
  bpm: 120,
  playbackMode: "auto",
  lookAhead: 0.25
}
```

### `prepare(pattern, options)`

Prepares playback without starting it.

```ts
const music = await prepare(pattern, { bpm: 120 });

await loadLevelAssets();

music.start();
```

This is the recommended flow when music must start in sync with gameplay. For example, a Phaser loading scene can compile and prepare music while images, tilemaps and other audio assets load, then call `music.start()` at the same moment the level begins.

When `playbackMode` resolves to `"rendered"`, `prepare()` completes after the audio buffer has been rendered. When it resolves to `"live"`, `prepare()` completes after the Tone.js graph and Transport scheduling are ready.

### `onReady`

`play()` also supports an `onReady` hook that runs after preparation and before playback starts.

```ts
await play(pattern, {
  bpm: 120,
  onReady: async () => {
    await loadLevelAssets();
  }
});
```

For games, `prepare()` is usually easier to coordinate than `onReady`, but `onReady` keeps the one-call `play()` workflow available.

### `createGameAudio(options)`

Creates an isolated game audio engine with separate music, SFX and master volume buses.

```ts
import { compile } from "@vibuca/synth8-core";
import { createGameAudio } from "@vibuca/synth8-player";

const audio = await createGameAudio({
  musicVolume: 0.7,
  sfxVolume: 0.9
});

const music = await audio.prepareMusic(theme, { bpm: 120 });
const jump = await audio.prepareSfx(compile('melody("c6/8").sound("square")'), {
  voices: 8
});

music.start();

// later, from gameplay code
audio.playSfx(jump);
audio.playSfx(jump, { playbackRate: 1.2, volume: 0.8 });
```

`prepareMusic()` uses streamed playback by default, so long game tracks can start after the first chunk is ready while later chunks render in the background. Pass `{ playbackMode: "rendered" }` when you explicitly want to render the full loop before starting. `prepareSfx()` renders a one-shot buffer and creates a small voice pool, allowing repeated calls to `playSfx()` to overlap without replacing the music.

Use `setMasterVolume()`, `setMusicVolume()` and `setSfxVolume()` for runtime mixing. Call `dispose()` when leaving the game or tearing down the audio engine.

### `renderWav(pattern, options)`

Renders a compiled pattern offline and returns a WAV `Blob`.

```ts
import { renderWav } from "@vibuca/synth8-player";

const blob = await renderWav(pattern, { bpm: 120 });
const url = URL.createObjectURL(blob);
```

Tone.js provides offline rendering, but it does not provide built-in MP3 or OGG encoders for deterministic exports. WAV is encoded directly from the rendered audio buffer.

### `stop()`

Stops playback.

```ts
stop();
```

### `pause()`

Pauses the current playback session.

```ts
pause();
```

In rendered mode, the current loop offset is stored before the buffer player is stopped.

### `resume()`

Resumes the current playback session.

```ts
resume();
```

In rendered mode, playback restarts from the offset captured by `pause()`. In live mode, pause and resume are forwarded to Tone.js Transport.

## Timing

Synth8 events use beat-based timing.

Playback speed is controlled via the bpm option passed to play().

Example:
```ts
play(pattern, { bpm: 90 });
play(pattern, { bpm: 120 });
play(pattern, { bpm: 160 });
```

## Playback modes

The player supports three playback mode choices.

### Auto playback

Auto playback is the default:

```ts
await play(pattern, { bpm: 120 });
await play(pattern, { bpm: 120, playbackMode: "auto" });
```

Auto mode renders small and medium patterns, then falls back to live playback for dense patterns. This avoids situations where a very dense song spends a long time in `Tone.Offline` before any sound can start.

If you need deterministic behavior, choose `"rendered"` or `"live"` explicitly.

### Rendered playback

Rendered playback can be selected explicitly:

```ts
await play(pattern, { bpm: 120, playbackMode: "rendered" });
```

In rendered mode, the pattern is first rendered with `Tone.Offline` into an audio buffer. The buffer is then played as a looping `Tone.Player`.

This is the recommended mode for games, mobile WebViews, and high-load browser environments because playback is no longer dependent on continuous JavaScript event scheduling while the music is running. It is more resilient when the main thread is busy with rendering, scrolling, tab changes, or game logic.

The tradeoff is that starting playback has a pre-render step. For very dense songs this can be too slow for a game loading screen, so use `"auto"` or `"live"` for those cases.

### Live playback

Live playback schedules note and drum events directly on Tone.js Transport:

```ts
await play(pattern, { bpm: 120, playbackMode: "live" });
```

Live mode is useful when you need immediate synthesis behavior or want to inspect timing while developing. It can be more sensitive to browser and main-thread load, especially when tabs are backgrounded or the page is doing heavy work.

### Streamed playback

Streamed playback renders a short chunk first, starts it, and then keeps rendering later chunks in the background:

```ts
await play(pattern, {
  bpm: 120,
  playbackMode: "streamed",
  streamChunkDuration: 5,
  streamTailDuration: 0.25
});
```

This is useful for long songs where rendering the full loop upfront would take too long, but you still want Tone.js-rendered audio instead of live Transport scheduling for the whole piece. If rendering falls behind, a chunk may start late, so tune `streamChunkDuration` upward for heavier songs.

### Scheduling options

`lookAhead` and `updateInterval` tune Tone.js scheduling for live playback and any transport scheduling that still relies on JavaScript timers.

```ts
await play(pattern, {
  bpm: 120,
  playbackMode: "live",
  lookAhead: 0.4,
  updateInterval: 0.2
});
```

Increasing `lookAhead` can make playback more tolerant of timer jitter, at the cost of slightly more latency before scheduled changes are heard.

## Supported event types

```ts
{ type: "drum", value: "kick" }
{ type: "note", value: "c4" }
```

Velocity is supported when present:

```ts
{ type: "note", value: "c4", velocity: 0.5 }
```
In live playback, the player creates Tone.js synthesizers only for layers that contain note events and drum voices only for the drum sounds used by the pattern.

## Supported waveforms
```ts
sine
triangle
square
sawtooth
```

## Layer playback
Synth8 patterns may contain multiple playback layers.

Each layer can define its own playback configuration:
```ts
melody("c4 e4 g4").sound("triangle")
melody("c3 g3").sound("sawtooth")
melody("c5 d5 e5").sound("square")
```

Melody layers can also define synth envelope values:

```ts
melody("c4 e4 g4")
  .sound("triangle")
  .attack(0.02)
  .decay(0.15)
  .sustain(0.5)
  .release(0.4)
```

The player passes these values to Tone.js synth envelopes. `attack()`, `decay()`, and `release()` are seconds. `sustain()` is a level from 0 to 1.

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

## Playback configuration
Playback configuration is stored on pattern layers rather than individual events.

### Example:
```ts
{
  playback: {
    sound: "triangle"
  },
  events: [...]
}
```
This allows multiple tracks in the same song to use different synthesizer waveforms while keeping the event model simple.

### Gain

The player supports layer gain compiled by `@vibuca/synth8-core`.

```ts
song(
  melody("c5 e5 g5").sound("square").gain(0.7),
  melody("c2 _ g1 _").sound("triangle").gain(0.4)
)
```

The player applies gain per layer, so different melodies, bass lines and drum tracks can be mixed independently.

### Stereo pan

The player supports layer-level stereo panning via `playback.pan`.

```ts
melody("c4 e4 g4")
  .sound("square")
  .gain(0.4)
  .pan(-0.5)
```

Internally, each layer is routed through its own gain and pan nodes before reaching the audio destination.

## Example

```ts
const pattern = compile(`
  song(
    melody("d5/2 c#5/2 d5/2 _ a4/2 g4/2 f4/2 e4/2")
      .sound("square")
      .gain(0.45),

    melody("d3/2 _ a2/2 _")
      .sound("triangle")
      .gain(0.65)
      .loop(),

    beat("kick _ _ _ snare _ _ _")
      .gain(0.55)
      .loop()
  )
`);

await play(pattern, { bpm: 110 });
```

## Note
The player currently provides a built-in Tone.js playback engine with rendered and live playback modes.

Playback configuration currently supports waveform selection, gain, and panning.

Future releases may add effects and instrument banks without changing the compiled event format.

## License

MIT
