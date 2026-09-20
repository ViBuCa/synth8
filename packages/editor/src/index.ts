import { compile } from "@vibuca/synth8-core";
import { getPlaybackDuration, getPlaybackPosition, pause, play, resume, setMasterGain, stop } from "@vibuca/synth8-player";
import { DEFAULT_SONG_SOURCE } from "./default-song";

export { DEFAULT_SONG_SOURCE } from "./default-song";
export * from "./midi-recorder";

export type EditorOptions = { bars?: number; beatsPerBar?: number; bpm?: number };
type Articulation = "" | "accent" | "staccato" | "legato" | "slide" | "vibrato" | "mute";
type Note = { start: number; pitch: number; duration: number; velocity: number; articulation?: Articulation; bend?: number };
type Envelope = { attack: number; decay: number; sustain: number; release: number };
type Sound = "square" | "triangle" | "sawtooth" | "sine" | "pulse12" | "pulse25" | "pulse50" | "pulse75" | "noise" | "wavetable";
type Melody = { name: string; enabled?: boolean; notes: Note[]; sound: Sound; preset?: string; gain: number; pan: number; echo: number; reverb: number; cutoff: number; resonance: number; envelope: Envelope; delay?: number; room?: number; highpass?: number; distortion?: number; chorus?: number; vibratoRate?: number; vibratoDepth?: number; vibratoDelay?: number; portamento?: number; };
type DrumHit = { start: number; drum: string };
type DrumTrack = { name: string; enabled?: boolean; hits: DrumHit[]; bank: string; gain: number; pan: number; echo: number; reverb: number; delay?: number; room?: number; distortion?: number; chorus?: number; };

// Chromatic rows, highest first. The editor now includes every semitone.
const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const SOUNDS = ["square", "triangle", "sawtooth", "sine", "pulse12", "pulse25", "pulse50", "pulse75", "noise", "wavetable"] as const;
const DRUMS = ["kick", "snare", "clap", "hihat", "openhat", "tom", "lowtom", "midtom", "hitom", "rim", "cowbell", "crash", "ride", "shaker"];

function noteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

function visiblePitches(topOctave: number): number[] {
  const topMidi = (topOctave + 1) * 12;
  // Keep a broad pitch range in the roll so a song's notes are visible
  // together instead of hiding most of a multi-octave example behind paging.
  return Array.from({ length: 37 }, (_, index) => topMidi - index);
}

