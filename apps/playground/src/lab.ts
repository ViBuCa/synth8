import { compile } from "@vibuca/synth8-core";
import { createGameAudio, pause, play, renderWav, resume, stop } from "@vibuca/synth8-player";
import type { GameAudio, PlayOptions, PreparedPlayback, PreparedSfx } from "@vibuca/synth8-player";
import {
  parseMidi,
  midiToSynth8Source,
} from "@vibuca/synth8-import-midi";

export function renderLab(root: HTMLElement) {
type OutputKind = "info" | "success" | "error" | "json";
type DemoTab = "player" | "game";

function setOutput(kind: OutputKind, message: string) {
  output.className = `output output-${kind}`;
  output.textContent = message;
}

const initialSource = `song(
  sequence(
    melody("d4/2 f#4 a4 c5").sound("triangle"),
    melody("g4+b4 f#4+a4 e4+g4 d4+f#4").sound("square"),
    melody("d5/2 _ c5 bb4/2").transpose(-12).sound("sine")
  ).repeat(2),

  beat("kick _ snare _").sound("square").loop(),
  beat("_ hihat:0.25 _ hihat:0.15").fast(2).loop(),

  melody("d2/2 _ a1/2 _").sound("sawtooth").loop(),

  sequence(
    melody("a4+c5/2 f#4+a4").sound("triangle"),
    melody("g4+b4 d4+g4/2").sound("sine")
  ).offset(8)
)`;

const examples = {
  "Full Song": initialSource,
  "Drum Loop": `song(
  beat("kick _ snare _").loop(),
  beat("_ hihat _ hihat").fast(2).loop()
)`,

  "Bass Loop": `melody("c2 _ g1 _ bb1 _ g1 _")
  .sound("sawtooth")
  .loop()`,

  "Chords": `melody("c4+e4+g4 _ f4+a4+c5 _ g4+b4+d5 _ c4+e4+g4")
  .sound("triangle")`,
  "8bit Toccata": `
  song(
  sequence(
    melody("d5/2 c#5/2 d5/2 _ a4/2 g4/2 f4/2 e4/2")
      .sound("square")
      .gain(0.45),

    melody("d5/2 e5/2 f5/2 g5/2 a5/2 _ a4/2 _")
      .sound("square")
      .gain(0.45),

    melody("bb4/2 a4/2 g4/2 f4/2 e4/2 d4/2 c#4/2 d4/2")
      .sound("square")
      .gain(0.45)
  ).repeat(2),

  sequence(
    melody("d3/2 _ a2/2 _ d3/2 _ a2/2 _"),
    melody("bb2/2 _ f2/2 _ c3/2 _ g2/2 _")
  )
    .sound("triangle")
    .gain(0.65)
    .loop(),

  melody("d4+a4 _ f4+a4 _ e4+g4 _ d4+f4 _")
    .sound("sawtooth")
    .gain(0.22)
    .loop(),

  beat("kick _ _ _ snare _ _ _")
    .gain(0.55)
    .loop(),

  beat("_ hihat:0.2 _ hihat:0.15")
    .fast(2)
    .gain(0.25)
    .loop()
)`
};

const gameSfxSources = {
  explosion: `song(
  beat("kick+crash").gain(0.9),
  beat("_ lowtom+snare").fast(2).gain(0.45)
)`,
  laser: `melody("c7/16 g6/16 c6/16")
  .sound("square")
  .gain(0.45).fast(16)`,
  coin: `melody("e6/16 c7/16")
  .sound("triangle")
  .gain(0.55).fast(16)`
};

type GameSfxName = keyof typeof gameSfxSources;

function encodeSource(source: string): string {
  const bytes = new TextEncoder().encode(source);

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeSource(encoded: string): string {
  const padded = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

const params = new URLSearchParams(window.location.search);

let startupSource = initialSource;
let startupBpm = 120;
let startupPlaybackMode: NonNullable<PlayOptions["playbackMode"]> = "auto";

try {
  const code = params.get("code");

  if (code) {
    startupSource = decodeSource(code);
  }

  const bpm = Number(params.get('bpm'));
  if (Number.isFinite(bpm) && bpm >= 40 && bpm <= 240) {
    startupBpm = bpm;
  }

  const playbackMode = params.get("playback");
  if (
    playbackMode === "auto" ||
    playbackMode === "rendered" ||
    playbackMode === "live" ||
    playbackMode === "streamed"
  ) {
    startupPlaybackMode = playbackMode;
  }
} catch {
  console.warn("Invalid shared URL");
}

root.innerHTML = `
  <main>
    <header class="app-header">
      <button class="brand-button" type="button" data-view="home">Synth8</button>
      <nav class="main-nav" aria-label="Main">
        <button class="nav-button is-active" type="button" data-view="lab">Laboratory</button>
        <button class="nav-button" type="button" data-view="tutorial">Tutorial</button>
      </nav>
    </header>

    <h1>Synth8 Playground</h1>

    <div class="examples">
      ${Object.keys(examples)
    .map((name) => `<button class="example-button" data-example="${name}">${name}</button>`)
    .join("")}
    </div>

    <div class="examples">
      <label for="midi">Import MIDI</label>
      <input
        id="midi"
        type="file"
        accept=".mid,.midi,audio/midi"
      />
    <div class="option-row">
      <span><input id="split-piano" type="checkbox" checked /></span>
      <span>Split piano roll into lead/bass</span>
    </div>

    </div>
    <label for="source">Pattern</label>

    <textarea id="source" rows="6">${startupSource}</textarea>

    <label for="bpm">BPM</label>
    <input id="bpm" type="number" value="${startupBpm}" min="40" max="240" />

    <div class="demo-tabs" role="tablist" aria-label="Playback demos">
      <button
        id="player-tab"
        class="demo-tab is-active"
        type="button"
        role="tab"
        aria-selected="true"
        aria-controls="player-panel"
        data-tab="player"
      >Simple player</button>
      <button
        id="game-tab"
        class="demo-tab"
        type="button"
        role="tab"
        aria-selected="false"
        aria-controls="game-panel"
        data-tab="game"
      >Music + Sfx</button>
    </div>

    <section
      id="player-panel"
      class="demo-panel"
      role="tabpanel"
      aria-labelledby="player-tab"
      data-panel="player"
    >
      <fieldset class="playback-mode">
        <legend>Playback</legend>
        <label class="radio-option">
          <input
            type="radio"
            name="playback-mode"
            value="auto"
            ${startupPlaybackMode === "auto" ? "checked" : ""}
          />
          Auto
        </label>
        <label class="radio-option">
          <input
            type="radio"
            name="playback-mode"
            value="rendered"
            ${startupPlaybackMode === "rendered" ? "checked" : ""}
          />
          Rendered
        </label>
        <label class="radio-option">
          <input
            type="radio"
            name="playback-mode"
            value="live"
            ${startupPlaybackMode === "live" ? "checked" : ""}
          />
          Live
        </label>
        <label class="radio-option">
          <input
            type="radio"
            name="playback-mode"
            value="streamed"
            ${startupPlaybackMode === "streamed" ? "checked" : ""}
          />
          Streamed
        </label>
      </fieldset>

      <div class="control-row">
        <button id="play">Play</button>
        <button id="pause">Pause</button>
        <button id="resume">Resume</button>
        <button id="stop">Stop</button>
        <button id="export-wav">Export WAV</button>
        <button id="share">Copy Share Link</button>
      </div>

      <div id="playback-status" class="playback-status" role="status" aria-live="polite">Idle.</div>
    </section>

    <section
      id="game-panel"
      class="demo-panel"
      role="tabpanel"
      aria-labelledby="game-tab"
      data-panel="game"
      hidden
    >
      <div class="game-audio-controls">
        <button id="game-music">Start Music</button>
        <button id="game-music-stop">Stop Music</button>
      </div>

      <div class="volume-grid">
        <label class="volume-control" for="master-volume">
          <span>Master</span>
          <input id="master-volume" type="range" min="0" max="1.5" step="0.01" value="1" />
          <output id="master-volume-value">100%</output>
        </label>
        <label class="volume-control" for="music-volume">
          <span>Music</span>
          <input id="music-volume" type="range" min="0" max="1.5" step="0.01" value="0.75" />
          <output id="music-volume-value">75%</output>
        </label>
        <label class="volume-control" for="sfx-volume">
          <span>SFX</span>
          <input id="sfx-volume" type="range" min="0" max="1.5" step="0.01" value="1" />
          <output id="sfx-volume-value">100%</output>
        </label>
      </div>

      <div class="sfx-grid">
        <button class="sfx-button" data-sfx="explosion">Explosion</button>
        <button class="sfx-button" data-sfx="laser">Laser</button>
        <button class="sfx-button" data-sfx="coin">Coin</button>
      </div>

      <div id="game-audio-status" class="game-audio-status" role="status" aria-live="polite">Game audio idle.</div>
    </section>

    <pre id="output"></pre>
  </main>
  <section class="guide">
    <h2>Mini Guide</h2>

    <div class="guide-grid">
      <code>beat("kick _ snare _")</code>
      <code>melody("c4 d4 e4 g4")</code>
      <code>melody("c4+e4+g4 _ f4+a4+c5")</code>
      <code>beat("kick _ snare _").loop()</code>
      <code>melody("c4 d4").repeat(4)</code>
      <code>beat("hihat _ hihat _").fast(2)</code>
      <code>melody("c4 e4 g4").transpose(12)</code>
      <code>sequence(melody("c4 e4"), melody("g4 c5"))</code>
    </div>
  </section>
  <footer class="site-footer">
    <a href="https://github.com/ViBuCa/synth8">GitHub</a>
    <span aria-hidden="true">|</span>
    <a href="https://www.npmjs.com/package/@vibuca/synth8-core">npm core</a>
    <span aria-hidden="true">|</span>
    <a href="https://www.npmjs.com/package/@vibuca/synth8-player">npm player</a>
  </footer>
`;

const sourceInput = document.querySelector<HTMLTextAreaElement>("#source")!;
const bpmInput = document.querySelector<HTMLInputElement>("#bpm")!;
const output = document.querySelector<HTMLPreElement>("#output")!;
const playbackStatus = document.querySelector<HTMLDivElement>("#playback-status")!;
const playButton = document.querySelector<HTMLButtonElement>("#play")!;
const exportWavButton = document.querySelector<HTMLButtonElement>("#export-wav")!;
const gameMusicButton = document.querySelector<HTMLButtonElement>("#game-music")!;
const gameMusicStopButton = document.querySelector<HTMLButtonElement>("#game-music-stop")!;
const gameAudioStatus = document.querySelector<HTMLDivElement>("#game-audio-status")!;
const masterVolumeInput = document.querySelector<HTMLInputElement>("#master-volume")!;
const musicVolumeInput = document.querySelector<HTMLInputElement>("#music-volume")!;
const sfxVolumeInput = document.querySelector<HTMLInputElement>("#sfx-volume")!;
const masterVolumeValue = document.querySelector<HTMLOutputElement>("#master-volume-value")!;
const musicVolumeValue = document.querySelector<HTMLOutputElement>("#music-volume-value")!;
const sfxVolumeValue = document.querySelector<HTMLOutputElement>("#sfx-volume-value")!;
const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".demo-tab"));
const tabPanels = Array.from(document.querySelectorAll<HTMLElement>(".demo-panel"));

let gameAudio: GameAudio | undefined;
let gameMusic: PreparedPlayback | undefined;
const preparedSfx = new Map<GameSfxName, PreparedSfx>();

function selectTab(tab: DemoTab) {
  for (const button of tabButtons) {
    const isSelected = button.dataset.tab === tab;

    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  }

  for (const panel of tabPanels) {
    panel.hidden = panel.dataset.panel !== tab;
  }
}

function setPlaybackStatus(message: string, busy = false) {
  playbackStatus.textContent = message;
  playbackStatus.classList.toggle("is-busy", busy);
  playbackStatus.setAttribute("aria-busy", String(busy));
}

function setGameAudioStatus(message: string, busy = false) {
  gameAudioStatus.textContent = message;
  gameAudioStatus.classList.toggle("is-busy", busy);
  gameAudioStatus.setAttribute("aria-busy", String(busy));
}

function volumeValue(input: HTMLInputElement): number {
  return Number(input.value);
}

function formatVolume(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function syncVolumeLabels() {
  masterVolumeValue.textContent = formatVolume(volumeValue(masterVolumeInput));
  musicVolumeValue.textContent = formatVolume(volumeValue(musicVolumeInput));
  sfxVolumeValue.textContent = formatVolume(volumeValue(sfxVolumeInput));
}

function volumeStatus(label: string, value: number): string {
  return `${label} volume ${formatVolume(value)}.`;
}

async function getGameAudio(): Promise<GameAudio> {
  if (!gameAudio) {
    gameAudio = await createGameAudio({
      masterVolume: volumeValue(masterVolumeInput),
      musicVolume: volumeValue(musicVolumeInput),
      sfxVolume: volumeValue(sfxVolumeInput),
    });
  }

  return gameAudio;
}

async function getPreparedSfx(name: GameSfxName): Promise<PreparedSfx> {
  const cached = preparedSfx.get(name);

  if (cached) {
    return cached;
  }

  const audio = await getGameAudio();
  const sfx = await audio.prepareSfx(compile(gameSfxSources[name]), {
    bpm: 180,
    voices: 10,
  });

  preparedSfx.set(name, sfx);

  return sfx;
}

function getPlaybackMode(): NonNullable<PlayOptions["playbackMode"]> {
  const selected = document.querySelector<HTMLInputElement>(
    'input[name="playback-mode"]:checked'
  )?.value;

  if (selected === "rendered" || selected === "live" || selected === "streamed") {
    return selected;
  }

  return "auto";
}

playButton.addEventListener("click", async () => {
  const previousPlayText = playButton.textContent ?? "Play";

  try {
    playButton.disabled = true;
    playButton.textContent = "Preparing...";
    setPlaybackStatus("Preparing playback...", true);

    const pattern = compile(sourceInput.value);
    const bpm = Number(bpmInput.value);
    const playbackMode = getPlaybackMode();

    setOutput("json", JSON.stringify(pattern, null, 2));

    await play(pattern, { bpm, playbackMode });

    setPlaybackStatus(`Playing (${playbackMode}).`);
    output.className = "output output-success";
  } catch (error) {
    setPlaybackStatus("Playback failed.");
    setOutput("error", error instanceof Error ? error.message : String(error));
  } finally {
    playButton.disabled = false;
    playButton.textContent = previousPlayText;
  }
});

document.querySelector<HTMLButtonElement>("#stop")!.addEventListener("click", () => {
  stop();
  setPlaybackStatus("Stopped.");
  setOutput("info", "Stopped.");
});

document.querySelector<HTMLButtonElement>("#pause")!.addEventListener("click", () => {
  pause();
  setPlaybackStatus("Paused.");
  setOutput("info", "Paused.");
});

document.querySelector<HTMLButtonElement>("#resume")!.addEventListener("click", () => {
  resume();
  setPlaybackStatus("Playing.");
  setOutput("info", "Resumed.");
});

exportWavButton.addEventListener("click", async () => {
  const previousText = exportWavButton.textContent ?? "Export WAV";

  try {
    exportWavButton.disabled = true;
    exportWavButton.textContent = "Rendering...";
    setPlaybackStatus("Rendering WAV...", true);

    const pattern = compile(sourceInput.value);
    const bpm = Number(bpmInput.value);
    const blob = await renderWav(pattern, { bpm });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "synth8-export.wav";
    link.click();
    URL.revokeObjectURL(url);

    setPlaybackStatus("WAV exported.");
    setOutput("success", "WAV export rendered from the current pattern.");
  } catch (error) {
    setPlaybackStatus("WAV export failed.");
    setOutput("error", error instanceof Error ? error.message : String(error));
  } finally {
    exportWavButton.disabled = false;
    exportWavButton.textContent = previousText;
  }
});

gameMusicButton.addEventListener("click", async () => {
  const previousText = gameMusicButton.textContent ?? "Start Music";

  try {
    gameMusicButton.disabled = true;
    gameMusicButton.textContent = "Preparing...";
    setGameAudioStatus("Preparing streamed game music...", true);

    const audio = await getGameAudio();
    const pattern = compile(sourceInput.value);
    const bpm = Number(bpmInput.value);

    gameMusic = await audio.prepareMusic(pattern, { bpm });
    gameMusic.start();

    setGameAudioStatus("Game music playing. SFX can overlap.");
  } catch (error) {
    setGameAudioStatus("Game music failed.");
    setOutput("error", error instanceof Error ? error.message : String(error));
  } finally {
    gameMusicButton.disabled = false;
    gameMusicButton.textContent = previousText;
  }
});

gameMusicStopButton.addEventListener("click", () => {
  gameMusic?.stop();
  setGameAudioStatus("Game music stopped. Prepared SFX remain ready.");
});

document.querySelectorAll<HTMLButtonElement>(".sfx-button").forEach((button) => {
  button.addEventListener("click", async () => {
    const name = button.dataset.sfx as GameSfxName | undefined;

    if (!name) {
      return;
    }

    try {
      const sfx = await getPreparedSfx(name);
      const audio = await getGameAudio();

      audio.playSfx(sfx);
      setGameAudioStatus(`${button.textContent} triggered.`);
    } catch (error) {
      setGameAudioStatus("SFX failed.");
      setOutput("error", error instanceof Error ? error.message : String(error));
    }
  });
});

masterVolumeInput.addEventListener("input", async () => {
  syncVolumeLabels();
  (await getGameAudio()).setMasterVolume(volumeValue(masterVolumeInput));
  setGameAudioStatus(volumeStatus("Master", volumeValue(masterVolumeInput)));
});

musicVolumeInput.addEventListener("input", async () => {
  syncVolumeLabels();
  (await getGameAudio()).setMusicVolume(volumeValue(musicVolumeInput));
  setGameAudioStatus(volumeStatus("Music", volumeValue(musicVolumeInput)));
});

sfxVolumeInput.addEventListener("input", async () => {
  syncVolumeLabels();
  (await getGameAudio()).setSfxVolume(volumeValue(sfxVolumeInput));
  setGameAudioStatus(volumeStatus("SFX", volumeValue(sfxVolumeInput)));
});

syncVolumeLabels();

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;

    if (tab === "player" || tab === "game") {
      selectTab(tab);
    }
  });
});

