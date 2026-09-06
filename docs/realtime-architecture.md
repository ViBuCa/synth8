# Synth8 realtime boundary

`@vibuca/synth8-core` now exposes `Synth8Event`, `Synth8Pattern.query(start, end)`,
`Synth8AudioBackend`, and `Synth8Scheduler`. Core only deals in beats and plain
JSON-like values; it has no Tone or Web Audio dependency. `compile(source)` still
returns the existing compiled shape for compatibility and adds a non-enumerable
`query` method.

The query is onset-based: an event is returned when its start is in
`[startTime, endTime)`. Loop expansion happens in core, so a backend does not
need to understand repeats, sequences, or loop boundaries. Querying the same
window is deterministic, and a scheduler advances its lower bound to prevent
boundary duplicates.

## Current backend inventory

- **core**: parser, compiler, compiled events, query, backend contract, scheduler.
- **player**: Tone.js live scheduling and Tone offline/streamed rendering.
- **player live mode**: creates one synth/drum graph per compiled playback layer,
  not per individual note. It schedules note callbacks on Tone.Transport.
- **player rendered mode**: creates a Tone graph during offline rendering and
  plays the result with one `Tone.Player`.
- **player streamed mode**: creates and disposes a `Tone.Player` per rendered
  chunk. This is intentionally different from live instrument lifetime.

The existing player has not been behaviorally rewritten: this is important for
comparing the new representation with the current Tone implementation. The
legacy `Event` shape remains available to the player while `query()` provides
the public backend-neutral shape (`kind`, `pitch`/`drum`, `duration`, controls,
and semantic parameters).

## Measurement plan

Measure the following separately for representative source strings:

1. `performance.now()` around `compile()` and repeated `query()` windows;
2. query event count and events/second;
3. scheduler `tick()` count and backend `schedule()` batch count;
4. live preparation graph counts (layers, synths, drum voices, effects);
5. Tone offline/rendered preparation time and streamed player creation count.

A useful first comparison is `compile/query` alone versus a backend whose
`schedule` method only counts events, followed by current live Tone playback.
This avoids attributing Tone time to musical interpretation. Browser/WebView
heap, GC, frame time, and dropouts must be measured in the Phaser workload;
Node microbenchmarks cannot establish Android performance.

## Assessment and next decision

Before measurements, the code supports one defensible conclusion: the current
live path's complete instrument graph is created per layer, not per note, while
Tone.Transport receives one callback per event timestamp. Rendered mode avoids
continuous event scheduling and is already the safer production choice for
static game music. The new query/scheduler boundary makes it possible to test
whether query cost is material before choosing among Transport replacement,
voice pooling, or a native Web Audio backend. Do not infer that Tone or core is
the bottleneck until the counters above are collected.

For static soundtrack playback, OGG remains preferable. The event path is most
promising for adaptive music and short SFX, where a small query window and a
lightweight backend can avoid rendering an entire track.
