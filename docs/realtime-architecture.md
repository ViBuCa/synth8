# Synth8 realtime boundary

`@vibuca/synth8-core` exposes `Synth8Event`, `Synth8Pattern.query(start, end)`,
`Synth8AudioBackend`, and `Synth8Scheduler`. Core contains no audio-engine
dependency and deals only in beats and JSON-like values.

## Backend inventory

- **core**: parser, compiler, event queries, backend contract, and scheduler.
- **player rendered mode**: native `OfflineAudioContext` rendering followed by a
  looping `AudioBufferSourceNode`. This is the default for stable music.
- **player live mode**: a bounded native `WebAudioBackend` schedules queried
  events against Web Audio nodes.
- **game audio**: native Web Audio music and SFX buses.

Tone.js, Tone.Transport, Tone.Player, and streamed chunk playback are no longer
part of Synth8.

## Measurement plan

Measure `compile()` and repeated `query()` windows separately from backend work.
For live playback, record scheduler tick count, scheduled event batches, voice
creation/reuse/stealing, and preparation time. For rendered playback, measure
offline render time and buffer startup latency. Browser/WebView heap, GC, frame
time, and dropouts should be measured in the target application.

The event/query boundary makes it possible to compare rendered playback with
native live scheduling without attributing audio-engine work to musical
interpretation.
