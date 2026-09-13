import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

export type EditorOptions = { bars?: number; beatsPerBar?: number; bpm?: number };
type Note = { start: number; pitch: number; duration: number; velocity: number };
type Envelope = { attack: number; decay: number; sustain: number; release: number };
type Sound = "square" | "triangle" | "sawtooth" | "sine";
type Melody = { name: string; notes: Note[]; sound: Sound; preset?: string; gain: number; envelope: Envelope };
type DrumHit = { start: number; drum: string };
type DrumTrack = { name: string; hits: DrumHit[]; bank: string; gain: number };

// Chromatic rows, highest first. The editor now includes every semitone.
const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const SOUNDS = ["square", "triangle", "sawtooth", "sine"] as const;
const DRUMS = ["kick", "snare", "clap", "hihat", "openhat", "tom", "lowtom", "midtom", "hitom", "rim", "cowbell", "crash", "ride", "shaker"];

function noteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

function visiblePitches(topOctave: number): number[] {
  const topMidi = (topOctave + 1) * 12;
  return Array.from({ length: 25 }, (_, index) => topMidi - index);
}

function installStyle() {
  if (document.getElementById("synth8-editor-style")) return;
  const element = document.createElement("style");
  element.id = "synth8-editor-style";
  element.textContent = `
    .s8-editor { color:#f8f8f2; background:#171724; border:1px solid #44475a; border-radius:12px; padding:18px; font:14px system-ui,sans-serif; }
    .s8-editor h2 { margin:0 0 6px; } .s8-editor p { color:#c7c7d8; margin:0 0 14px; }
    .s8-editor-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:14px; }
    .s8-editor-melodies button.is-active, .s8-editor-tabs button.is-active { background:#50fa7b; color:#101018; }
    .s8-editor-tabs { border-bottom:1px solid #44475a; padding-bottom:10px; } .s8-editor-tabs button { min-width:120px; font-size:15px; }
    .s8-editor-melodies, .s8-editor-drum-title, .song-section { border:1px solid #44475a; border-radius:8px; padding:10px; background:#1b1b2b; }
    .s8-editor [hidden], .s8-editor[data-tab="melody"] .drum-section, .s8-editor[data-tab="drums"] .melody-section { display:none !important; }
    .song-section { margin-top:18px; } .song-section h3 { margin:0 0 10px; }
    .s8-editor button,.s8-editor select { background:#282a36; color:#f8f8f2; border:1px solid #6272a4; border-radius:6px; padding:7px 10px; }
    .s8-editor button:hover { background:#44475a; cursor:pointer; } .s8-editor label { margin:0; display:flex; gap:6px; align-items:center; }
    .s8-editor-grid { display:grid; grid-template-columns:52px 1fr; overflow:auto; border:1px solid #44475a; background:#101018; }
    .s8-editor-labels { display:grid; grid-template-rows:repeat(25, 28px); position:sticky; left:0; z-index:2; background:#1b1b2b; }
    .s8-editor-labels span { padding:6px 7px; border-bottom:1px solid #282a36; color:#f8f8f2; }
    .s8-editor-labels span.white { background:#303344; } .s8-editor-labels span.black { color:#8be9fd; background:#11111c; }
    .s8-editor-roll { display:grid; grid-template-columns:repeat(32, 34px); grid-template-rows:repeat(25, 28px); min-width:max-content; }
    .s8-editor-cell { border-right:1px solid #282a36; border-bottom:1px solid #282a36; }
    .s8-editor-cell.white { background:#252738; } .s8-editor-cell.black { background:#14141f; }
    .s8-editor-cell.white.beat { border-right-color:#8490c0; } .s8-editor-cell.black.beat { border-right-color:#6272a4; }
    .s8-editor-cell.beat { border-right-color:#6272a4; } .s8-editor-cell:hover { background:#44475a; }
    .s8-editor-cell.note { background:#50fa7b; box-shadow:inset 0 0 0 1px #b7ffca; }
    .s8-editor-cell.note-start { border-radius:5px 0 0 5px; }
    .s8-editor-cell.note { cursor:grab; } .s8-editor-cell.note:active { cursor:grabbing; }
    .s8-editor-cell.note-end { border-radius:0 5px 5px 0; cursor:ew-resize; }
    .s8-editor-source { width:100%; box-sizing:border-box; min-height:80px; margin-top:14px; padding:10px; color:#f8f8f2; background:#101018; border:1px solid #44475a; border-radius:6px; font:13px monospace; }
    .s8-editor-drum-title { margin:18px 0 8px; } .s8-editor-drum-grid { display:grid; grid-template-columns:78px 1fr; overflow:auto; border:1px solid #44475a; background:#101018; }
    .s8-editor-drum-labels { display:grid; grid-template-rows:repeat(14,28px); position:sticky; left:0; z-index:2; background:#1b1b2b; }
    .s8-editor-drum-labels span { padding:6px 7px; border-bottom:1px solid #282a36; color:#c7c7d8; }
    .s8-editor-drum-roll { display:grid; grid-template-rows:repeat(14,28px); min-width:max-content; }
    .s8-editor-drum-cell { border:0; border-right:1px solid #282a36; border-bottom:1px solid #282a36; background:#252738; }
    .s8-editor-drum-cell.beat { border-right-color:#8490c0; } .s8-editor-drum-cell.hit { background:#ffb86c; box-shadow:inset 0 0 0 1px #ffe0b2; }
  `;
  document.head.appendChild(element);
}

