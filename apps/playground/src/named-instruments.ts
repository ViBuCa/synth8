import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";
import { isExperimentalEnabled } from "./features";

type NamedInstrumentRecipe = {
  name: string;
  role: string;
  description: string;
  melody: string;
  source: string;
};

const recipes: NamedInstrumentRecipe[] = [
  {
    name: "fat bass",
    role: "Bass",
    description: "Deep low end with a little saw edge, useful for action loops and heavy game levels.",
    melody: `melody("c2 c2 g1 c2 eb2 eb2 bb1 eb2")`,
    source: `instrument("fat bass")
  .osc("sine", -12, 0.40)
  .osc("triangle", 0, 0.40)
  .osc("sawtooth", 0, 0.18)
  .attack(0.002)
  .decay(0.12)
  .sustain(0.78)
  .release(0.10)
  .cutoff(1200)
  .resonance(0.12)
  .distortion(0.18)`,
  },
  {
    name: "silent bass",
    role: "Menu / alternate bass",
    description: "Restrained bass for menus, pause screens, or lower-intensity variants.",
    melody: `melody("c3 _ g2 _ eb3 _ bb2 _")`,
    source: `instrument("silent bass")
  .osc("sine", -12, 0.24)
  .osc("triangle", 0, 0.42)
  .osc("triangle", 12, 0.16)
  .attack(0.01)
  .decay(0.18)
  .sustain(0.55)
  .release(0.35)
  .cutoff(1100)
  .gain(0.55)`
  },
  {
    name: "acid bass",
    role: "Resonant bass",
    description: "TB-303-inspired nasal bass for repeated notes, slides, and aggressive loops.",
    melody: `melody("c2 c2 eb2{slide} c2 g1 g1 bb1{slide} g1")`,
    source: `instrument("acid bass")
  .osc("sawtooth", 0, 0.68)
  .osc("square", 0, 0.22)
  .attack(0.001)
  .decay(0.075)
  .sustain(0.32)
  .release(0.06)
  .cutoff(1650)
  .resonance(0.50)
  .distortion(0.24)`,
  },
  {
    name: "rounded 303",
    role: "Softer bassline",
    description: "A less dominant acid-style bass that still adds rhythmic movement.",
    melody: `melody("a1 a1 c2 d2 a1 _ g1 _")`,
    source: `instrument("rounded 303")
  .osc("sawtooth", 0, 0.58)
  .osc("pulse25", 0, 0.26)
  .attack(0.001)
  .decay(0.11)
  .sustain(0.42)
  .release(0.08)
  .cutoff(1350)
  .resonance(0.36)
  .distortion(0.12)`,
  },
  {
    name: "disco funk bass",
    role: "Filter-envelope bass",
    description: "Punchy per-note filter pop for funk, disco, and bouncy game grooves.",
    melody: `melody("c2{accent} _ c2 eb2 f2 _ eb2 c2")`,
    source: `instrument("disco funk bass")
  .osc("sawtooth", 0, 0.62)
  .osc("square", 0, 0.22)
  .osc("sine", -12, 0.18)
  .attack(0.003)
  .decay(0.14)
  .sustain(0.42)
  .release(0.07)
  .filterEnvelope(420, 2400, 0.012, 0.13, 680, 0.08)
  .resonance(0.36)
  .distortion(0.08)`,
  },
  {
    name: "cosmic bass",
    role: "LFO bass",
    description: "Slow sci-fi bass with continuous cutoff drift for space or underwater scenes.",
    melody: `melody("a1/4 e2/4 g1/4 d2/4 a1/4 e2/4 g1/4 d2/4")`,
    source: `instrument("cosmic bass")
  .osc("sawtooth", 0, 0.34, -6)
  .osc("sawtooth", 0, 0.34, 6)
  .osc("sine", -12, 0.32)
  .attack(0.08)
  .decay(0.45)
  .sustain(0.78)
  .release(0.70)
  .cutoff(1100)
  .resonance(0.42)
  .vibrato(0.45, 0.10, 0.35)
  .lfo("cutoff", 0.28, 0.50, "triangle")
  .chorus(0.25)
  .reverb(0.15)`,
  },
  {
    name: "amiga crunch bass",
    role: "Lo-fi tracker bass",
    description: "Bitcrushed synth-rock bass for Amiga/tracker-inspired game music.",
    melody: `melody("e2 e2 g2 a2 e2 d2 e2 b1")`,
    source: `instrument("amiga crunch bass")
  .osc("sawtooth", 0, 0.62)
  .osc("triangle", 0, 0.32)
  .osc("sine", -12, 0.20)
  .attack(0.004)
  .decay(0.16)
  .sustain(0.62)
  .release(0.09)
  .cutoff(820)
  .resonance(0.10)
  .distortion(0.24)
  .bitcrush(7)`,
  },
  {
    name: "detuned lead",
    role: "Wide lead",
    description: "Supersaw-style lead for hooks and boss themes.",
    melody: `melody("c5 eb5 g5 bb5 g5 eb5 d5 c5")`,
    source: `instrument("detuned lead")
  .osc("sawtooth", 0, 0.28, -11)
  .osc("sawtooth", 0, 0.34, 0)
  .osc("sawtooth", 0, 0.28, 11)
  .osc("square", 0, 0.12)
  .attack(0.006)
  .decay(0.16)
  .sustain(0.72)
  .release(0.28)
  .cutoff(5200)
  .chorus(0.22)
  .echo(0.14)`,
  },
  {
    name: "anthem lead",
    role: "Smooth lead",
    description: "Wider, smoother hook lead with release and echo so notes connect musically.",
    melody: `melody("bb4{accent} f5 bb5/2 ab5 g5 f5 eb5")`,
    source: `instrument("anthem lead")
  .osc("sawtooth", 0, 0.32, -8)
  .osc("sawtooth", 0, 0.32, 8)
  .osc("triangle", 0, 0.16)
  .attack(0.012)
  .decay(0.22)
  .sustain(0.82)
  .release(0.62)
  .cutoff(4800)
  .distortion(0.10)
  .chorus(0.34)
  .echo(0.26)`,
  },
  {
    name: "glass lead",
    role: "Bell lead",
    description: "Clear, bell-like top line that sits above a mix without much distortion.",
    melody: `melody("c5 e5 g5 c6 g5 e5 d5 c5")`,
    source: `instrument("glass lead")
  .osc("sine", 0, 0.55)
  .osc("triangle", 12, 0.20)
  .osc("pulse12", 0, 0.12)
  .attack(0.004)
  .decay(0.22)
  .sustain(0.24)
  .release(0.38)
  .echo(0.20)
  .reverb(0.16)`,
  },
  {
    name: "warm pad",
    role: "Pad",
    description: "Soft chord bed for overworld maps, calm exploration, and menus.",
    melody: `melody("c4+e4+g4 _ f4+a4+c5 _ g4+b4+d5 _ c4+e4+g4 _")`,
    source: `instrument("warm pad")
  .osc("sawtooth", 0, 0.28, -7)
  .osc("sawtooth", 0, 0.28, 7)
  .osc("triangle", 0, 0.24)
  .attack(0.60)
  .decay(0.35)
  .sustain(0.72)
  .release(1.25)
  .cutoff(1800)
  .chorus(0.48)
  .reverb(0.20)
  .gain(0.55)`,
  },
  {
    name: "string machine",
    role: "Ensemble pad",
    description: "Brighter synthetic strings with buzz, slow contours, and strong chorus.",
    melody: `melody("c4+e4+g4 _ bb3+d4+f4 _ ab3+c4+eb4 _ g3+b3+d4 _")`,
    source: `instrument("string machine")
  .osc("sawtooth", 0, 0.30, -9)
  .osc("sawtooth", 0, 0.30, 9)
  .osc("sawtooth", 12, 0.12, 4)
  .attack(0.35)
  .decay(0.25)
  .sustain(0.82)
  .release(1.40)
  .cutoff(2400)
  .chorus(0.58)
  .reverb(0.18)
  .gain(0.48)`,
  },
  {
    name: "dark pad",
    role: "Atmosphere",
    description: "Muted tense pad for caves, stealth scenes, suspense, or alien rooms.",
    melody: `melody("c3+g3+eb4 _ bb2+f3+d4 _ ab2+eb3+c4 _ g2+d3+b3 _")`,
    source: `instrument("dark pad")
  .osc("triangle", 0, 0.42)
  .osc("sawtooth", -12, 0.18)
  .osc("sine", 12, 0.12)
  .attack(0.80)
  .decay(0.45)
  .sustain(0.55)
  .release(1.80)
  .cutoff(1050)
  .chorus(0.38)
  .reverb(0.24)
  .gain(0.38)`,
  },
  {
    name: "brass stab",
    role: "Stab",
    description: "Short confident synth-brass accent for victories, hits, and retro chords.",
    melody: `melody("c4+e4+g4 _ _ g3+b3+d4 _ _")`,
    source: `instrument("brass stab")
  .osc("sawtooth", 0, 0.52)
  .osc("square", 0, 0.22)
  .osc("sawtooth", 12, 0.10)
  .attack(0.020)
  .decay(0.20)
  .sustain(0.42)
  .release(0.18)
  .cutoff(2800)
  .resonance(0.20)
  .chorus(0.14)`,
  },
  {
    name: "soft brass",
    role: "Sustained brass",
    description: "Less percussive brass for harmonic support behind a lead.",
    melody: `melody("c4+e4+g4 _ f4+a4+c5 _ g4+b4+d5 _ f4+a4+c5 _")`,
    source: `instrument("soft brass")
  .osc("sawtooth", 0, 0.45)
  .osc("triangle", 0, 0.22)
  .osc("square", 12, 0.08)
  .attack(0.045)
  .decay(0.26)
  .sustain(0.58)
  .release(0.38)
  .cutoff(2200)
  .resonance(0.14)
  .chorus(0.18)
  .gain(0.55)`,
  },
  {
    name: "arcade pluck",
    role: "Pluck",
    description: "Short bright synth for arpeggios, UI motifs, coin pickups, and chiptune runs.",
    melody: `melody("c4+e4+g4 f4+a4+c5 g4+b4+d5 c5+e5+g5").arp("up").fast(2)`,
    source: `instrument("arcade pluck")
  .osc("pulse25", 0, 0.55)
  .osc("triangle", 12, 0.20)
  .attack(0.001)
  .decay(0.09)
  .sustain(0.04)
  .release(0.07)
  .cutoff(4200)
  .echo(0.10)`,
  },
  {
    name: "warm keys",
    role: "Keys",
    description: "Rounded keyboard patch for unobtrusive harmonic support.",
    melody: `melody("c4+e4+g4 _ a3+c4+e4 _ f3+a3+c4 _ g3+b3+d4 _")`,
    source: `instrument("warm keys")
  .osc("triangle", 0, 0.48)
  .osc("sine", 12, 0.16)
  .osc("pulse50", 0, 0.12)
  .attack(0.055)
  .decay(0.28)
  .sustain(0.55)
  .release(0.70)
  .cutoff(2600)
  .chorus(0.18)
  .gain(0.48)`,
  },
  {
    name: "wobble bass",
    role: "Moving bass",
    description: "A controlled filter-LFO bass for modern action loops; the moderate rate keeps motion clear without becoming harsh.",
    melody: `melody("c2 c2 c2 eb2 g2 g2 eb2 c2")`,
    source: `instrument("wobble bass")
  .osc("sawtooth", 0, 0.42)
  .osc("triangle", -12, 0.32)
  .attack(0.004)
  .decay(0.14)
  .sustain(0.62)
  .release(0.09)
  .cutoff(900)
  .resonance(0.28)
  .lfo("cutoff", 2.2, 0.42, "triangle")
  .gain(0.42)`,
  },
  {
    name: "hollow pulse lead",
    role: "Retro lead",
    description: "A narrow pulse tone with a soft triangle body, useful for melody hooks that should feel retro but not painfully bright.",
    melody: `melody("c5 eb5 g5 bb5 c6 bb5 g5 eb5")`,
    source: `instrument("hollow pulse lead")
  .osc("pulse25", 0, 0.48)
  .osc("triangle", 0, 0.20)
  .attack(0.006)
  .decay(0.12)
  .sustain(0.48)
  .release(0.12)
  .cutoff(3800)
  .gain(0.42)`,
  },
  {
    name: "soft mallet",
    role: "Bell / mallet",
    description: "A sine-and-triangle pluck with a short decay for pickups, menu motifs, and gentle melodic punctuation. This is subtractive/additive layering, not FM synthesis.",
    melody: `melody("c5 _ g5 _ eb5 _ c6 _")`,
    source: `instrument("soft mallet")
  .osc("sine", 0, 0.48)
  .osc("triangle", 12, 0.18)
  .osc("sine", 19, 0.10)
  .attack(0.002)
  .decay(0.32)
  .sustain(0.08)
  .release(0.22)
  .gain(0.42)`,
  },
  {
    name: "organ",
    role: "Sustained keys",
    description: "A steady, octave-stacked tone for retro organ chords, dungeon themes, and sustained counter-melodies.",
    melody: `melody("c4+e4+g4 _ f4+a4+c5 _ g4+b4+d5 _ c4+e4+g4 _")`,
    source: `instrument("organ")
  .osc("square", 0, 0.30)
  .osc("square", 12, 0.12)
  .osc("triangle", -12, 0.16)
  .attack(0.012)
  .decay(0.08)
  .sustain(0.82)
  .release(0.08)
  .cutoff(3000)
  .gain(0.34)`,
  },
  {
    name: "arcade pulse bass",
    role: "Chiptune bass",
    description: "A clean pulse-and-triangle bass that translates on small speakers and leaves room for a lead.",
    melody: `melody("c2 _ c2 g1 eb2 _ bb1 _")`,
    source: `instrument("arcade pulse bass")
  .osc("pulse25", 0, 0.36)
  .osc("triangle", 12, 0.22)
  .osc("sine", -12, 0.18)
  .attack(0.002)
  .decay(0.10)
  .sustain(0.56)
  .release(0.07)
  .cutoff(1900)
  .gain(0.42)`,
  },
  {
    name: "noise sweep",
    role: "Transition FX",
    description: "A noise-based filtered sweep for transitions, power-ups, and sci-fi ambience. Change the note duration and filter/LFO values to alter its pacing.",
    melody: `melody("c4/4 _ c4/4 _")`,
    source: `instrument("noise sweep")
  .sound("noise")
  .attack(0.04)
  .decay(0.28)
  .sustain(0.22)
  .release(0.16)
  .highpass(900)
  .lfo("cutoff", 0.35, 0.5, "triangle")
  .gain(0.24)`,
  },
  {
    name: "noise hit",
    role: "FX / percussion",
    description: "Noisy transient layer for impacts, sweeps, and percussion-like accents.",
    melody: `melody("c4 _ _ c4 _ c4 _ _")`,
    source: `instrument("noise hit")
  .sound("noise")
  .attack(0.001)
  .decay(0.08)
  .sustain(0.0)
  .release(0.05)
  .highpass(1400)
  .gain(0.22)`,
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function instrumentName(source: string, fallback: string): string {
  return /instrument\(\s*["']([^"']+)["']/.exec(source)?.[1] ?? fallback;
}

function buildSource(instrumentSource: string, melodySource: string, name: string): string {
  return `instruments(
  ${instrumentSource.trim().replace(/\n/g, "\n  ")},

  song(
    ${melodySource.trim().replace(/\n/g, "\n    ")}
      .instrument(${JSON.stringify(name)})
      .gain(0.75)
  )
)`;
}

export function renderNamedInstruments(root: HTMLElement) {
  const experimental = isExperimentalEnabled();

  root.innerHTML = `
    <main>
      <header class="app-header">
        <button class="brand-button" type="button" data-view="home">Synth8</button>
        <nav class="main-nav" aria-label="Main">
          <button class="nav-button" type="button" data-view="lab">Laboratory</button>
          <button class="nav-button is-active" type="button" data-view="instruments">Named Instruments</button>
          <button class="nav-button" type="button" data-view="composer">Composer</button>
          ${experimental ? `<button class="nav-button" type="button" data-view="editor">Editor (preview)</button>` : ""}
          <button class="nav-button" type="button" data-view="tutorial">Tutorial</button>
        </nav>
      </header>

      <section class="tutorial-hero">
        <h1>Named Instruments</h1>
        <p class="lead">Pick a reusable instrument recipe, edit its Synth8 code, pair it with a small melody, then replay it immediately.</p>
        <p class="tutorial-details">This is the fastest way to audition instrument designs before using them in a song or exporting them as instrument packs for game playback. The instrument definition and melody are separate on purpose: in real songs, one named instrument can be reused by many layers and swapped or muted at runtime.</p>
      </section>

      <section class="instrument-lab-card">
        <div class="instrument-toolbar">
          <label>
            <span>Instrument</span>
            <select id="instrument-select">
              ${recipes.map((recipe, index) => `<option value="${index}">${escapeHtml(recipe.name)} — ${escapeHtml(recipe.role)}</option>`).join("")}
            </select>
          </label>
          <label class="tutorial-bpm">
            <span>BPM</span>
            <input id="instrument-bpm" type="number" min="40" max="240" value="120" />
          </label>
        </div>

        <p id="instrument-description" class="tutorial-details"></p>

        <div class="instrument-editor-grid">
          <label>
            <span>Instrument Synth8 code</span>
            <textarea id="instrument-source" class="tutorial-editor" rows="14"></textarea>
          </label>
          <label>
            <span>Melody / test pattern</span>
            <textarea id="instrument-melody" class="tutorial-editor" rows="14"></textarea>
          </label>
        </div>

        <div class="tutorial-controls">
          <button id="instrument-play" class="play" type="button">Play selected instrument</button>
          <button id="instrument-stop" class="stop" type="button">Stop</button>
        </div>
        <div id="instrument-status" class="tutorial-status" role="status" aria-live="polite">Idle.</div>
      </section>
    </main>
    <footer class="site-footer">
      <a href="https://github.com/ViBuCa/synth8">GitHub</a>
      <span aria-hidden="true">|</span>
      <a href="https://www.npmjs.com/package/@vibuca/synth8-core">npm core</a>
      <span aria-hidden="true">|</span>
      <a href="https://www.npmjs.com/package/@vibuca/synth8-player">npm player</a>
    </footer>
  `;

  const select = root.querySelector<HTMLSelectElement>("#instrument-select")!;
  const bpmInput = root.querySelector<HTMLInputElement>("#instrument-bpm")!;
  const description = root.querySelector<HTMLParagraphElement>("#instrument-description")!;
  const instrumentEditor = root.querySelector<HTMLTextAreaElement>("#instrument-source")!;
  const melodyEditor = root.querySelector<HTMLTextAreaElement>("#instrument-melody")!;
  const playButton = root.querySelector<HTMLButtonElement>("#instrument-play")!;
  const stopButton = root.querySelector<HTMLButtonElement>("#instrument-stop")!;
  const status = root.querySelector<HTMLDivElement>("#instrument-status")!;

  const loadRecipe = (index: number): void => {
    const recipe = recipes[index] ?? recipes[0];
    description.textContent = recipe.description;
    instrumentEditor.value = recipe.source;
    melodyEditor.value = recipe.melody;
    status.textContent = "Idle.";
  };

  select.addEventListener("change", () => loadRecipe(Number(select.value)));
  loadRecipe(0);

  playButton.addEventListener("click", async () => {
    try {
      playButton.disabled = true;
      status.textContent = "Preparing...";
      status.classList.add("is-busy");
      stop();

      const fallback = recipes[Number(select.value)]?.name ?? "instrument";
      const name = instrumentName(instrumentEditor.value, fallback);
      const pattern = compile(buildSource(instrumentEditor.value, melodyEditor.value, name));
      await play(pattern, { bpm: Number(bpmInput.value), playbackMode: "rendered" });
      status.textContent = `Playing ${name}.`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      playButton.disabled = false;
      status.classList.remove("is-busy");
    }
  });

  stopButton.addEventListener("click", () => {
    stop();
    status.textContent = "Stopped.";
  });
}
