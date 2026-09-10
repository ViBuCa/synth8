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

## Game audio

`createGameAudio()` provides native Web Audio music and SFX buses with master,
music, SFX volume, ducking, overlapping SFX voices, and rendered or live music.

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
