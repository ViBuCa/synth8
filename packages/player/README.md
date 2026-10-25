# @vibuca/synth8-player

Native Web Audio playback and rendering for Synth8 patterns. The player has no
Tone.js dependency.

## Playback

```ts
import { play, pause, resume, stop } from "@vibuca/synth8-player";

await play(pattern, { bpm: 120 }); // native rendered playback
pause();
resume();
stop();
```

`prepare()` supports loading screens and returns a controllable playback object.
The default and `"rendered"` mode render an `OfflineAudioContext` buffer and
play it in a looping `AudioBufferSourceNode`. `"live"` uses the bounded native
`WebAudioBackend` and schedules events through the core scheduler. The legacy
`auto` and `streamed` modes are no longer available.

```ts
const playback = await prepare(pattern, { bpm: 120, playbackMode: "rendered" });
await loadAssets();
playback.start();
```

The native backend is also available for custom routing:

```ts
const backend = new WebAudioBackend({
  context: audioContext,
  output: audioContext.destination,
  maxVoices: 16,
});
await play(pattern, { playbackMode: "live", backend, clock: audioContext });
```

## Sample and tracker foundation

The player exports a reusable `SampleBank`, `scheduleSampleVoice`, a
format-neutral tracker model, and a tick/row/order clock. These are the shared
building blocks for module playback; file decoders are not enabled yet.

```ts
import { SampleBank, scheduleSampleVoice } from "@vibuca/synth8-player";

const bank = new SampleBank(audioContext);
const sample = await bank.load("bass", bassBlob, { rootNote: 36 });
scheduleSampleVoice(audioContext, sample, {
  when: audioContext.currentTime + 0.05,
  note: 36,
  duration: 0.5,
});
```

Tracker modules will remain part of this player package rather than requiring a
separate npm package for MOD, XM, S3M, IT, or TFMX. The first format-neutral
tracker model and ProTracker MOD detector/decoder are now available:

```ts
import { decodeModule } from "@vibuca/synth8-player";

const module = decodeModule(new Uint8Array(await file.arrayBuffer()));
console.log(module.title, module.orders, module.samples);
```

The decoder currently extracts MOD patterns, notes, common effects and signed
8-bit sample data. A first live playback path is also available:

```ts
import { createTrackerPlayback, decodeModule } from "@vibuca/synth8-player";

const module = decodeModule(new Uint8Array(await file.arrayBuffer()));
const playback = createTrackerPlayback(module, {
  context: audioContext,
  output: musicBus,
});
playback.start();
```

This first player schedules decoded sample notes using tracker order/row/tick
timing and handles initial speed/tempo changes, pattern jumps/breaks, sample
offsets, note cuts and note delays. It also approximates per-row arpeggio,
pitch slides, vibrato and volume slides. Channel instrument memory is now preserved when later notes omit an instrument.
Persistent effect memory and more format adapters are still being implemented.

## Game audio

`createGameAudio()` provides native Web Audio music and SFX buses with master,
music, SFX volume, ducking, overlapping SFX voices, and rendered or live music.
Decoded tracker modules can use the same music bus:

```ts
const moduleMusic = await audio.prepareModule(module, {
  lookAhead: 0.25,
});
moduleMusic.start();
```

This keeps tracker music under the same lifecycle as Synth8 music and SFX.

## Rendering and export

`renderToAudioBuffer()`, `renderWav()`, and `renderOgg()` render using the native
Web Audio backend. WAV encoding is performed directly from the resulting PCM
buffer; Ogg uses `@audio/encode-ogg`.

```ts
const wav = await renderWav(pattern, { bpm: 120 });
```

`renderNative()` and `renderNativeChunk()` are available for applications that
need direct offline rendering.

## Compatibility

Playback options are `bpm`, `playbackMode` (`"rendered"` or `"live"`),
`backend`, `clock`, `output`, `lookAhead`, and `updateInterval`. Stream-specific
and Tone.js-specific options have been removed.
