import './style.css';
import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

type OutputKind = "info" | "success" | "error" | "json";

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

try {
  const code = params.get("code");

  if (code) {
    startupSource = decodeSource(code);
  }

  const bpm = Number(params.get('bpm'));
  if (Number.isFinite(bpm) && bpm >= 40 && bpm <= 240) {
    startupBpm = bpm;
  }
} catch {
  console.warn("Invalid shared URL");
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main>
    <h1>Synth8 Playground</h1>

    <div class="examples">
      ${Object.keys(examples)
    .map((name) => `<button class="example-button" data-example="${name}">${name}</button>`)
    .join("")}
    </div>

    <label for="source">Pattern</label>

    <textarea id="source" rows="6">${startupSource}</textarea>

    <label for="bpm">BPM</label>
    <input id="bpm" type="number" value="${startupBpm}" min="40" max="240" />

    <div>
      <button id="play">Play</button>
      <button id="stop">Stop</button>
      <button id="share">Copy Share Link</button>
    </div>

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

document.querySelector<HTMLButtonElement>("#play")!.addEventListener("click", async () => {
  try {
    const pattern = compile(sourceInput.value);
    const bpm = Number(bpmInput.value);

    setOutput("json", JSON.stringify(pattern, null, 2));

    await play(pattern, { bpm });

    output.className = "output output-success";
  } catch (error) {
    setOutput("error", error instanceof Error ? error.message : String(error));
  }
});

document.querySelector<HTMLButtonElement>("#stop")!.addEventListener("click", () => {
  stop();
  setOutput("info", "Stopped.");
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

  await navigator.clipboard.writeText(url.toString());

  output.textContent = "Share link copied to clipboard.";
});