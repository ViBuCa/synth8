import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

const initialSource = `song(
  sequence(
    melody("d4 f#4 a4 c5").repeat(2),
    melody("g4+b4 f#4+a4 e4+g4 d4+f#4").fast(2),
    melody("d5 _ c5 bb4").transpose(-12).slow(2)
  ).repeat(2),

  sequence(
    beat("kick _ snare _"),
    beat("kick+hihat _ snare+hihat _"),
    beat("kick _ snare _"),
    beat("snare:0.5 snare:0.6 snare:0.8 snare:1")
  ).loop(),

  beat("_ hihat:0.2 _ hihat:0.15").fast(2).loop(),

  melody("d2 _ a1 _").loop(),

  sequence(
    melody("a4+c5 f#4+a4"),
    melody("g4+b4 d4+g4")
  ).fast(2).offset(8)
)`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main>
    <h1>Synt8 Playground</h1>

    <label for="source">Pattern</label>
    <textarea id="source" rows="6">${initialSource}</textarea>

    <label for="bpm">BPM</label>
    <input id="bpm" type="number" value="120" min="40" max="240" />

    <div>
      <button id="play">Play</button>
      <button id="stop">Stop</button>
    </div>

    <pre id="output"></pre>
  </main>
`;

const sourceInput = document.querySelector<HTMLTextAreaElement>("#source")!;
const bpmInput = document.querySelector<HTMLInputElement>("#bpm")!;
const output = document.querySelector<HTMLPreElement>("#output")!;

document.querySelector<HTMLButtonElement>("#play")!.addEventListener("click", async () => {
  try {
    const pattern = compile(sourceInput.value);
    const bpm = Number(bpmInput.value);

    output.textContent = JSON.stringify(pattern, null, 2);

    await play(pattern, { bpm });
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : String(error);
  }
});

document.querySelector<HTMLButtonElement>("#stop")!.addEventListener("click", () => {
  stop();
});