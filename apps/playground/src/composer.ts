import { compile } from "@vibuca/synth8-core";
import { addInstrumentPackToSampleBank, encodeInstrumentPack, encodeSampleWav, InstrumentPackBackend, renderInstrumentPack, SampleBank } from "@vibuca/synth8-player";
import type { InstrumentPackData } from "@vibuca/synth8-player";
import { isExperimentalEnabled } from "./features";


type SuiteSong = { id: string; name: string; source: string };
type SuiteData = { version: 1; format: "synth8-suite"; instruments: string; songs: SuiteSong[]; bpm: number };

const initialInstruments = `instrument("game bass")
  .osc("sine", -12, 0.24)
  .osc("triangle", 0, 0.42)
  .osc("triangle", 12, 0.16)
  .attack(0.01).decay(0.18).sustain(0.55).release(0.12)
  .cutoff(1100).gain(0.55),

instrument("arcade lead")
  .osc("pulse25", 0, 0.42)
  .osc("triangle", 12, 0.16)
  .attack(0.004).decay(0.12).sustain(0.48).release(0.12)
  .cutoff(3800).gain(0.42),

instrument("warm pad")
  .osc("sawtooth", 0, 0.24, -7)
  .osc("sawtooth", 0, 0.24, 7)
  .osc("triangle", 0, 0.20)
  .attack(0.35).decay(0.25).sustain(0.65).release(0.8)
  .cutoff(1800).chorus(0.3).gain(0.32)`;

let previewPackCache: { key: string; pack: InstrumentPackData } | undefined;
let previewAudio: HTMLAudioElement | undefined;
let previewAudioUrl: string | undefined;

function stopPreviewAudio(): void {
  previewAudio?.pause();
  previewAudio = undefined;
  if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
  previewAudioUrl = undefined;
}

function playPreviewBlob(blob: Blob, loop = false): Promise<void> {
  stopPreviewAudio();
  previewAudioUrl = URL.createObjectURL(blob);
  previewAudio = new Audio(previewAudioUrl);
  previewAudio.loop = loop;
  return previewAudio.play();
}

function encodeAudioBufferWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const dataBytes = buffer.length * channels * 2;
  const bytes = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(bytes);
  const text = (offset: number, value: string): void => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, 36 + dataBytes, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let frame = 0; frame < buffer.length; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: "audio/wav" });
}

async function renderSampleSongWav(pattern: ReturnType<typeof compile>, pack: InstrumentPackData, bpm: number): Promise<Blob> {
  const sampleRate = 44100;
  const seconds = Math.max(0.1, pattern.length * 60 / bpm + 1.5);
  const context = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const bank = new SampleBank(context);
  addInstrumentPackToSampleBank(bank, pack);
  const backend = new InstrumentPackBackend({ context, pack, sampleBank: bank, bpm, masterGain: 0.9 });
  backend.start();
  backend.schedule(pattern.query(0, pattern.length));
  const rendered = await context.startRendering();
  backend.dispose();
  return encodeAudioBufferWav(rendered);
}

