# @vibuca/synth8-editor

A small browser piano-roll editor for Synth8. This first version is intentionally minimal: click cells to add/remove notes, choose a waveform, preview the result, and copy the generated Synth8 pattern from the read-only source field.

```ts
import { mountSynth8Editor } from "@vibuca/synth8-editor";

mountSynth8Editor(document.querySelector("#editor")!, { bpm: 120 });
```