export function downloadSynth8Source(source: string, filename = "song.synth8", metadata: { bpm?: number; length?: number } = {}): void {
  const header = [metadata.bpm !== undefined ? `// synth8-bpm: ${metadata.bpm}` : "", metadata.length !== undefined ? `// synth8-length: ${metadata.length}` : ""].filter(Boolean).join("\n");
  const content = header ? `${header}\n${source}` : source;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function readSynth8Source(file: File): Promise<string> {
  return file.text();
}

export function getSynth8FileMetadata(source: string): { bpm?: number; length?: number } {
  const bpm = source.match(/^\/\/\s*synth8-bpm:\s*([0-9.]+)/m)?.[1];
  const length = source.match(/^\/\/\s*synth8-length:\s*([0-9.]+)/m)?.[1];
  return { ...(bpm ? { bpm: Number(bpm) } : {}), ...(length ? { length: Number(length) } : {}) };
}

/** Mounts a small browser piano roll. Click an empty cell to place a note. */
export function mountSynth8Editor(root: HTMLElement, options: EditorOptions = {}): { destroy(): void } {
  installStyle();
  const bars = options.bars ?? 4;
  const beatsPerBar = options.beatsPerBar ?? 8;
  let columns = bars * beatsPerBar;
  let bpm = options.bpm ?? 120;
  let topOctave = 6;
  let masterGain = 1;
  let editorTab: "melody" | "drums" = "melody";
  // Preserve the original imported source for faithful playback. The grid is
  // intentionally a simplified editable view and cannot represent every
  // fractional timing/sequence construct from the DSL.
  let importedPlaybackSource: string | undefined;
  const markEdited = () => { importedPlaybackSource = undefined; };
  let noteLength = 1;
  let velocity = 0.8;
  let notes: Note[] = [
    { start: 0, pitch: 72, duration: 1, velocity: 0.8 }, { start: 2, pitch: 75, duration: 1, velocity: 0.8 },
    { start: 4, pitch: 79, duration: 1, velocity: 0.65 }, { start: 6, pitch: 72, duration: 2, velocity: 0.8 },
    { start: 8, pitch: 66, duration: 1, velocity: 0.8 }, { start: 10, pitch: 72, duration: 1, velocity: 0.8 }, { start: 11, pitch: 73, duration: 1, velocity: 0.65 },
  ];
  let melodies: Melody[] = [{ name: "Melody 1", notes, sound: "square", gain: 0.8, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 } }];
  let activeMelody = 0;
  let drumTracks: DrumTrack[] = [{ name: "Drums 1", hits: [{ start: 0, drum: "kick" }, { start: 2, drum: "snare" }, { start: 4, drum: "kick" }, { start: 6, drum: "snare" }], bank: "default", gain: 0.8 }];
  let activeDrumTrack = 0;

  const container = document.createElement("section");
  container.className = "s8-editor";
  root.replaceChildren(container);

  const melodySource = (melody: Melody) => {
    const melodyNotes = melody.notes;
    const tokens = Array.from({ length: columns }, (_, index) => {
      const atStart = melodyNotes
        .filter((item) => item.start === index)
        .sort((a, b) => a.pitch - b.pitch);
      if (atStart.length === 0) return "_";

      // Several notes starting on the same beat are exported as one parallel
      // Synth8 token, so stacked piano-roll notes remain a chord in playback.
      const duration = Math.max(...atStart.map((item) => item.duration));
      // The compact DSL applies a slash duration to the whole parallel token,
      // so per-note velocity annotations are only unambiguous for one-beat
      // chords. Longer chords still retain their pitches and duration.
      const chord = atStart.map((item) => `${noteName(item.pitch)}${duration === 1 && item.velocity !== 1 ? `:${item.velocity}` : ""}`).join("+");
      return `${chord}${duration === 1 ? "" : `/${duration}`}`;
    });
    const envelope = melody.envelope;
    const instrument = melody.preset ? `.preset("${melody.preset}")` : `.sound("${melody.sound}")`;
    return `melody("${tokens.join(" ")}")${instrument}.gain(${(melody.gain * masterGain).toFixed(2)}).attack(${envelope.attack}).decay(${envelope.decay}).sustain(${envelope.sustain}).release(${envelope.release})`;
  };

  const drumSource = (track: DrumTrack) => {
    const tokens = Array.from({ length: columns }, (_, index) => {
      const atStart = track.hits.filter((hit) => hit.start === index).map((hit) => hit.drum);
      return atStart.length ? atStart.join("+") : "_";
    });
    return `beat("${tokens.join(" ")}").bank("${track.bank}").gain(${(track.gain * masterGain).toFixed(2)})`;
  };

  const source = () => {
    melodies[activeMelody].notes = notes;
    const melodyParts = melodies.map((melody) => `  // ${melody.name.replace(/[\\r\\n]/g, " ")}\n  ${melodySource(melody)}`);
    const drumParts = drumTracks.map((track) => `  // ${track.name.replace(/[\\r\\n]/g, " ")}\n  ${drumSource(track)}`);
    return `song(\n${[...melodyParts, ...drumParts].join(",\n\n")}\n)`;
  };

  const noteToMidi = (value: string): number => {
    const match = value.match(/^([a-g])(#|b)?([0-8])$/i);
    if (!match) return 60;
    const base = ({ c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 } as Record<string, number>)[match[1].toLowerCase()];
    return (Number(match[3]) + 1) * 12 + base + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
  };

  const loadSource = (text: string) => {
    const pattern = compile(text);
    importedPlaybackSource = text;
    const metadata = getSynth8FileMetadata(text);
    if (metadata.bpm !== undefined && Number.isFinite(metadata.bpm)) bpm = metadata.bpm;
    const importedMelodies: Melody[] = [];
    const importedDrums: DrumTrack[] = [];
    let end = 1;
    for (const layer of pattern.layers) {
      const playback = layer.playback ?? {};
      end = Math.max(end, ...layer.events.map((event) => event.time + event.dur));
      if (layer.events.some((event) => event.type === "note")) {
        importedMelodies.push({ name: `Melody ${importedMelodies.length + 1}`, preset: playback.preset, sound: (playback.sound as Sound) ?? "square", gain: playback.gain ?? 0.8, envelope: { attack: playback.envelope?.attack ?? 0.01, decay: playback.envelope?.decay ?? 0.1, sustain: playback.envelope?.sustain ?? 0.7, release: playback.envelope?.release ?? 0.2 }, notes: layer.events.filter((event) => event.type === "note").map((event) => ({ start: event.time, pitch: noteToMidi(event.value), duration: event.dur, velocity: event.velocity ?? 0.8 })) });
      } else if (layer.events.some((event) => event.type === "drum")) {
        importedDrums.push({ name: `Drums ${importedDrums.length + 1}`, bank: playback.bank ?? "default", gain: playback.gain ?? 0.8, hits: layer.events.filter((event) => event.type === "drum").map((event) => ({ start: event.time, drum: event.value })) });
      }
    }
    melodies = importedMelodies.length ? importedMelodies : [{ name: "Melody 1", notes: [], sound: "square", gain: 0.8, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 } }];
    drumTracks = importedDrums.length ? importedDrums : [{ name: "Drums 1", hits: [], bank: "default", gain: 0.8 }];
    activeMelody = 0; activeDrumTrack = 0; notes = melodies[0].notes; columns = Math.max(1, Math.min(128, Math.ceil(metadata.length ?? end)));
    render();
  };

  const render = () => {
    container.dataset.tab = editorTab;
    const pitches = visiblePitches(topOctave);
    const generated = source();
    container.innerHTML = `<h2>Sketch Editor</h2><p>Choose a track type below. Click to add/remove. Drag melody notes to move them; drag their right edge to resize.</p>
      <div class="s8-editor-toolbar s8-editor-tabs"><button data-tab="melody" class="${editorTab === "melody" ? "is-active" : ""}">Melodies</button><button data-tab="drums" class="${editorTab === "drums" ? "is-active" : ""}">Drums</button></div>
      <div class="s8-editor-toolbar"><button data-action="play">Play song</button><button data-action="stop">Stop</button><button data-action="clear">Clear active track</button><label>Master volume <input data-master-gain type="number" min="0" max="1" step="0.05" value="${masterGain}" style="width:55px"></label><label>BPM <input data-bpm type="number" min="40" max="240" value="${bpm}" style="width:60px"></label></div>
      <div class="melody-section" ${editorTab === "melody" ? "" : "hidden"}><div class="s8-editor-toolbar s8-editor-melodies"><strong>Melodies:</strong>${melodies.map((melody, index) => `<button data-melody="${index}" class="${index === activeMelody ? "is-active" : ""}">${melody.name}</button>`).join("")}<button data-action="new-melody">+ New melody</button><label>Name <input data-melody-name value="${melodies[activeMelody].name.replace(/"/g, "&quot;")}" style="width:110px"></label></div>
      <div class="s8-editor-toolbar"><button data-action="octave-down" ${topOctave <= 1 ? "disabled" : ""}>Octave −</button><strong> ${noteName(pitches[pitches.length - 1])}–${noteName(pitches[0])} </strong><button data-action="octave-up" ${topOctave >= 8 ? "disabled" : ""}>Octave +</button>
      <label>Length <input data-columns type="number" min="1" max="128" value="${columns}" style="width:60px"> beats</label>
      <label>Sound <select data-sound>${SOUNDS.map((item) => `<option ${item === melodies[activeMelody].sound ? "selected" : ""}>${item}</option>`).join("")}</select></label>
      <label>Gain <input data-track-gain type="number" min="0" max="1" step="0.05" value="${melodies[activeMelody].gain}" style="width:55px"></label>
      <span>Envelope:</span><label>A <input data-envelope="attack" type="number" min="0" step="0.01" value="${melodies[activeMelody].envelope.attack}" style="width:48px"></label><label>D <input data-envelope="decay" type="number" min="0" step="0.01" value="${melodies[activeMelody].envelope.decay}" style="width:48px"></label><label>S <input data-envelope="sustain" type="number" min="0" max="1" step="0.05" value="${melodies[activeMelody].envelope.sustain}" style="width:48px"></label><label>R <input data-envelope="release" type="number" min="0" step="0.01" value="${melodies[activeMelody].envelope.release}" style="width:48px"></label>
      <label>Note length <select data-length>${[1, 2, 3, 4].map((item) => `<option value="${item}" ${item === noteLength ? "selected" : ""}>${item} beat${item === 1 ? "" : "s"}</option>`).join("")}</select></label>
      <label>Velocity <select data-velocity>${[0.25, 0.5, 0.65, 0.8, 1].map((item) => `<option value="${item}" ${item === velocity ? "selected" : ""}>${item}</option>`).join("")}</select></label></div>
      <div class="s8-editor-grid"><div class="s8-editor-labels">${pitches.map((midi) => `<span class="${NOTE_NAMES[midi % 12].includes("#") ? "black" : "white"}">${noteName(midi)}</span>`).join("")}</div><div class="s8-editor-roll" style="grid-template-columns:repeat(${columns},34px)">
      ${pitches.flatMap((midi) => Array.from({ length: columns }, (_, column) => {
        const note = notes.find((item) => item.pitch === midi && column >= item.start && column < item.start + item.duration);
        const start = notes.some((item) => item.pitch === midi && item.start === column);
        const keyClass = NOTE_NAMES[midi % 12].includes("#") ? "black" : "white";
        const end = note && column === note.start + note.duration - 1;
        return `<button class="s8-editor-cell ${keyClass} ${column % beatsPerBar === 0 ? "beat" : ""} ${note ? "note" : ""} ${start ? "note-start" : ""} ${end ? "note-end" : ""}" data-pitch="${midi}" data-start="${column}" aria-label="${noteName(midi)} beat ${column + 1}"></button>`;
      })).join("")}</div></div></div>
      <div class="drum-section" ${editorTab === "drums" ? "" : "hidden"}><h3 class="s8-editor-drum-title">Drum tracks</h3>
      <div class="s8-editor-toolbar s8-editor-melodies"><strong>Tracks:</strong>${drumTracks.map((track, index) => `<button data-drum-track="${index}" class="${index === activeDrumTrack ? "is-active" : ""}">${track.name}</button>`).join("")}<button data-action="new-drum">+ New drum track</button><label>Name <input data-drum-name value="${drumTracks[activeDrumTrack].name.replace(/"/g, "&quot;")}" style="width:110px"></label></div>
      <label>Kit <select data-drum-bank>${["default", "808", "909", "arcade", "chip"].map((item) => `<option ${item === drumTracks[activeDrumTrack].bank ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Gain <input data-drum-gain type="number" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].gain}" style="width:55px"></label></div>
      <div class="s8-editor-drum-grid"><div class="s8-editor-drum-labels">${DRUMS.map((drum) => `<span>${drum}</span>`).join("")}</div><div class="s8-editor-drum-roll" style="grid-template-columns:repeat(${columns},34px)">
      ${DRUMS.flatMap((drum) => Array.from({ length: columns }, (_, column) => { const hit = drumTracks[activeDrumTrack].hits.some((item) => item.drum === drum && item.start === column); return `<button class="s8-editor-drum-cell ${column % beatsPerBar === 0 ? "beat" : ""} ${hit ? "hit" : ""}" data-drum="${drum}" data-start="${column}" aria-label="${drum} beat ${column + 1}"></button>`; })).join("")}</div></div></div><div class="song-section"><h3>Song import/export</h3><textarea class="s8-editor-source" data-song-source readonly>${generated}</textarea><div class="s8-editor-toolbar"><button data-action="export-song">Export .synth8</button><label>Import .synth8 <input data-import-song type="file" accept=".synth8,.txt,text/plain"></label></div></div>`;
    // Do not leave the inactive editor in the DOM. This is deliberately a
    // removal rather than only a CSS hide, so melody mode has no drum grid.
    if (editorTab === "melody") {
      // Remove both the wrapper and the grid itself. The grid must not even
      // exist in the melody DOM, rather than merely being visually hidden.
      container.querySelectorAll(".drum-section, .s8-editor-drum-grid, .s8-editor-drum-title").forEach((element) => element.remove());
    }

    // Update the visible roll without rebuilding its DOM. This keeps pointer
    // capture and the current drag interaction alive while the note moves.
    const refreshPreview = () => {
      container.querySelectorAll<HTMLElement>(".s8-editor-cell").forEach((cell) => {
        const pitch = Number(cell.dataset.pitch); const column = Number(cell.dataset.start);
        const note = notes.find((item) => item.pitch === pitch && column >= item.start && column < item.start + item.duration);
        cell.classList.toggle("note", Boolean(note));
        cell.classList.toggle("note-start", Boolean(note && column === note.start));
        cell.classList.toggle("note-end", Boolean(note && column === note.start + note.duration - 1));
      });
      const preview = container.querySelector<HTMLTextAreaElement>(".s8-editor-source");
      if (preview) preview.value = source();
    };

    let drag: { index: number; mode: "move" | "resize"; pitch: number; offset: number } | undefined;
    let dragged = false;
    const finishDrag = () => {
      if (!drag) return;
      // A press without movement is left for the click handler, which deletes
      // the note. Only a real drag commits a render here.
      if (!dragged) { drag = undefined; return; }
      markEdited();
      // Remove collisions created by moving/resizing, but keep the dragged note.
      const dragIndex = drag.index;
      const active = notes[dragIndex];
      notes = notes.filter((item, index) => index === dragIndex || item.pitch !== active.pitch || item.start + item.duration <= active.start || item.start >= active.start + active.duration);
      drag = undefined;
      render();
    };
    const updateDrag = (cell: HTMLElement) => {
      if (!drag) return;
      const column = Number(cell.dataset.start); const pitch = Number(cell.dataset.pitch); const note = notes[drag.index];
      if (!note || !Number.isFinite(column) || !Number.isFinite(pitch)) return;
      if (drag.mode === "resize") {
        if (pitch !== drag.pitch || column < note.start) return;
        if (column === note.start + note.duration - 1) return;
        note.duration = Math.max(1, Math.min(columns - note.start, column - note.start + 1));
      } else {
        if (column === note.start + drag.offset && pitch === note.pitch) return;
        note.start = Math.max(0, Math.min(columns - note.duration, column - drag.offset)); note.pitch = pitch;
      }
      dragged = true;
      refreshPreview();
    };
    window.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".s8-editor-cell");
      if (target) updateDrag(target);
    });
    container.querySelectorAll<HTMLButtonElement>(".s8-editor-cell").forEach((cell) => {
      cell.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const pitch = Number(cell.dataset.pitch); const column = Number(cell.dataset.start);
        const index = notes.findIndex((item) => item.pitch === pitch && column >= item.start && column < item.start + item.duration);
        if (index < 0) return;
        dragged = false;
        const note = notes[index];
        const onRightEdge = column === note.start + note.duration - 1 && event.offsetX >= cell.clientWidth * 0.6;
        drag = { index, mode: onRightEdge ? "resize" : "move", pitch, offset: column - note.start };
      });
      cell.addEventListener("click", () => {
        if (dragged) { dragged = false; return; }
        const pitch = Number(cell.dataset.pitch); const start = Number(cell.dataset.start);
        const index = notes.findIndex((item) => item.pitch === pitch && start >= item.start && start < item.start + item.duration);
        markEdited();
        if (index >= 0) notes.splice(index, 1);
        else {
          notes = notes.filter((item) => item.pitch !== pitch || item.start + item.duration <= start || item.start >= start + noteLength);
          notes.push({ start, pitch, duration: Math.min(noteLength, columns - start), velocity });
        }
        render();
      });
    });
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
    container.querySelectorAll<HTMLButtonElement>("[data-melody]").forEach((button) => button.addEventListener("click", () => {
      melodies[activeMelody].notes = notes;
      activeMelody = Number(button.dataset.melody);
      notes = melodies[activeMelody].notes;
      render();
    }));
    container.querySelector<HTMLButtonElement>('[data-action="new-melody"]')!.addEventListener("click", () => {
      markEdited();
      melodies[activeMelody].notes = notes;
      melodies.push({ name: `Melody ${melodies.length + 1}`, notes: [], sound: "square", gain: 0.8, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 } });
      activeMelody = melodies.length - 1;
      notes = melodies[activeMelody].notes;
      render();
    });
    container.querySelector<HTMLInputElement>("[data-melody-name]")!.addEventListener("change", (event) => {
      melodies[activeMelody].name = (event.target as HTMLInputElement).value.trim() || `Melody ${activeMelody + 1}`;
      render();
    });
    container.querySelectorAll<HTMLButtonElement>("[data-drum-track]").forEach((button) => button.addEventListener("click", () => { activeDrumTrack = Number(button.dataset.drumTrack); render(); }));
    container.querySelector<HTMLButtonElement>('[data-action="new-drum"]')?.addEventListener("click", () => { markEdited(); drumTracks.push({ name: `Drums ${drumTracks.length + 1}`, hits: [], bank: "default", gain: 0.8 }); activeDrumTrack = drumTracks.length - 1; render(); });
    container.querySelector<HTMLInputElement>("[data-drum-name]")?.addEventListener("change", (event) => { drumTracks[activeDrumTrack].name = (event.target as HTMLInputElement).value.trim() || `Drums ${activeDrumTrack + 1}`; render(); });
    container.querySelectorAll<HTMLButtonElement>(".s8-editor-drum-cell").forEach((cell) => cell.addEventListener("click", () => {
      markEdited();
      const drum = cell.dataset.drum!; const start = Number(cell.dataset.start); const hits = drumTracks[activeDrumTrack].hits;
      const index = hits.findIndex((hit) => hit.drum === drum && hit.start === start);
      if (index >= 0) hits.splice(index, 1); else hits.push({ drum, start });
      render();
    }));
    container.querySelector<HTMLButtonElement>('[data-action="octave-down"]')!.addEventListener("click", () => { topOctave = Math.max(1, topOctave - 1); render(); });
    container.querySelector<HTMLButtonElement>('[data-action="octave-up"]')!.addEventListener("click", () => { topOctave = Math.min(8, topOctave + 1); render(); });
    container.querySelector<HTMLInputElement>("[data-columns]")!.addEventListener("change", (event) => {
      columns = Math.max(1, Math.min(128, Math.floor(Number((event.target as HTMLInputElement).value) || 1)));
      notes = notes.filter((note) => note.start < columns).map((note) => ({ ...note, duration: Math.min(note.duration, columns - note.start) }));
      render();
    });
    container.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => button.addEventListener("click", () => { editorTab = button.dataset.tab as "melody" | "drums"; render(); }));
    container.querySelector<HTMLInputElement>("[data-master-gain]")!.addEventListener("change", (event) => { masterGain = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0)); render(); });
    container.querySelector<HTMLInputElement>("[data-bpm]")!.addEventListener("change", (event) => { bpm = Math.max(40, Math.min(240, Number((event.target as HTMLInputElement).value) || 120)); render(); });
    container.querySelector<HTMLSelectElement>("[data-sound]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].sound = (event.target as HTMLSelectElement).value as Sound; render(); });
    container.querySelector<HTMLInputElement>("[data-track-gain]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].gain = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0)); render(); });
    container.querySelectorAll<HTMLInputElement>("[data-envelope]").forEach((input) => input.addEventListener("change", () => { const key = input.dataset.envelope as keyof Envelope; melodies[activeMelody].envelope[key] = Math.max(0, Number(input.value) || 0); render(); }));
    container.querySelector<HTMLSelectElement>("[data-drum-bank]")?.addEventListener("change", (event) => { drumTracks[activeDrumTrack].bank = (event.target as HTMLSelectElement).value; render(); });
    container.querySelector<HTMLInputElement>("[data-drum-gain]")?.addEventListener("change", (event) => { drumTracks[activeDrumTrack].gain = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0)); render(); });
    container.querySelector<HTMLSelectElement>("[data-length]")!.addEventListener("change", (event) => { noteLength = Number((event.target as HTMLSelectElement).value); render(); });
    container.querySelector<HTMLSelectElement>("[data-velocity]")!.addEventListener("change", (event) => { velocity = Number((event.target as HTMLSelectElement).value); render(); });
    container.querySelector<HTMLButtonElement>('[data-action="clear"]')!.addEventListener("click", () => { markEdited(); if (editorTab === "melody") notes = []; else drumTracks[activeDrumTrack].hits = []; render(); });
    container.querySelector<HTMLButtonElement>('[data-action="stop"]')!.addEventListener("click", () => stop());
    container.querySelector<HTMLButtonElement>('[data-action="export-song"]')!.addEventListener("click", () => downloadSynth8Source(container.querySelector<HTMLTextAreaElement>("[data-song-source]")!.value, "song.synth8", { bpm, length: columns }));
    container.querySelector<HTMLInputElement>("[data-import-song]")!.addEventListener("change", async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try { loadSource(await readSynth8Source(file)); }
      catch (error) { window.alert(error instanceof Error ? error.message : String(error)); }
    });
    container.querySelector<HTMLButtonElement>('[data-action="play"]')!.addEventListener("click", async () => {
      bpm = Number(container.querySelector<HTMLInputElement>("[data-bpm]")!.value) || 120;
      const sourceToPlay = importedPlaybackSource ?? container.querySelector<HTMLTextAreaElement>("[data-song-source]")!.value;
      await play(compile(sourceToPlay), { bpm });
    });
  };
  render();
  return { destroy: () => { stop(); container.remove(); } };
}