const initialSongs: SuiteSong[] = [
  {
    id: "overworld",
    name: "Overworld",
    source: `song(
  melody("c2 _ g1 _ eb2 _ bb1 _").instrument("game bass").loop(),
  melody("c5 eb5 g5 bb5 g5 eb5 d5 c5").instrument("arcade lead").gain(0.55),
  melody("c4+eb4+g4 _ bb3+d4+f4 _").instrument("warm pad").gain(0.4).loop(),
  beat("kick _ snare _").bank("arcade").gain(0.45).loop()
)`,
  },
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const u16 = (view: DataView, offset: number, value: number) => view.setUint16(offset, value, true);
const u32 = (view: DataView, offset: number, value: number) => view.setUint32(offset, value >>> 0, true);

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Create a standards-compliant, uncompressed ZIP archive using browser APIs only. */
function createZip(files: Array<{ name: string; data: string }>): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u16(localView, 6, 0x0800);
    u16(localView, 8, 0); u32(localView, 14, crc); u32(localView, 18, data.length); u32(localView, 22, data.length);
    u16(localView, 26, name.length); u16(localView, 28, 0); local.set(name, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    u32(centralView, 0, 0x02014b50); u16(centralView, 4, 20); u16(centralView, 6, 20);
    u16(centralView, 8, 0x0800); u16(centralView, 10, 0); u32(centralView, 16, crc);
    u32(centralView, 20, data.length); u32(centralView, 24, data.length);
    u16(centralView, 28, name.length); u16(centralView, 30, 0); u16(centralView, 32, 0);
    u16(centralView, 34, 0); u32(centralView, 38, 0); u32(centralView, 42, offset); central.set(name, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  u32(endView, 0, 0x06054b50); u16(endView, 8, files.length); u16(endView, 10, files.length);
  u32(endView, 12, centralSize); u32(endView, 16, offset); u16(endView, 20, 0);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

async function suiteFromFile(file: File): Promise<SuiteData> {
  if (!file.name.toLowerCase().endsWith(".zip")) return JSON.parse(await file.text()) as SuiteData;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset + 30 < bytes.length;) {
    if (view.getUint32(offset, true) !== 0x04034b50) { offset += 1; continue; }
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    if (name === "synth8-suite.json") {
      if (method !== 0) throw new Error("This suite ZIP uses unsupported compression.");
      return JSON.parse(decoder.decode(bytes.subarray(dataStart, dataStart + compressedSize))) as SuiteData;
    }
    offset = dataStart + compressedSize;
  }
  throw new Error("The ZIP does not contain synth8-suite.json.");
}

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

function safeJson(value: unknown): string { return JSON.stringify(value, null, 2); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char); }

export function renderComposer(root: HTMLElement): void {
  const experimental = isExperimentalEnabled();
  root.innerHTML = `
    <main>
      <header class="app-header">
        <button class="brand-button" type="button" data-view="home">Synth8</button>
        <nav class="main-nav" aria-label="Main">
          <button class="nav-button" type="button" data-view="lab">Laboratory</button>
          <button class="nav-button" type="button" data-view="instruments">Named Instruments</button>
          <button class="nav-button is-active" type="button" data-view="composer">Composer</button>
          ${experimental ? `<button class="nav-button" type="button" data-view="editor">Editor (preview)</button>` : ""}
          <button class="nav-button" type="button" data-view="tutorial">Tutorial</button>
        </nav>
      </header>
      <section class="tutorial-hero">
        <h1>Game Music Composer</h1>
        <p class="lead">Create a shared instrument library and a suite of songs that reuse it. Save the editable suite as JSON or export a ZIP containing the suite, rendered instrument samples, and a game integration guide.</p>
        <p class="tutorial-details">Instrument definitions are shared by every song. Use <code>.instrument("name")</code> on layers. Preview renders samples for the selected song and plays through the same sampler backend used by the game-ready ZIP export. The ZIP renders the complete suite into a sampler-style <code>.s8inst.json</code> pack; the source suite remains editable alongside it.</p>
      </section>
      <section class="composer-card">
        <label class="composer-instruments">
          <span><strong>Shared instrument definitions</strong> — comma-separated <code>instrument(...)</code> declarations</span>
          <textarea id="composer-instruments" class="tutorial-editor" rows="18" spellcheck="false"></textarea>
        </label>
        <div class="composer-song-bar">
          <label><span>Song</span><select id="composer-song-select"></select></label>
          <label class="composer-song-name"><span>Song name</span><input id="composer-song-name" type="text" maxlength="80" /></label>
          <button id="composer-add-song" type="button">Add song</button>
          <button id="composer-remove-song" class="stop" type="button">Remove song</button>
          <label class="tutorial-bpm"><span>BPM</span><input id="composer-bpm" type="number" min="40" max="240" value="120" /></label>
        </div>
        <label class="composer-song-editor"><span>Selected song source</span><textarea id="composer-song-source" class="tutorial-editor" rows="18" spellcheck="false"></textarea></label>
        <div class="tutorial-controls">
          <button id="composer-play" class="play" type="button">Play selected song</button>
          <button id="composer-stop" class="stop" type="button">Stop</button>
        </div>
        <div id="composer-status" class="tutorial-status" role="status" aria-live="polite">Ready.</div>
      </section>
      <section class="composer-card composer-samples-card">
        <h2>Rendered sample preview</h2>
        <p class="tutorial-details">Generate a preview or ZIP to populate this list. Preview any individual rendered sample or download it as a WAV file.</p>
        <div id="composer-sample-list" class="composer-sample-list"><p class="tutorial-details">No samples rendered yet.</p></div>
      </section>
      <section class="composer-card composer-export-card">
        <h2>Suite files</h2>
        <p class="tutorial-details">JSON stores the editable instrument and song source. ZIP additionally includes a rendered instrument pack and a short integration guide. ZIP generation can take a while for many unique notes.</p>
        <div class="tutorial-controls">
          <button id="composer-export-json" type="button">Export suite JSON</button>
          <button id="composer-export-zip" class="play" type="button">Render and export ZIP bundle</button>
          <label class="composer-import"><span>Import suite JSON or ZIP</span><input id="composer-import-file" type="file" accept=".json,.s8suite.json,.zip,application/json,application/zip" /></label>
        </div>
      </section>
    </main>
    <footer class="site-footer"><a href="https://github.com/ViBuCa/synth8">GitHub</a><span aria-hidden="true">|</span><a href="https://www.npmjs.com/package/@vibuca/synth8-player">npm player</a></footer>
  `;

  const instrumentsInput = root.querySelector<HTMLTextAreaElement>("#composer-instruments")!;
  const songSelect = root.querySelector<HTMLSelectElement>("#composer-song-select")!;
  const songNameInput = root.querySelector<HTMLInputElement>("#composer-song-name")!;
  const songSource = root.querySelector<HTMLTextAreaElement>("#composer-song-source")!;
  const bpmInput = root.querySelector<HTMLInputElement>("#composer-bpm")!;
  const status = root.querySelector<HTMLDivElement>("#composer-status")!;
  const sampleList = root.querySelector<HTMLDivElement>("#composer-sample-list")!;
  const songs = initialSongs.map((song) => ({ ...song }));
  let activeIndex = 0;
  instrumentsInput.value = initialInstruments;

  const syncSongField = (): void => {
    songSource.value = songs[activeIndex]?.source ?? "";
    songNameInput.value = songs[activeIndex]?.name ?? "";
  };
  const refreshSongs = (): void => {
    songSelect.innerHTML = songs.map((song, index) => `<option value="${index}">${escapeHtml(song.name)}</option>`).join("");
    songSelect.value = String(activeIndex);
    syncSongField();
  };
  const currentSuite = (): SuiteData => {
    if (songs[activeIndex]) songs[activeIndex].source = songSource.value;
    return { version: 1, format: "synth8-suite", instruments: instrumentsInput.value, songs: songs.map((song) => ({ ...song })), bpm: Number(bpmInput.value) || 120 };
  };
  const sourceFor = (song: SuiteSong): string => `instruments(\n${instrumentsInput.value}\n,\n${song.source}\n)`;
  const showSamples = (pack: InstrumentPackData): void => {
    const labels = new Map<string, string>();
    for (const instrument of pack.instruments) {
      for (const zone of instrument.zones ?? []) {
        const midi = zone.rootNote;
        const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const note = `${noteNames[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
        labels.set(zone.sampleId, `${instrument.name ?? instrument.id} · ${note}`);
      }
      for (const drum of instrument.drums ?? []) labels.set(drum.sampleId, `${instrument.name ?? instrument.id} · ${drum.drum}`);
    }
    sampleList.replaceChildren();
    const summary = document.createElement("p");
    summary.className = "tutorial-details";
    const peak = pack.samples.reduce((max, sample) => sample.pcm.reduce((sampleMax, value) => Math.max(sampleMax, Math.abs(value)), max), 0);
    summary.textContent = `${pack.samples.length} rendered samples from ${pack.instruments.length} packed instruments (peak PCM ${peak}/128).`;
    if (peak === 0) status.textContent = "Rendered samples are silent (peak PCM 0). Check the browser console and Web Audio support.";
    sampleList.append(summary);
    for (const asset of pack.samples) {
      const row = document.createElement("div");
      row.className = "composer-sample-row";
      const title = document.createElement("span");
      title.textContent = labels.get(asset.id) ?? asset.name ?? asset.id;
      const previewButton = document.createElement("button");
      previewButton.type = "button";
      previewButton.textContent = "Preview";
      previewButton.addEventListener("click", async () => {
        try { await playPreviewBlob(encodeSampleWav(asset)); }
        catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
      });
      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.textContent = "Download WAV";
      downloadButton.addEventListener("click", () => {
        const safeId = asset.id.replace(/[^a-z0-9_-]+/gi, "-");
        download(`${safeId}.wav`, encodeSampleWav(asset));
      });
      row.append(title, previewButton, downloadButton);
      sampleList.append(row);
    }
  };

  refreshSongs();
  songSelect.addEventListener("change", () => { currentSuite(); activeIndex = Number(songSelect.value); syncSongField(); });
  songNameInput.addEventListener("input", () => {
    const song = songs[activeIndex];
    if (!song) return;
    song.name = songNameInput.value;
    const option = songSelect.options[activeIndex];
    if (option) option.textContent = song.name || "(unnamed song)";
  });
  songSource.addEventListener("input", () => { if (songs[activeIndex]) songs[activeIndex].source = songSource.value; });
  root.querySelector<HTMLButtonElement>("#composer-add-song")!.addEventListener("click", () => {
    currentSuite();
    const number = songs.length + 1;
    songs.push({ id: `song-${Date.now()}`, name: `Song ${number}`, source: `song(\n  melody("c4 e4 g4 c5").instrument("arcade lead"),\n  melody("c2 _ g1 _").instrument("game bass").loop()\n)` });
    activeIndex = songs.length - 1; refreshSongs(); status.textContent = "Song added.";
  });
  root.querySelector<HTMLButtonElement>("#composer-remove-song")!.addEventListener("click", () => {
    if (songs.length <= 1) { status.textContent = "Keep at least one song in the suite."; return; }
    songs.splice(activeIndex, 1); activeIndex = Math.min(activeIndex, songs.length - 1); refreshSongs(); status.textContent = "Song removed.";
  });
  root.querySelector<HTMLButtonElement>("#composer-play")!.addEventListener("click", async () => {
    try {
      const suite = currentSuite();
      const song = suite.songs[activeIndex];
      if (!song) throw new Error("Select a song to preview.");
      const pattern = compile(sourceFor(song));
      stopPreviewAudio();
      status.textContent = "Preparing the game sampler pack for this suite...";
      const suiteKey = safeJson(suite);
      if (!previewPackCache || previewPackCache.key !== suiteKey) {
        const combined = `instruments(\n${suite.instruments}\n,\nsequence(\n${suite.songs.map((item) => item.source).join(",\n")}\n)\n)`;
        const packPattern = compile(combined);
        const pack = await renderInstrumentPack(packPattern, {
          name: "Synth8 game suite", sampleRate: 22050, rangePadding: 1, intervalSemitones: 3,
        });
        previewPackCache = { key: suiteKey, pack };
      }
      const pack = previewPackCache.pack;
      showSamples(pack);
      const songWav = await renderSampleSongWav(pattern, pack, suite.bpm);
      await playPreviewBlob(songWav, pattern.loop);
      status.textContent = `Playing ${song.name} rendered through the game sampler.`;
    } catch (error) {
      console.error("Composer sampler preview failed:", error);
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  root.querySelector<HTMLButtonElement>("#composer-stop")!.addEventListener("click", () => { stopPreviewAudio(); status.textContent = "Stopped."; });
  root.querySelector<HTMLButtonElement>("#composer-export-json")!.addEventListener("click", () => {
    download("synth8-suite.s8suite.json", new Blob([safeJson(currentSuite())], { type: "application/json" }));
  });
  root.querySelector<HTMLButtonElement>("#composer-export-zip")!.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    try {
      button.disabled = true; button.textContent = "Rendering samples..."; status.textContent = "Compiling all songs for sampler rendering...";
      const suite = currentSuite();
      const combined = `instruments(\n${suite.instruments}\n,\nsequence(\n${suite.songs.map((song) => song.source).join(",\n")}\n)\n)`;
      const pattern = compile(combined);
      const pack: InstrumentPackData = await renderInstrumentPack(pattern, {
        name: "Synth8 game suite", sampleRate: 22050, rangePadding: 1, intervalSemitones: 3,
      });
      previewPackCache = { key: safeJson(suite), pack };
      showSamples(pack);
      const suiteJson = safeJson(suite);
      const readme = `Synth8 game suite bundle\n\nFiles:\n- synth8-suite.json: editable source for shared instruments and songs\n- instruments.s8inst.json: pre-rendered melodic/drum samples\n\nRuntime sketch:\n1. Decode the pack with decodeInstrumentPack().\n2. Add its samples to a SampleBank.\n3. Compile synth8-suite.json song source wrapped with its shared instrument declarations.\n4. Use InstrumentPackBackend for live sampler playback, or use the pack as a source for your game integration.\n\nThis bundle contains audio rendered from the source definitions; edits to the JSON source require re-rendering the pack.\n`;
      const zip = createZip([
        { name: "synth8-suite.json", data: suiteJson },
        { name: "instruments.s8inst.json", data: encodeInstrumentPack(pack) },
        { name: "README.txt", data: readme },
      ]);
      download("synth8-game-suite.zip", zip); status.textContent = `ZIP exported: ${pack.instruments.length} instruments, ${pack.samples.length} samples.`;
    } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
    finally { button.disabled = false; button.textContent = "Render and export ZIP bundle"; }
  });
  root.querySelector<HTMLInputElement>("#composer-import-file")!.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    try {
      const data = await suiteFromFile(file);
      if (data.version !== 1 || data.format !== "synth8-suite" || typeof data.instruments !== "string" || !Array.isArray(data.songs) || data.songs.length === 0) throw new Error("Unsupported or invalid Synth8 suite.");
      compile(`instruments(\n${data.instruments}\n,\n${data.songs[0].source}\n)`);
      instrumentsInput.value = data.instruments;
      songs.splice(0, songs.length, ...data.songs.map((song, index) => ({ id: String(song.id || `song-${index + 1}`), name: String(song.name || `Song ${index + 1}`), source: String(song.source) })));
      activeIndex = 0; bpmInput.value = String(data.bpm || 120); refreshSongs(); status.textContent = `Imported ${songs.length} song(s).`;
    } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
    finally { input.value = ""; }
  });
}
