import './style.css';
import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

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