function installStyle() {
  if (document.getElementById("synth8-editor-style")) return;
  const element = document.createElement("style");
  element.id = "synth8-editor-style";
  element.textContent = `
    .s8-editor { color:#f8f8f2; background:#171724; border:1px solid #44475a; border-radius:12px; padding:18px; font:14px system-ui,sans-serif; }
    .s8-editor h2 { margin:0 0 6px; } .s8-editor p { color:#c7c7d8; margin:0 0 14px; }
    .s8-editor-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:14px; padding:12px; border:1px solid #34364d; border-radius:10px; background:#1b1b2b; }
    .s8-control-group { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:7px 9px; border-left:2px solid #6272a4; }
    .s8-control-group-title { color:#8be9fd; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; width:100%; }
    .s8-editor-toolbar label { color:#d8d9e8; font-size:13px; white-space:nowrap; } .s8-editor-toolbar input[type="range"] { accent-color:#8be9fd; width:74px; }
    .s8-editor-toolbar button { transition:background .12s, transform .12s; } .s8-editor-toolbar button:active { transform:translateY(1px); }
    .s8-icon-button { min-width:82px; font-weight:600; } .s8-icon { font-size:16px; margin-right:5px; }
    .s8-transport-play { border-color:#50fa7b !important; } .s8-transport-pause { border-color:#f1fa8c !important; }
    .s8-transport-resume { border-color:#8be9fd !important; } .s8-transport-stop { border-color:#ff5555 !important; }
    .s8-value { color:#f1fa8c; font-variant-numeric:tabular-nums; }
    .s8-global-controls { flex-direction:column; align-items:stretch; }
    .s8-global-controls > .s8-control-group:first-child { flex-direction:row; align-items:center; min-width:0; }
    .s8-global-controls > .s8-control-group:first-child .s8-control-group-title { width:auto; margin-right:4px; }
    .s8-global-controls > .s8-control-group:first-child .s8-control-group-title { width:auto; }
    .s8-instrument-controls { align-items:stretch; gap:12px; }
    .s8-control-section { display:flex; flex-direction:column; gap:7px; padding:6px 10px; border-left:1px solid #44475a; }
    .s8-control-section-title { color:#8be9fd; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    .s8-control-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
    .s8-control-row label { min-height:28px; }
    .s8-song-controls { flex:1; align-items:stretch; }
    .s8-song-metrics, .s8-song-timing, .s8-song-loop { display:flex; align-items:center; flex-wrap:wrap; gap:10px; padding:6px 10px; border-left:1px solid #44475a; }
    .s8-song-metrics { min-width:190px; justify-content:space-around; } .s8-song-timing { min-width:190px; } .s8-song-loop { min-width:220px; }
    .s8-song-controls > label { margin-left:auto; padding:6px 10px; }
    .s8-pitch-toolbar { display:flex; align-items:stretch; gap:12px; padding:10px 12px; margin-bottom:14px; border:1px solid #34364d; border-radius:10px; background:#1b1b2b; }
    .s8-octave-stepper { display:flex; flex-direction:column; justify-content:space-between; align-items:stretch; gap:4px; min-width:96px; }
    .s8-octave-stepper strong { text-align:center; color:#8be9fd; font-size:12px; white-space:nowrap; }
    .s8-octave-stepper button { padding:4px 8px; }
    .s8-song-overview { position:relative; display:grid; flex:1; min-width:260px; height:150px; overflow:hidden; border:1px solid #6272a4; border-radius:5px; background:#101018; cursor:pointer; }
    .s8-song-overview-cell { min-width:0; min-height:0; background:#1b1b2b; border-right:1px solid #282a36; border-bottom:1px solid #282a36; }
    .s8-song-overview-cell.in-y { background:#303344; } .s8-song-overview-cell.has-note { background:#50fa7b; border-right-color:#50fa7b; }
    .s8-song-overview-cell.in-y.has-note { background:#f1fa8c; border-right-color:#f1fa8c; }
    .s8-song-overview-note { position:absolute; z-index:1; min-width:2px; box-sizing:border-box; border:1px solid #b7ffca; border-radius:3px; background:#50fa7b; pointer-events:none; }
    .s8-song-overview-note.is-playing-note, .s8-editor-roll-note.is-playing-note { background:#ffb86c; border-color:#ffe0b2; box-shadow:0 0 8px #ffb86c; }
    .s8-song-overview-viewport { position:absolute; top:0; bottom:0; border:2px solid #ff79c6; background:rgba(255,121,198,.12); pointer-events:none; }
    .s8-song-overview-y-viewport { position:absolute; left:0; right:0; border:2px solid #8be9fd; background:rgba(139,233,253,.08); pointer-events:none; }
    .s8-editor-toolbar input[type="number"] { color:#f8f8f2; background:#101018; border:1px solid #6272a4; border-radius:5px; padding:5px; }
    .s8-editor-melodies button.is-active, .s8-editor-tabs button.is-active { background:#50fa7b; color:#101018; }
    .s8-editor-tabs { border-bottom:1px solid #44475a; padding-bottom:10px; } .s8-editor-tabs button { min-width:120px; font-size:15px; }
    .s8-editor-melodies, .s8-editor-drum-title, .song-section { border:1px solid #44475a; border-radius:8px; padding:10px; background:#1b1b2b; }
    .s8-editor [hidden], .s8-editor[data-tab="melody"] .drum-section, .s8-editor[data-tab="drums"] .melody-section { display:none !important; }
    .s8-editor[data-playback="starting"] .s8-editor-grid, .s8-editor[data-playback="starting"] .s8-editor-drum-grid, .s8-editor[data-playback="starting"] .s8-instrument-controls, .s8-editor[data-playback="starting"] .s8-editor-melodies,
    .s8-editor[data-playback="playing"] .s8-editor-grid, .s8-editor[data-playback="playing"] .s8-editor-drum-grid, .s8-editor[data-playback="playing"] .s8-editor-instrument-controls, .s8-editor[data-playback="playing"] .s8-instrument-controls, .s8-editor[data-playback="playing"] .s8-editor-melodies, .s8-editor[data-playback="playing"] .drum-section > .s8-editor-toolbar { pointer-events:none; opacity:.65; }
    .s8-playback-status { display:flex; align-items:center; gap:8px; color:#f1fa8c; min-height:24px; }
    .s8-playback-status progress { width:140px; accent-color:#8be9fd; }
    .song-section { margin-top:18px; } .song-section h3 { margin:0 0 10px; }
    .s8-editor button,.s8-editor select { background:#282a36; color:#f8f8f2; border:1px solid #6272a4; border-radius:6px; padding:7px 10px; }
    .s8-editor button:hover { background:#44475a; cursor:pointer; } .s8-editor label { margin:0; display:flex; gap:6px; align-items:center; }
    .s8-editor-grid { display:grid; grid-template-columns:52px 1fr; overflow:auto; border:1px solid #44475a; background:#101018; position:relative; --playhead:0px; }
    .s8-editor-grid::after { display:none; }
    .s8-editor-playhead { position:absolute; top:0; bottom:0; width:2px; background:#ff5555; box-shadow:0 0 6px #ff5555; pointer-events:none; z-index:4; }
    .s8-editor-labels { display:grid; grid-template-rows:repeat(25, 28px); position:sticky; left:0; z-index:2; background:#1b1b2b; }
    .s8-editor-labels span { padding:6px 7px; border-bottom:1px solid #282a36; color:#f8f8f2; }
    .s8-editor-labels span.white { background:#303344; } .s8-editor-labels span.black { color:#8be9fd; background:#11111c; }
    .s8-editor-roll { display:grid; grid-template-columns:repeat(32, 34px); grid-template-rows:repeat(25, 28px); min-width:max-content; position:relative; }
    .s8-editor-cell { border-right:1px solid #282a36; border-bottom:1px solid #282a36; }
    .s8-editor-cell.white { background:#252738; } .s8-editor-cell.black { background:#14141f; }
    .s8-editor-cell.white.beat { border-right-color:#8490c0; } .s8-editor-cell.black.beat { border-right-color:#6272a4; }
    .s8-editor-cell.beat { border-right-color:#6272a4; } .s8-editor-cell:hover { background:#44475a; }
    .s8-editor-cell.preview-add { background:rgba(80,250,123,.35); box-shadow:inset 0 0 0 1px #50fa7b; }
    .s8-editor-cell.preview-remove { background:rgba(255,85,85,.35); box-shadow:inset 0 0 0 1px #ff5555; }
    .s8-editor-cell.note { background:transparent; border-right-color:#282a36; box-shadow:none; }
    .s8-editor-roll-note { position:absolute; z-index:2; min-width:2px; box-sizing:border-box; border:1px solid #b7ffca; border-radius:5px; background:#50fa7b; opacity:.95; pointer-events:none; }
    .s8-editor-cell.bar { border-right-color:#b7c3ff; border-right-width:2px; }
    .s8-editor-cell.note-start { border-radius:5px 0 0 5px; }
    .s8-editor-cell.note-end { border-right-color:#282a36; }
    .s8-editor-cell.note { cursor:grab; } .s8-editor-cell.note:active { cursor:grabbing; }
    .s8-editor-cell.note-end { border-radius:0 5px 5px 0; cursor:ew-resize; }
    .s8-editor-source { width:100%; box-sizing:border-box; min-height:80px; margin-top:14px; padding:10px; color:#f8f8f2; background:#101018; border:1px solid #44475a; border-radius:6px; font:13px monospace; }
    .s8-editor-drum-title { margin:18px 0 8px; } .s8-editor-drum-grid { display:grid; grid-template-columns:78px 1fr; overflow:auto; border:1px solid #44475a; background:#101018; }
    .s8-editor-drum-labels { display:grid; grid-template-rows:repeat(14,28px); position:sticky; left:0; z-index:2; background:#1b1b2b; }
    .s8-editor-drum-labels span { padding:6px 7px; border-bottom:1px solid #282a36; color:#c7c7d8; }
    .s8-editor-drum-roll { display:grid; grid-template-rows:repeat(14,28px); min-width:max-content; }
    .s8-editor-drum-cell { border:0; border-right:1px solid #282a36; border-bottom:1px solid #282a36; background:#252738; }
    .s8-editor-drum-roll { position:relative; }
    .s8-editor-drum-playhead { position:absolute; top:0; bottom:0; width:2px; background:#ff5555; box-shadow:0 0 6px #ff5555; pointer-events:none; z-index:4; }
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
  let songComment = "Johann Sebastian Bach — Invention No. 1 in C major, BWV 772";
  let loopEnabled = false;
  let loopStart = 0;
  let loopEnd = columns;
  let timeViewStart = 0;
  let editorTab: "melody" | "drums" = "melody";
  // Preserve the original imported source for faithful playback. The grid is
  // intentionally a simplified editable view and cannot represent every
  // fractional timing/sequence construct from the DSL.
  let importedPlaybackSource: string | undefined;
  let history: string[] = [];
  let historyIndex = -1;
  let pendingHistory = false;
  const snapshot = () => JSON.stringify({ melodies, drumTracks, activeMelody, activeDrumTrack, notes, columns, bpm, masterGain });
  const markEdited = () => { pendingHistory = true; importedPlaybackSource = undefined; };
  const restoreSnapshot = (value: string) => {
    const state = JSON.parse(value);
    melodies = state.melodies; drumTracks = state.drumTracks; activeMelody = state.activeMelody; activeDrumTrack = state.activeDrumTrack; notes = melodies[activeMelody].notes; columns = state.columns; bpm = state.bpm; masterGain = state.masterGain; render();
  };
  const gridStep = 0.25;
  let noteLength = 1;
  let quantizeStep = gridStep;
  let velocity = 0.8;
  let articulation: Articulation = "";
  let bend = 0;
  let notes: Note[] = [
    { start: 0, pitch: 72, duration: 1, velocity: 0.8 }, { start: 2, pitch: 75, duration: 1, velocity: 0.8 },
    { start: 4, pitch: 79, duration: 1, velocity: 0.65 }, { start: 6, pitch: 72, duration: 2, velocity: 0.8 },
    { start: 8, pitch: 66, duration: 1, velocity: 0.8 }, { start: 10, pitch: 72, duration: 1, velocity: 0.8 }, { start: 11, pitch: 73, duration: 1, velocity: 0.65 },
  ];
  let melodies: Melody[] = [{ name: "Melody 1", notes, sound: "square", gain: 0.8, pan: 0, echo: 0, reverb: 0, cutoff: 20000, resonance: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 } }];
  let activeMelody = 0;
  let drumTracks: DrumTrack[] = [{ name: "Drums 1", hits: [{ start: 0, drum: "kick" }, { start: 2, drum: "snare" }, { start: 4, drum: "kick" }, { start: 6, drum: "snare" }], bank: "default", gain: 0.8, pan: 0, echo: 0, reverb: 0 }];
  let activeDrumTrack = 0;
  let positionSeconds = 0;
  let playbackDurationSeconds = 0;
  let positionTimer: number | undefined;
  let positionClockStart = 0;
  let isPlaying = false;
  let isPaused = false;
  let isStarting = false;

  const container = document.createElement("section");
  container.className = "s8-editor";
  root.replaceChildren(container);

  const songLengthSeconds = () => playbackDurationSeconds || columns * 60 / Math.max(1, bpm);
  const updatePositionView = () => {
    const length = songLengthSeconds();
    const position = length > 0 ? Math.min(length, positionSeconds) : 0;
    const musicalPosition = position * bpm / 60;
    const positionLabel = container.querySelector<HTMLElement>("[data-position]");
    if (positionLabel) positionLabel.textContent = `${position.toFixed(1)}s`;
    const beatLabel = container.querySelector<HTMLElement>("[data-current-beat]");
    if (beatLabel) beatLabel.textContent = `Beat ${Math.min(columns, Math.floor(position * bpm / 60) + 1)}`;
    container.querySelectorAll<HTMLElement>(".s8-editor-cell, .s8-song-overview-note").forEach((element) => {
      const start = Number(element.dataset.start);
      const duration = Number(element.dataset.duration ?? 0);
      element.classList.toggle("is-playing-note", isPlaying && musicalPosition >= start && musicalPosition < start + duration);
    });
    const grid = container.querySelector<HTMLElement>(".s8-editor-grid");
    const roll = container.querySelector<HTMLElement>(".s8-editor-roll");
    if (grid && roll) {
      if (isPlaying) {
        const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
        const targetScroll = 52 + musicalPosition / Math.max(1, columns) * roll.scrollWidth - grid.clientWidth * 0.6;
        grid.scrollLeft = Math.max(0, Math.min(maxScroll, targetScroll));
      }
      const playheadPosition = position / Math.max(0.001, length) * roll.scrollWidth;
      const playhead = roll.querySelector<HTMLElement>(".s8-editor-playhead");
      if (playhead) playhead.style.left = `${playheadPosition}px`;
      const drumGrid = container.querySelector<HTMLElement>(".s8-editor-drum-grid");
      const drumRoll = container.querySelector<HTMLElement>(".s8-editor-drum-roll");
      const drumPlayhead = drumRoll?.querySelector<HTMLElement>(".s8-editor-drum-playhead");
      if (drumPlayhead && drumRoll) {
        const drumPosition = position / Math.max(0.001, length) * drumRoll.scrollWidth;
        drumPlayhead.style.left = `${drumPosition}px`;
        if (isPlaying && drumGrid) drumGrid.scrollLeft = Math.max(0, Math.min(drumGrid.scrollWidth - drumGrid.clientWidth, drumPosition - drumGrid.clientWidth * 0.6));
      }
      roll.querySelectorAll<HTMLElement>(".s8-editor-roll-note").forEach((note) => {
        const noteStart = note.offsetLeft;
        note.classList.toggle("is-playing-note", isPlaying && playheadPosition >= noteStart && playheadPosition < noteStart + note.offsetWidth);
      });
    }
  };
  const stopPosition = () => { if (positionTimer !== undefined) window.clearInterval(positionTimer); positionTimer = undefined; };
  const startPosition = () => { stopPosition(); positionClockStart = performance.now() - positionSeconds * 1000; positionTimer = window.setInterval(() => { positionSeconds = getPlaybackPosition() || (performance.now() - positionClockStart) / 1000; if (positionSeconds >= songLengthSeconds()) { if (loopEnabled) { positionSeconds = loopStart * 60 / bpm; positionClockStart = performance.now() - positionSeconds * 1000; } else { positionSeconds = songLengthSeconds(); isPlaying = false; isPaused = false; stopPosition(); render(); } } updatePositionView(); }, 50); };

  const melodySource = (melody: Melody) => {
    const melodyNotes = melody.notes;
    const tokens = Array.from({ length: Math.ceil(columns / gridStep) }, (_, index) => {
      const time = index * gridStep;
      const atStart = melodyNotes
        .filter((item) => Math.abs(item.start - time) < 0.001)
        .sort((a, b) => a.pitch - b.pitch);
      if (atStart.length === 0) return "_";

      // Several notes starting on the same beat are exported as one parallel
      // Synth8 token, so stacked piano-roll notes remain a chord in playback.
      const duration = Math.max(...atStart.map((item) => item.duration));
      const durationUnits = Math.max(1, Math.round(duration / gridStep));
      // Export at the same sixteenth-beat resolution used by the piano roll,
      // preserving short imported notes when an editor change regenerates the song.
      const chord = atStart.map((item) => `${noteName(item.pitch)}${durationUnits === 1 && item.velocity !== 1 ? `:${item.velocity}` : ""}${item.articulation || item.bend !== undefined ? `{${item.bend !== undefined ? `bend:${item.bend >= 0 ? "+" : ""}${item.bend}` : item.articulation}}` : ""}`).join("+");
      return `${chord}${durationUnits === 1 ? "" : `/${durationUnits}`}`;
    });
    const envelope = melody.envelope;
    const instrument = melody.preset ? `.preset("${melody.preset}")` : `.sound("${melody.sound}")`;
    const pitch = melody.vibratoRate ? `.vibrato(${melody.vibratoRate},${melody.vibratoDepth ?? 0},${melody.vibratoDelay ?? 0})` : "";
    const highpass = melody.highpass !== undefined && melody.highpass >= 20 ? `.highpass(${melody.highpass})` : "";
    return `melody("${tokens.join(" ")}").fast(4)${instrument}.gain(${melody.gain.toFixed(2)}).pan(${melody.pan}).attack(${envelope.attack}).decay(${envelope.decay}).sustain(${envelope.sustain}).release(${envelope.release}).echo(${melody.echo}).reverb(${melody.reverb}).delay(${melody.delay ?? 0}).room(${melody.room ?? 0}).lowpass(${melody.cutoff})${highpass}.resonance(${melody.resonance}).distortion(${melody.distortion ?? 0}).chorus(${melody.chorus ?? 0}).portamento(${melody.portamento ?? 0})${pitch}${loopEnabled ? ".loop()" : ""}`;
  };

  const drumSource = (track: DrumTrack) => {
    const tokens = Array.from({ length: columns }, (_, index) => {
      const atStart = track.hits.filter((hit) => hit.start === index).map((hit) => hit.drum);
      return atStart.length ? atStart.join("+") : "_";
    });
    return `beat("${tokens.join(" ")}").bank("${track.bank}").gain(${track.gain.toFixed(2)}).pan(${track.pan}).echo(${track.echo}).reverb(${track.reverb}).delay(${track.delay ?? 0}).room(${track.room ?? 0}).distortion(${track.distortion ?? 0}).chorus(${track.chorus ?? 0})${loopEnabled ? ".loop()" : ""}`;
  };

  const source = () => {
    melodies[activeMelody].notes = notes;
    const melodyParts = melodies.filter((melody) => melody.enabled !== false).map((melody) => `  // ${melody.name.replace(/[\\r\\n]/g, " ")}\n  ${melodySource(melody)}`);
    const drumParts = drumTracks.filter((track) => track.enabled !== false).map((track) => `  // ${track.name.replace(/[\\r\\n]/g, " ")}\n  ${drumSource(track)}`);
    return `// ${songComment}\n// BPM: ${bpm}\nsong(\n${[...melodyParts, ...drumParts].join(",\n\n")}\n)`;
  };

  const noteToMidi = (value: string): number => {
    const match = value.match(/^([a-g])(#|b)?([0-8])$/i);
    if (!match) return 60;
    const base = ({ c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 } as Record<string, number>)[match[1].toLowerCase()];
    return (Number(match[3]) + 1) * 12 + base + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
  };

  const startPlayback = async () => {
    if (isStarting || isPlaying) return;
    isStarting = true;
    render();
    try {
      bpm = Number(container.querySelector<HTMLInputElement>("[data-bpm]")?.value) || bpm;
    const sourceToPlay = importedPlaybackSource ?? container.querySelector<HTMLTextAreaElement>("[data-song-source]")!.value;
    const pattern = compile(sourceToPlay);
    // The editor owns the master loop switch. The core represents song()
    // containers as loopable patterns for general playback, so explicitly
    // override that default here.
    pattern.loop = loopEnabled;
    await play(pattern, { bpm, playbackMode: "rendered" });
    setMasterGain(masterGain);
    playbackDurationSeconds = getPlaybackDuration();
      positionSeconds = 0; isStarting = false; isPlaying = true; isPaused = false; render(); updatePositionView(); startPosition();
    } catch (error) {
      isStarting = false;
      render();
      window.alert(error instanceof Error ? error.message : String(error));
    }
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
        importedMelodies.push({ name: `Melody ${importedMelodies.length + 1}`, enabled: true, preset: playback.preset, sound: (playback.sound as Sound) ?? "square", gain: playback.gain ?? 0.8, pan: playback.pan ?? 0, echo: playback.effects?.echo ?? 0, reverb: playback.effects?.reverb ?? 0, cutoff: playback.filter?.cutoff ?? 20000, resonance: playback.filter?.resonance ?? 0, delay: playback.effects?.delay, room: playback.effects?.room, highpass: playback.effects?.highpass, distortion: playback.effects?.distortion, chorus: playback.effects?.chorus, vibratoRate: playback.pitch?.vibratoRate, vibratoDepth: playback.pitch?.vibratoDepth, vibratoDelay: playback.pitch?.vibratoDelay, portamento: playback.pitch?.portamento, envelope: { attack: playback.envelope?.attack ?? 0.01, decay: playback.envelope?.decay ?? 0.1, sustain: playback.envelope?.sustain ?? 0.7, release: playback.envelope?.release ?? 0.2 }, notes: layer.events.filter((event) => event.type === "note").map((event) => ({ start: event.time, pitch: noteToMidi(event.value), duration: event.dur, velocity: event.velocity ?? 0.8, articulation: event.articulation, bend: event.bend })) });
      } else if (layer.events.some((event) => event.type === "drum")) {
        importedDrums.push({ name: `Drums ${importedDrums.length + 1}`, enabled: true, bank: playback.bank ?? "default", gain: playback.gain ?? 0.8, pan: playback.pan ?? 0, echo: playback.effects?.echo ?? 0, reverb: playback.effects?.reverb ?? 0, delay: playback.effects?.delay, room: playback.effects?.room, distortion: playback.effects?.distortion, chorus: playback.effects?.chorus, hits: layer.events.filter((event) => event.type === "drum").map((event) => ({ start: event.time, drum: event.value })) });
      }
    }
    melodies = importedMelodies.length ? importedMelodies : [{ name: "Melody 1", notes: [], sound: "square", gain: 0.8, pan: 0, echo: 0, reverb: 0, cutoff: 20000, resonance: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 } }];
    drumTracks = importedDrums.length ? importedDrums : [{ name: "Drums 1", hits: [], bank: "default", gain: 0.8, pan: 0, echo: 0, reverb: 0 }];
    activeMelody = 0; activeDrumTrack = 0; notes = melodies[0].notes; columns = Math.max(1, Math.min(128, Math.ceil(end)));
    history = [snapshot()]; historyIndex = 0;
    render();
  };

  const render = () => {
    if (pendingHistory && history[historyIndex] !== snapshot()) { history = history.slice(0, historyIndex + 1); history.push(snapshot()); historyIndex++; pendingHistory = false; }
    container.dataset.tab = editorTab;
    container.dataset.playback = isStarting ? "starting" : isPlaying ? "playing" : isPaused ? "paused" : "stopped";
    const pitches = visiblePitches(topOctave);
    const gridColumns = Math.ceil(columns / gridStep);
    const generated = source();
    const previousGridScrollLeft = container.querySelector<HTMLElement>(".s8-editor-grid")?.scrollLeft ?? 0;
    container.innerHTML = `<h2>Sketch Editor</h2><p>Choose a track type below. Click to add/remove. Drag melody notes to move them; drag their right edge to resize.</p>
      <div class="s8-editor-toolbar s8-editor-tabs"><button data-tab="melody" class="${editorTab === "melody" ? "is-active" : ""}">Melodies</button><button data-tab="drums" class="${editorTab === "drums" ? "is-active" : ""}">Drums</button><button data-action="clear" title="Clear the active track">Clear track</button><button data-action="undo" title="Undo" ${historyIndex <= 0 ? "disabled" : ""}>↶ Undo</button><button data-action="redo" title="Redo" ${historyIndex + 1 >= history.length ? "disabled" : ""}>↷ Redo</button></div>
      <div class="s8-editor-toolbar s8-global-controls"><div class="s8-control-group"><span class="s8-control-group-title">Transport</span><button class="s8-icon-button s8-transport-play" data-action="play" title="Start the song" ${isPlaying || isStarting ? "disabled" : ""}><span class="s8-icon">▶</span>Play</button><button class="s8-icon-button s8-transport-pause" data-action="pause-resume" title="Pause or resume the song" ${!isPlaying && !isPaused ? "disabled" : ""}><span class="s8-icon">${isPaused ? "▶" : "Ⅱ"}</span>${isPaused ? "Resume" : "Pause"}</button><button class="s8-icon-button s8-transport-stop" data-action="stop" title="Stop and reset the song" ${!isPlaying && !isPaused ? "disabled" : ""}><span class="s8-icon">■</span>Stop</button><span class="s8-playback-status" data-playback-status>${isStarting ? "Preparing playback… <progress></progress>" : isPlaying ? "Playing" : isPaused ? "Paused" : ""}</span></div><div class="s8-control-group s8-song-controls"><span class="s8-control-group-title">Song</span><div class="s8-song-metrics"><span class="s8-value" data-current-beat>Beat 1</span><span>Position <strong class="s8-value" data-position>0.0s</strong></span><span>Duration <strong class="s8-value" data-song-length>${(columns * 60 / bpm).toFixed(1)}s</strong></span></div><div class="s8-song-timing"><label>BPM <input data-bpm type="number" min="40" max="240" value="${bpm}" style="width:60px"></label><label>Length <input data-columns type="number" min="1" max="128" value="${columns}" style="width:60px"> beats</label></div><div class="s8-song-loop"><label><input data-loop type="checkbox" ${loopEnabled ? "checked" : ""}> Loop playback</label><label>From <input data-loop-start type="number" min="0" max="${columns}" value="${loopStart}" style="width:48px"></label><label>To <input data-loop-end type="number" min="1" max="${columns}" value="${loopEnd}" style="width:48px"></label></div><label>Master volume <input data-master-gain type="range" min="0" max="1" step="0.05" value="${masterGain}"></label></div></div>
      <div class="melody-section" ${editorTab === "melody" ? "" : "hidden"}><div class="s8-editor-toolbar s8-editor-melodies"><strong>Melodies:</strong>${melodies.map((melody, index) => `<button data-melody="${index}" class="${index === activeMelody ? "is-active" : ""}">${melody.name}</button><button data-melody-toggle="${index}" class="s8-track-toggle" title="${melody.enabled === false ? "Enable" : "Disable"} ${melody.name}">${melody.enabled === false ? "○" : "●"}</button>`).join("")}<button data-action="new-melody">+ New melody</button><button data-action="duplicate-melody">Duplicate</button><button data-action="delete-melody">Delete</button><label>Name <input data-melody-name value="${melodies[activeMelody].name.replace(/"/g, "&quot;")}" style="width:110px"></label></div>
      <div class="s8-pitch-toolbar"><div class="s8-octave-stepper"><button data-action="octave-up" ${topOctave >= 8 ? "disabled" : ""} title="Show higher pitches">▲ Higher</button><strong>${noteName(pitches[pitches.length - 1])}–${noteName(pitches[0])}</strong><button data-action="octave-down" ${topOctave <= 1 ? "disabled" : ""} title="Show lower pitches">▼ Lower</button></div><div class="s8-song-overview" title="Song overview: pink is the time viewport, cyan is the pitch viewport" style="grid-template-columns:repeat(${Math.min(columns, 64)},1fr);grid-template-rows:repeat(73,1fr)">${Array.from({ length: 73 }, (_, row) => { const midi = 96 - row; return Array.from({ length: Math.min(columns, 64) }, (_, column) => { const inY = midi >= pitches[pitches.length - 1] && midi <= pitches[0]; return `<span class="s8-song-overview-cell ${inY ? "in-y" : ""}" data-overview-column="${column}" data-overview-midi="${midi}"></span>`; }).join(""); }).join("")}${notes.map((note) => `<span class="s8-song-overview-note" data-start="${note.start}" data-duration="${note.duration}" style="left:${note.start / Math.max(1, columns) * 100}%;top:${(96 - note.pitch) / 73 * 100}%;width:${Math.max(0.5, note.duration / Math.max(1, columns) * 100)}%;height:${100 / 73}%"></span>`).join("")}<span class="s8-song-overview-viewport" style="left:${Math.min(100, timeViewStart / Math.max(1, columns) * 100)}%;width:${Math.min(100, Math.min(columns, 32) / Math.max(1, columns) * 100)}%"></span><span class="s8-song-overview-y-viewport" style="top:${(96 - pitches[0]) / 73 * 100}%;height:${pitches.length / 73 * 100}%"></span></div></div>
      <div class="s8-editor-toolbar s8-instrument-controls">
      <div class="s8-control-section"><span class="s8-control-section-title">Instrument</span><div class="s8-control-row"><label>Sound <select data-sound>${SOUNDS.map((item) => `<option ${item === melodies[activeMelody].sound ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Preset <select data-preset><option value="" ${!melodies[activeMelody].preset ? "selected" : ""}>None</option>${["chip-lead","chip-bass","soft-pad","metal-rhythm","arcade-pluck","deep-bass","warm-pad","glass-lead","metal-lead","synth-brass","dark-pad","warm-keys","anthem-lead","palm-muted","arena-chords","picked-bass","orchestra-hit"].map((item) => `<option value="${item}" ${melodies[activeMelody].preset === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div></div>
      <div class="s8-control-section"><span class="s8-control-section-title">Mix &amp; space</span><div class="s8-control-row"><label>Gain <input data-track-gain type="number" min="0" max="1" step="0.05" value="${melodies[activeMelody].gain}" style="width:55px"></label><label>Pan <input data-pan type="range" min="-1" max="1" step="0.05" value="${melodies[activeMelody].pan}"></label><label>Echo <input data-echo type="range" min="0" max="1" step="0.05" value="${melodies[activeMelody].echo}"></label><label>Reverb <input data-reverb type="range" min="0" max="1" step="0.05" value="${melodies[activeMelody].reverb}"></label></div></div>
      <div class="s8-control-section"><span class="s8-control-section-title">Envelope</span><div class="s8-control-row"><label>Attack <input data-envelope="attack" type="number" min="0" step="0.01" value="${melodies[activeMelody].envelope.attack}" style="width:48px"></label><label>Decay <input data-envelope="decay" type="number" min="0" step="0.01" value="${melodies[activeMelody].envelope.decay}" style="width:48px"></label><label>Sustain <input data-envelope="sustain" type="number" min="0" max="1" step="0.05" value="${melodies[activeMelody].envelope.sustain}" style="width:48px"></label><label>Release <input data-envelope="release" type="number" min="0" step="0.01" value="${melodies[activeMelody].envelope.release}" style="width:48px"></label></div></div>
      <div class="s8-control-section"><span class="s8-control-section-title">Note expression</span><div class="s8-control-row"><label>Length <select data-length>${[0.25, 0.5, 1, 2, 4].map((item) => `<option value="${item}" ${item === noteLength ? "selected" : ""}>${item} beat${item === 1 ? "" : "s"}</option>`).join("")}</select></label><label>Snap <select data-quantize><option value="0.25" ${quantizeStep === 0.25 ? "selected" : ""}>1/16</option><option value="0.5" ${quantizeStep === 0.5 ? "selected" : ""}>1/8</option><option value="1" ${quantizeStep === 1 ? "selected" : ""}>1/4</option></select></label><label>Velocity <select data-velocity>${[0.25, 0.5, 0.65, 0.8, 1].map((item) => `<option value="${item}" ${item === velocity ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Articulation <select data-articulation>${["", "accent", "staccato", "legato", "slide", "vibrato", "mute"].map((item) => `<option value="${item}" ${item === articulation ? "selected" : ""}>${item || "normal"}</option>`).join("")}</select></label><label>Bend <input data-bend type="number" min="-24" max="24" step="1" value="${bend}" style="width:48px"></label></div></div>
      <div class="s8-control-section"><span class="s8-control-section-title">Tone</span><div class="s8-control-row"><label>Cutoff <input data-cutoff type="number" min="20" max="20000" step="100" value="${melodies[activeMelody].cutoff}" style="width:72px"></label><label>Resonance <input data-resonance type="number" min="0" max="1" step="0.05" value="${melodies[activeMelody].resonance}" style="width:55px"></label></div></div>
      <div class="s8-control-section"><span class="s8-control-section-title">Effects</span><div class="s8-control-row"><label>Delay <input data-fx="delay" type="range" min="0" max="1" step="0.05" value="${melodies[activeMelody].delay ?? 0}"></label><label>Room <input data-fx="room" type="range" min="0" max="1" step="0.05" value="${melodies[activeMelody].room ?? 0}"></label><label>Drive <input data-fx="distortion" type="range" min="0" max="1" step="0.05" value="${melodies[activeMelody].distortion ?? 0}"></label><label>Chorus <input data-fx="chorus" type="range" min="0" max="1" step="0.05" value="${melodies[activeMelody].chorus ?? 0}"></label><label>Vibrato <input data-vibrato-rate type="number" min="0" max="20" step="0.1" value="${melodies[activeMelody].vibratoRate ?? 0}" style="width:52px"> Hz</label><label>Portamento <input data-portamento type="number" min="0" max="1" step="0.01" value="${melodies[activeMelody].portamento ?? 0}" style="width:52px"></label></div></div></div>
      <div class="s8-editor-grid"><div class="s8-editor-labels" style="grid-template-rows:repeat(${pitches.length},28px)">${pitches.map((midi) => `<span class="${NOTE_NAMES[midi % 12].includes("#") ? "black" : "white"}">${noteName(midi)}</span>`).join("")}</div><div class="s8-editor-roll" style="grid-template-columns:repeat(${gridColumns},34px);grid-template-rows:repeat(${pitches.length},28px);width:${gridColumns * 34}px">
      ${pitches.flatMap((midi) => Array.from({ length: Math.ceil(columns / gridStep) }, (_, column) => { const time = column * gridStep;
        const note = notes.find((item) => item.pitch === midi && time >= item.start && time < item.start + item.duration);
        const start = notes.some((item) => item.pitch === midi && Math.abs(item.start - time) < 0.001);
        const keyClass = NOTE_NAMES[midi % 12].includes("#") ? "black" : "white";
        const end = note && time + gridStep >= note.start + note.duration;
        return `<button class="s8-editor-cell ${keyClass} ${Math.abs(time % beatsPerBar) < 0.001 ? "beat bar" : ""} ${note ? "note" : ""} ${start ? "note-start" : ""} ${end ? "note-end" : ""}" data-pitch="${midi}" data-start="${time}" data-duration="${note?.duration ?? 0}" aria-label="${noteName(midi)} beat ${time + gridStep}"></button>`;
      })).join("")}${notes.map((note) => `<span class="s8-editor-roll-note" data-start="${note.start}" data-duration="${note.duration}" style="left:${note.start / Math.max(1, columns) * 100}%;top:${(pitches[0] - note.pitch) / pitches.length * 100}%;width:${Math.max(0.5, note.duration / Math.max(1, columns) * 100)}%;height:${100 / pitches.length}%"></span>`).join("")}<span class="s8-editor-playhead"></span></div></div></div>
      <div class="drum-section" ${editorTab === "drums" ? "" : "hidden"}><h3 class="s8-editor-drum-title">Drum tracks</h3>
      <div class="s8-editor-toolbar s8-editor-melodies"><strong>Tracks:</strong>${drumTracks.map((track, index) => `<button data-drum-track="${index}" class="${index === activeDrumTrack ? "is-active" : ""}">${track.name}</button><button data-drum-toggle="${index}" class="s8-track-toggle" title="${track.enabled === false ? "Enable" : "Disable"} ${track.name}">${track.enabled === false ? "○" : "●"}</button>`).join("")}<button data-action="new-drum">+ New drum track</button><button data-action="duplicate-drum">Duplicate</button><button data-action="delete-drum">Delete</button><label>Name <input data-drum-name value="${drumTracks[activeDrumTrack].name.replace(/"/g, "&quot;")}" style="width:110px"></label></div>
      <div class="s8-editor-toolbar"><label>Kit <select data-drum-bank>${["default", "808", "909", "arcade", "chip"].map((item) => `<option ${item === drumTracks[activeDrumTrack].bank ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Gain <input data-drum-gain type="number" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].gain}" style="width:55px"></label><label>Pan <input data-drum-pan type="range" min="-1" max="1" step="0.05" value="${drumTracks[activeDrumTrack].pan}"></label><label>Echo <input data-drum-echo type="range" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].echo}"></label><label>Reverb <input data-drum-reverb type="range" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].reverb}"></label><label>Delay <input data-drum-delay type="range" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].delay ?? 0}"></label><label>Room <input data-drum-room type="range" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].room ?? 0}"></label><label>Drive <input data-drum-distortion type="range" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].distortion ?? 0}"></label><label>Chorus <input data-drum-chorus type="range" min="0" max="1" step="0.05" value="${drumTracks[activeDrumTrack].chorus ?? 0}"></label></div>
      <div class="s8-editor-drum-grid"><div class="s8-editor-drum-labels">${DRUMS.map((drum) => `<span>${drum}</span>`).join("")}</div><div class="s8-editor-drum-roll" style="grid-template-columns:repeat(${columns},34px);width:${columns * 34}px">
      ${DRUMS.flatMap((drum) => Array.from({ length: columns }, (_, column) => { const hit = drumTracks[activeDrumTrack].hits.some((item) => item.drum === drum && item.start === column); return `<button class="s8-editor-drum-cell ${column % beatsPerBar === 0 ? "beat" : ""} ${hit ? "hit" : ""}" data-drum="${drum}" data-start="${column}" aria-label="${drum} beat ${column + 1}"></button>`; })).join("")}<span class="s8-editor-drum-playhead"></span></div></div></div><div class="song-section"><h3>Song import/export</h3><textarea class="s8-editor-source" data-song-source readonly>${generated}</textarea><div class="s8-editor-toolbar"><button data-action="export-song">Export .synth8</button><label>Import .synth8 <input data-import-song type="file" accept=".synth8,.txt,text/plain"></label></div></div>`;
    // Do not leave the inactive editor in the DOM. This is deliberately a
    // removal rather than only a CSS hide, so melody mode has no drum grid.
    if (editorTab === "melody") {
      // Remove both the wrapper and the grid itself. The grid must not even
      // exist in the melody DOM, rather than merely being visually hidden.
      container.querySelectorAll(".drum-section, .s8-editor-drum-grid, .s8-editor-drum-title").forEach((element) => element.remove());
      // Keep pitch navigation visually attached to the roll, below it rather
      // than mixed into the instrument and note-entry controls.
      const pitchToolbar = container.querySelector<HTMLElement>(".s8-pitch-toolbar");
      const pianoGrid = container.querySelector<HTMLElement>(".s8-editor-grid");
      if (pitchToolbar && pianoGrid?.parentElement) pianoGrid.parentElement.insertBefore(pitchToolbar, pianoGrid.nextSibling);
    }

    const renderedGrid = container.querySelector<HTMLElement>(".s8-editor-grid");
    if (renderedGrid) renderedGrid.scrollLeft = previousGridScrollLeft;

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
    const clearCellPreview = () => container.querySelectorAll<HTMLElement>(".s8-editor-cell.preview-add, .s8-editor-cell.preview-remove").forEach((cell) => cell.classList.remove("preview-add", "preview-remove"));
    const showCellPreview = (pitch: number, start: number) => {
      clearCellPreview();
      const existing = notes.find((note) => note.pitch === pitch && start >= note.start && start < note.start + note.duration);
      container.querySelectorAll<HTMLElement>(".s8-editor-cell").forEach((cell) => {
        if (Number(cell.dataset.pitch) !== pitch) return;
        const time = Number(cell.dataset.start);
        const removing = Boolean(existing);
        const visible = removing ? time >= existing!.start && time < existing!.start + existing!.duration : time >= start && time < start + noteLength;
        if (visible) cell.classList.add(removing ? "preview-remove" : "preview-add");
      });
    };
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
      cell.addEventListener("pointerenter", () => showCellPreview(Number(cell.dataset.pitch), Number(cell.dataset.start)));
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
          notes.push({ start, pitch, duration: Math.min(noteLength, columns - start), velocity, ...(articulation ? { articulation } : {}), ...(bend ? { bend } : {}) });
        }
        render();
      });
    });
    container.querySelector<HTMLElement>(".s8-editor-roll")?.addEventListener("pointerleave", clearCellPreview);
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
    container.querySelectorAll<HTMLButtonElement>("[data-melody]").forEach((button) => button.addEventListener("click", () => {
      melodies[activeMelody].notes = notes;
      activeMelody = Number(button.dataset.melody);
      notes = melodies[activeMelody].notes;
      render();
    }));
    container.querySelectorAll<HTMLButtonElement>("[data-melody-toggle]").forEach((button) => button.addEventListener("click", () => { const index = Number(button.dataset.melodyToggle); melodies[index].enabled = melodies[index].enabled === false; markEdited(); render(); }));
    container.querySelector<HTMLButtonElement>('[data-action="new-melody"]')!.addEventListener("click", () => {
      markEdited();
      melodies[activeMelody].notes = notes;
      melodies.push({ name: `Melody ${melodies.length + 1}`, notes: [], sound: "square", gain: 0.8, pan: 0, echo: 0, reverb: 0, cutoff: 20000, resonance: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 } });
      activeMelody = melodies.length - 1;
      notes = melodies[activeMelody].notes;
      render();
    });
    container.querySelector<HTMLInputElement>("[data-melody-name]")!.addEventListener("change", (event) => {
      markEdited();
      melodies[activeMelody].name = (event.target as HTMLInputElement).value.trim() || `Melody ${activeMelody + 1}`;
      render();
    });
    container.querySelectorAll<HTMLButtonElement>("[data-drum-track]").forEach((button) => button.addEventListener("click", () => { activeDrumTrack = Number(button.dataset.drumTrack); render(); }));
    container.querySelectorAll<HTMLButtonElement>("[data-drum-toggle]").forEach((button) => button.addEventListener("click", () => { const index = Number(button.dataset.drumToggle); drumTracks[index].enabled = drumTracks[index].enabled === false; markEdited(); render(); }));
    container.querySelector<HTMLButtonElement>('[data-action="new-drum"]')?.addEventListener("click", () => { markEdited(); drumTracks.push({ name: `Drums ${drumTracks.length + 1}`, hits: [], bank: "default", gain: 0.8, pan: 0, echo: 0, reverb: 0 }); activeDrumTrack = drumTracks.length - 1; render(); });
    container.querySelector<HTMLInputElement>("[data-drum-name]")?.addEventListener("change", (event) => { markEdited(); drumTracks[activeDrumTrack].name = (event.target as HTMLInputElement).value.trim() || `Drums ${activeDrumTrack + 1}`; render(); });
    container.querySelectorAll<HTMLButtonElement>(".s8-editor-drum-cell").forEach((cell) => cell.addEventListener("click", () => {
      markEdited();
      const drum = cell.dataset.drum!; const start = Number(cell.dataset.start); const hits = drumTracks[activeDrumTrack].hits;
      const index = hits.findIndex((hit) => hit.drum === drum && hit.start === start);
      if (index >= 0) hits.splice(index, 1); else hits.push({ drum, start });
      render();
    }));
    container.querySelector<HTMLButtonElement>('[data-action="octave-down"]')!.addEventListener("click", () => { topOctave = Math.max(1, topOctave - 1); render(); });
    container.querySelector<HTMLButtonElement>('[data-action="octave-up"]')!.addEventListener("click", () => { topOctave = Math.min(8, topOctave + 1); render(); });
    container.querySelectorAll<HTMLElement>("[data-overview-midi]").forEach((cell) => cell.addEventListener("click", () => {
      const midi = Number(cell.dataset.overviewMidi); topOctave = Math.max(1, Math.min(8, Math.floor(midi / 12) - 1));
      if (cell.dataset.overviewColumn !== undefined) {
        timeViewStart = Math.max(0, Math.min(Math.max(0, columns - 32), Math.floor(Number(cell.dataset.overviewColumn) * columns / Math.min(columns, 64))));
        const grid = container.querySelector<HTMLElement>(".s8-editor-grid"); if (grid) grid.scrollLeft = timeViewStart / Math.max(1, columns - 32) * Math.max(0, grid.scrollWidth - grid.clientWidth);
      }
      render();
    }));
    container.querySelector<HTMLElement>(".s8-editor-grid")?.addEventListener("scroll", (event) => {
      const grid = event.currentTarget as HTMLElement; timeViewStart = Math.max(0, Math.min(Math.max(0, columns - 32), Math.round(grid.scrollLeft / Math.max(1, grid.scrollWidth - grid.clientWidth) * Math.max(0, columns - 32))));
      const viewport = container.querySelector<HTMLElement>(".s8-song-overview-viewport"); if (viewport) viewport.style.left = `${timeViewStart / Math.max(1, columns) * 100}%`;
      updatePositionView();
    });
    container.querySelector<HTMLElement>(".s8-editor-grid")?.addEventListener("wheel", (event) => { event.preventDefault(); if (Math.abs(event.deltaY) < 1) return; topOctave = Math.max(1, Math.min(8, topOctave + (event.deltaY < 0 ? 1 : -1))); render(); }, { passive: false });
    container.querySelector<HTMLInputElement>("[data-columns]")!.addEventListener("change", (event) => {
      markEdited();
      columns = Math.max(1, Math.min(128, Math.floor(Number((event.target as HTMLInputElement).value) || 1)));
      notes = notes.filter((note) => note.start < columns).map((note) => ({ ...note, duration: Math.min(note.duration, columns - note.start) }));
      render();
    });
    container.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => button.addEventListener("click", () => { editorTab = button.dataset.tab as "melody" | "drums"; render(); }));
    container.querySelector<HTMLInputElement>("[data-master-gain]")!.addEventListener("input", (event) => { masterGain = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0)); setMasterGain(masterGain); });
    container.querySelector<HTMLInputElement>("[data-master-gain]")!.addEventListener("change", () => { markEdited(); render(); });
    container.querySelector<HTMLInputElement>("[data-bpm]")!.addEventListener("change", (event) => { markEdited(); bpm = Math.max(40, Math.min(240, Number((event.target as HTMLInputElement).value) || 120)); render(); });
    container.querySelector<HTMLInputElement>("[data-loop]")!.addEventListener("change", (event) => { loopEnabled = (event.target as HTMLInputElement).checked; markEdited(); render(); });
    container.querySelector<HTMLInputElement>("[data-loop-start]")!.addEventListener("change", (event) => { markEdited(); loopStart = Math.max(0, Math.min(columns - 1, Number((event.target as HTMLInputElement).value) || 0)); loopEnd = Math.max(loopStart + 1, loopEnd); render(); });
    container.querySelector<HTMLInputElement>("[data-loop-end]")!.addEventListener("change", (event) => { markEdited(); loopEnd = Math.max(loopStart + 1, Math.min(columns, Number((event.target as HTMLInputElement).value) || columns)); render(); });
    container.querySelector<HTMLSelectElement>("[data-sound]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].preset = undefined; melodies[activeMelody].sound = (event.target as HTMLSelectElement).value as Sound; render(); });
    container.querySelector<HTMLSelectElement>("[data-preset]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].preset = (event.target as HTMLSelectElement).value || undefined; render(); });
    container.querySelector<HTMLInputElement>("[data-track-gain]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].gain = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0)); render(); });
    container.querySelector<HTMLInputElement>("[data-pan]")!.addEventListener("input", (event) => { melodies[activeMelody].pan = Number((event.target as HTMLInputElement).value); markEdited(); render(); });
    container.querySelector<HTMLInputElement>("[data-echo]")!.addEventListener("input", (event) => { melodies[activeMelody].echo = Number((event.target as HTMLInputElement).value); markEdited(); render(); });
    container.querySelector<HTMLInputElement>("[data-reverb]")!.addEventListener("input", (event) => { melodies[activeMelody].reverb = Number((event.target as HTMLInputElement).value); markEdited(); render(); });
    container.querySelectorAll<HTMLInputElement>("[data-fx]").forEach((input) => input.addEventListener("input", () => { markEdited(); (melodies[activeMelody] as unknown as Record<string, number>)[input.dataset.fx!] = Number(input.value); render(); }));
    container.querySelector<HTMLInputElement>("[data-vibrato-rate]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].vibratoRate = Number((event.target as HTMLInputElement).value) || undefined; melodies[activeMelody].vibratoDepth = melodies[activeMelody].vibratoRate ? 0.15 : undefined; render(); });
    container.querySelector<HTMLInputElement>("[data-portamento]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].portamento = Number((event.target as HTMLInputElement).value); render(); });
    container.querySelectorAll<HTMLInputElement>("[data-envelope]").forEach((input) => input.addEventListener("change", () => { markEdited(); const key = input.dataset.envelope as keyof Envelope; melodies[activeMelody].envelope[key] = Math.max(0, Number(input.value) || 0); render(); }));
    container.querySelector<HTMLInputElement>("[data-cutoff]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].cutoff = Math.max(20, Math.min(20000, Number((event.target as HTMLInputElement).value) || 20000)); render(); });
    container.querySelector<HTMLInputElement>("[data-resonance]")!.addEventListener("change", (event) => { markEdited(); melodies[activeMelody].resonance = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0)); render(); });
    container.querySelector<HTMLSelectElement>("[data-drum-bank]")?.addEventListener("change", (event) => { markEdited(); drumTracks[activeDrumTrack].bank = (event.target as HTMLSelectElement).value; render(); });
    container.querySelector<HTMLInputElement>("[data-drum-gain]")?.addEventListener("change", (event) => { markEdited(); drumTracks[activeDrumTrack].gain = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0)); render(); });
    container.querySelector<HTMLInputElement>("[data-drum-pan]")?.addEventListener("input", (event) => { markEdited(); drumTracks[activeDrumTrack].pan = Number((event.target as HTMLInputElement).value); render(); });
    container.querySelector<HTMLInputElement>("[data-drum-echo]")?.addEventListener("input", (event) => { markEdited(); drumTracks[activeDrumTrack].echo = Number((event.target as HTMLInputElement).value); render(); });
    container.querySelector<HTMLInputElement>("[data-drum-reverb]")?.addEventListener("input", (event) => { markEdited(); drumTracks[activeDrumTrack].reverb = Number((event.target as HTMLInputElement).value); render(); });
    container.querySelectorAll<HTMLInputElement>("[data-drum-delay], [data-drum-room], [data-drum-distortion], [data-drum-chorus]").forEach((input) => input.addEventListener("input", () => { markEdited(); const key = input.dataset.drumDelay !== undefined ? "delay" : input.dataset.drumRoom !== undefined ? "room" : input.dataset.drumDistortion !== undefined ? "distortion" : "chorus"; (drumTracks[activeDrumTrack] as unknown as Record<string, number>)[key] = Number(input.value); render(); }));
    container.querySelector<HTMLSelectElement>("[data-length]")!.addEventListener("change", (event) => { noteLength = Number((event.target as HTMLSelectElement).value); render(); });
    container.querySelector<HTMLSelectElement>("[data-velocity]")!.addEventListener("change", (event) => { velocity = Number((event.target as HTMLSelectElement).value); render(); });
    container.querySelector<HTMLSelectElement>("[data-articulation]")!.addEventListener("change", (event) => { articulation = (event.target as HTMLSelectElement).value as Articulation; markEdited(); render(); });
    container.querySelector<HTMLInputElement>("[data-bend]")!.addEventListener("change", (event) => { bend = Math.max(-24, Math.min(24, Number((event.target as HTMLInputElement).value) || 0)); markEdited(); render(); });
    container.querySelector<HTMLButtonElement>('[data-action="clear"]')!.addEventListener("click", () => { markEdited(); if (editorTab === "melody") notes = []; else drumTracks[activeDrumTrack].hits = []; render(); });
    container.querySelector<HTMLButtonElement>('[data-action="undo"]')!.addEventListener("click", () => { if (historyIndex <= 0) return; historyIndex--; restoreSnapshot(history[historyIndex]); });
    container.querySelector<HTMLButtonElement>('[data-action="redo"]')!.addEventListener("click", () => { if (historyIndex + 1 >= history.length) return; historyIndex++; restoreSnapshot(history[historyIndex]); });
    container.querySelector<HTMLButtonElement>('[data-action="duplicate-melody"]')!.addEventListener("click", () => { markEdited(); melodies.splice(activeMelody + 1, 0, { ...melodies[activeMelody], name: `${melodies[activeMelody].name} copy`, notes: melodies[activeMelody].notes.map((note) => ({ ...note })) }); activeMelody++; notes = melodies[activeMelody].notes; render(); });
    container.querySelector<HTMLButtonElement>('[data-action="delete-melody"]')!.addEventListener("click", () => { if (melodies.length <= 1) return; markEdited(); melodies.splice(activeMelody, 1); activeMelody = Math.max(0, activeMelody - 1); notes = melodies[activeMelody].notes; render(); });
    container.querySelector<HTMLButtonElement>('[data-action="duplicate-drum"]')?.addEventListener("click", () => { markEdited(); drumTracks.splice(activeDrumTrack + 1, 0, { ...drumTracks[activeDrumTrack], name: `${drumTracks[activeDrumTrack].name} copy`, hits: drumTracks[activeDrumTrack].hits.map((hit) => ({ ...hit })) }); activeDrumTrack++; render(); });
    container.querySelector<HTMLButtonElement>('[data-action="delete-drum"]')?.addEventListener("click", () => { if (drumTracks.length <= 1) return; markEdited(); drumTracks.splice(activeDrumTrack, 1); activeDrumTrack = Math.max(0, activeDrumTrack - 1); render(); });
    container.querySelector<HTMLSelectElement>("[data-quantize]")!.addEventListener("change", (event) => { quantizeStep = Number((event.target as HTMLSelectElement).value); markEdited(); notes = notes.map((note) => ({ ...note, start: Math.round(note.start / quantizeStep) * quantizeStep, duration: Math.max(quantizeStep, Math.round(note.duration / quantizeStep) * quantizeStep) })); render(); });
    container.querySelector<HTMLButtonElement>('[data-action="pause-resume"]')!.addEventListener("click", () => { if (isPaused) { resume(); isPlaying = true; isPaused = false; startPosition(); } else { positionSeconds = getPlaybackPosition() || positionSeconds; pause(); isPlaying = false; isPaused = true; stopPosition(); } render(); });
    container.querySelector<HTMLButtonElement>('[data-action="stop"]')!.addEventListener("click", () => { stop(); stopPosition(); positionSeconds = 0; isPlaying = false; isPaused = false; render(); updatePositionView(); });
    container.querySelector<HTMLButtonElement>('[data-action="export-song"]')!.addEventListener("click", () => downloadSynth8Source(container.querySelector<HTMLTextAreaElement>("[data-song-source]")!.value, "song.synth8", { bpm, length: columns }));
    container.querySelector<HTMLInputElement>("[data-import-song]")!.addEventListener("change", async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try { loadSource(await readSynth8Source(file)); }
      catch (error) { window.alert(error instanceof Error ? error.message : String(error)); }
    });
    container.querySelector<HTMLButtonElement>('[data-action="play"]')!.addEventListener("click", () => { void startPlayback(); });
    updatePositionView();
  };
  loadSource(DEFAULT_SONG_SOURCE);
  return { destroy: () => { stopPosition(); stop(); container.remove(); } };
}
