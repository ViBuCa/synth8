import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

const initialSource = `song(
  melody("d5 f#5 a5 f#5 g5 f#5 e5 d5"),

  melody("d4+f#4+a4 _ g4+b4+d5 _").slow(2),

  melody("d2 _ a1 _ g1 _ d1 _"),

  melody("d5+a5 f#5+a5 g5+b5 d5+g5").fast(2),

  beat("kick+hihat _ snare hihat kick _ snare hihat"),

  beat("hihat hihat hihat hihat").fast(2)
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