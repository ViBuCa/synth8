# Tracker and module playback roadmap

Synth8 will support tracker music as a subsystem of `@vibuca/synth8-player`; individual formats will not become individual npm packages.

## Design direction

The existing Synth8 DSL remains the right tool for procedural, oscillator-based music. Tracker modules use a separate runtime because tracker timing is based on orders, rows and ticks, and because instruments may be PCM samples, short waveform samples, or layered synthesized voices.

The planned pipeline is:

```text
module file -> format decoder -> tracker/module player -> music bus
                                      |
                                      +-> optional Synth8 events/assets
```

## Stages

1. **Sample assets** — preload and share decoded samples, with root-note tuning and loop metadata. The initial `SampleBank`, scheduled sample voice APIs, portable `SampleAssetData`, module sample extraction and `.sample("asset-id")` playback references are now available.
2. **Tracker clock** — implement order/row/tick timing, speed, tempo and looping. The initial format-neutral clock and tracker model are now available.
3. **Common module model** — represent patterns, channels, instruments, samples and effects without tying the model to one file format. The initial model is now available.
4. **First format** — implement MOD playback, then XM/S3M/IT as adapters or WASM-backed decoders. The first ProTracker MOD detector/decoder and initial playback path are now available.
5. **Live player** — schedule preloaded sample voices during gameplay, with music/SFX buses and pause/resume. The initial MOD player now schedules notes using order/row/tick timing plus speed/tempo changes, pattern jumps/breaks, sample offsets, note cuts and note delays, with approximations for per-row arpeggio, pitch slides, vibrato and volume slides. Tracker playback is now also available through `GameAudio.prepareModule()`; channel instrument memory and initial per-channel effect parameter memory are preserved across rows; full persistent effect execution and lifecycle hardening remain.
6. **TFMX/TFHD** — use a specialized replay backend where generic tracker conversion would lose TFMX behavior.
7. **AudioWorklet mixer** — move mixing into an AudioWorklet when voice counts or timing requirements justify it.

The playground now has a MOD file input in the **Music + Sfx** panel. It uses the same `GameAudio.prepareModule()` path as a game, making it possible to validate real modules before adding more format adapters. The decoder accepts both standard signature-based MOD files and legacy 15-sample headerless MOD files, including common multi-channel signatures. TFMX-MOD and TFHD files are recognized but currently produce a clear unsupported-backend message rather than being imported incorrectly.

An experimental `extractTfmxSampleCandidates()` API now identifies likely embedded PCM regions without invoking the original TFMX replay engine. These candidates are intentionally marked as unverified until they are validated against all TFMX variants.

## Performance principles

- Decode samples during loading, never when a note starts.
- Reuse or bound voices.
- Keep tracker control work separate from audio mixing.
- Use live playback for adaptive music and rendered buffers for fixed loops.
- Keep original short samples when authenticity matters; use oscillator instruments when procedural control is more useful.

The first implementation slice is the reusable `SampleBank` and `scheduleSampleVoice` exported by `@vibuca/synth8-player`. They preload/decode sample assets and schedule tuned sample voices without decoding at note time. The decoder registry now also accepts optional synchronous or asynchronous format adapters, so a WASM-backed TFMX decoder can be installed without creating a separate player package. The playground uses `decodeModuleAsync()` so such an adapter can initialize lazily. `GameAudio.prepareModuleBytes()` provides the same path directly for games.