document.querySelectorAll<HTMLButtonElement>(".example-button").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.example;

    if (!name) {
      return;
    }

    sourceInput.value = examples[name as keyof typeof examples];
    output.textContent = "";
  });
});

document.querySelector<HTMLButtonElement>("#share")!.addEventListener("click", async () => {
  const encoded = encodeSource(sourceInput.value);
  const bpm = Number(bpmInput.value);

  const url = new URL(window.location.href);
  url.searchParams.set("code", encoded);

  if (Number.isFinite(bpm)) {
    url.searchParams.set("bpm", String(bpm));
  }

  url.searchParams.set("playback", getPlaybackMode());

  await navigator.clipboard.writeText(url.toString());

  output.textContent = "Share link copied to clipboard.";
});

const midiInput =
  document.querySelector<HTMLInputElement>("#midi")!;

const splitPianoInput =
  document.querySelector<HTMLInputElement>("#split-piano")!;

midiInput.addEventListener("change", async () => {
  const file = midiInput.files?.[0];

  if (!file) {
    return;
  }

  try {
    const buffer = await file.arrayBuffer();

    const imported = parseMidi(buffer);

    const splitPiano = splitPianoInput.checked;

    sourceInput.value = midiToSynth8Source(imported, {
      step: "auto",
      mode: splitPiano ? "split-piano" : "literal",
      splitPiano: {
        sourceTracks: ["track1", "piano"],
      },
      mapDrums: true,
      drums: {
        sourceTracks: ["drums"],
      },
      trackOrder: ["lead", "bass", "drums"],
      compressSustains: true,
    });

    setOutput(
      "success",
      splitPiano
        ? `Imported ${file.name} with piano split.`
        : `Imported ${file.name} without piano split.`
    );
  } catch (error) {
    setOutput(
      "error",
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
});
}
