import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";
import { isExperimentalEnabled } from "./features";

type TutorialExample = {
  section: string;
  title: string;
  body: string;
  details: string;
  source: string;
  bpm?: number;
};

const stopAllPlayback = (): void => {
  stop();
};

const tutorialSections = (examples: readonly TutorialExample[]): Array<{ title: string; examples: TutorialExample[] }> => {
  const sections: Array<{ title: string; examples: TutorialExample[] }> = [];
  for (const example of examples) {
    let section = sections.find((item) => item.title === example.section);
    if (!section) {
      section = { title: example.section, examples: [] };
      sections.push(section);
    }
    section.examples.push(example);
  }
  return sections;
};

const tutorialExamples: TutorialExample[] = [
  {
    section: "1. Write patterns",
    title: "Melodies",
    body: "Start with a single melody. A melody is a sequence of pitch tokens read from left to right.",
    details: "Use note names c, d, e, f, g, a, b with optional # or b and an octave number, for example c4, f#3, or bb4. In practice this is where you sketch leads, bass lines, motifs, and UI jingles.",
    source: `melody("c4 d4 e4 g4")`,
  },
  {
    section: "1. Write patterns",
    title: "Rests, Durations, and Velocity",
    body: "Use rests for silence, durations for rhythm, and velocity for accents.",
    details: "_ is a rest. /number changes length, so /2 lasts two steps and /0.5 is a half step. :number sets velocity from 0 to 1. This is the basic vocabulary for grooves and phrasing.",
    source: `melody("c4:0.35 _ e4:0.8/2 g4:0.55/0.5 a4:1/0.5")`,
  },
  {
    section: "1. Write patterns",
    title: "Chords and Arpeggios",
    body: "Use + for simultaneous notes, or arp() to turn chord tokens into fast note runs.",
    details: "Chords are useful for pads and stabs. Arpeggios are useful for retro fake chords and busy game-music patterns. Modes are up, down, and updown.",
    source: `song(
  melody("c4+e4+g4 f4+a4+c5 g4+b4+d5")
    .sound("triangle"),
  melody("c4+e4+g4 f4+a4+c5 g4+b4+d5")
    .arp("updown")
    .preset("arcade-pluck")
    .fast(2)
    .gain(0.45)
)`,
  },
  {
    section: "1. Write patterns",
    title: "Drums and Drum Stacks",
    body: "beat() creates drum patterns. Drums can also be stacked with + inside one step.",
    details: "Common drums include kick, snare, clap, hihat, openhat, tom, rim, cowbell, crash, ride, tambourine, and shaker. Stacks such as kick+hihat are useful for compact grooves.",
    source: `beat("kick+hihat _ snare+hihat _ kick openhat snare hihat")`,
  },
  {
    section: "2. Build arrangements",
    title: "Songs and Layers",
    body: "song() plays patterns together as separate layers.",
    details: "Use separate layers for drums, bass, chords, and lead. This mirrors how game music is usually arranged and makes it easy to rebalance or replace parts later.",
    source: `song(
  melody("c4 e4 g4 c5"),
  melody("c2 _ g1 _").sound("triangle").gain(0.75),
  beat("kick _ snare _")
)`,
  },
  {
    section: "2. Build arrangements",
    title: "Sequences",
    body: "sequence() plays phrases one after another.",
    details: "Use sequences for A/B sections, call-and-response melodies, or level themes that evolve over several bars.",
    source: `sequence(
  melody("c4 e4 g4 c5"),
  melody("d4 f4 a4 d5"),
  melody("e4 g4 b4 e5")
)`,
  },
  {
    section: "2. Build arrangements",
    title: "Repeats, Loops, and Offsets",
    body: "repeat() copies a phrase, loop() repeats a short layer in a song, and offset() delays a layer.",
    details: "These are the main arrangement tools. Loop drums/bass under a longer lead, repeat small motives, and use fractional offsets for echoes or delayed countermelodies.",
    source: `song(
  melody("c2 _ g1 _").sound("sawtooth").loop(),
  beat("kick _ snare _").loop(),
  beat("_ hihat _ hihat").fast(2).gain(0.35).loop(),
  melody("g4 _ c5 _ e5 _ g5 _").offset(2).sound("square").gain(0.45)
)`,
  },
  {
    section: "2. Build arrangements",
    title: "Speed and Transposition",
    body: "fast(), slow(), rate(), and transpose() reuse the same material at different speeds or pitches.",
    details: "Speed modifiers are useful for hats, arps, and double-time parts. Transpose is useful for octaves, countermelodies, and quick variations.",
    source: `song(
  melody("c4 d4 e4 g4"),
  melody("c4 d4 e4 g4").transpose(12).sound("square").gain(0.35),
  beat("hihat _ hihat _").fast(4).gain(0.25)
)`,
  },
  {
    section: "2. Build arrangements",
    title: "Mixing: Gain and Pan",
    body: "gain() controls level and pan() places a layer in stereo.",
    details: "Keep bass and kick near the center, lower pad gain to avoid masking, and pan countermelodies for width. Conservative gain values help avoid clipping.",
    source: `song(
  melody("c4 e4 g4 c5").sound("triangle").gain(0.42).pan(-0.55),
  melody("e4 g4 c5 e5").sound("square").gain(0.35).pan(0.55),
  melody("c2 _ g1 _").sound("sine").gain(0.8)
)`,
  },
  {
    section: "3. Choose basic sounds",
    title: "Waveforms",
    body: "sound() chooses one oscillator waveform for a layer.",
    details: "Sine is pure, triangle is soft, square/pulse are hollow and retro, sawtooth is bright, and noise is unpitched. Use sound() for simple parts; use osc() for thicker instruments.",
    source: `song(
  melody("c4 e4 g4 c5").sound("pulse25"),
  melody("c2 _ g1 _").sound("sine").gain(0.75)
)`,
  },
  {
    section: "3. Choose basic sounds",
    title: "Presets and Drum Banks",
    body: "preset() and bank() are quick starting points for common roles.",
    details: "Presets cover basses, leads, pads, brass, plucks, and rhythm approximations. Drum banks change kit character: 808 is rounder, 909 is tighter, arcade/chip are shorter and brighter.",
    source: `song(
  melody("bb4/1 f5/1 bb5/2").preset("metal-lead"),
  melody("c2 _ g1 _").preset("picked-bass").loop(),
  beat("kick _ snare _").bank("909").loop(),
  beat("_ hihat _ hihat").bank("chip").fast(2).gain(0.25).loop()
)`,
  },
  {
    section: "4. Design reusable instruments",
    title: "Amplitude Envelope",
    body: "The envelope controls how notes fade in, settle, and release.",
    details: "Short attack/decay makes plucks and basses. Long attack/release makes pads. Sustain is a level from 0 to 1; attack, decay, and release are seconds.",
    source: `melody("c4 e4 g4 c5")
  .sound("triangle")
  .attack(0.02)
  .decay(0.18)
  .sustain(0.45)
  .release(0.35)`,
  },
  {
    section: "4. Design reusable instruments",
    title: "Oscillator Stacks",
    body: "osc() stacks multiple waves into one synth voice before filter, envelope, and effects.",
    details: "Stacks are good for sub/body/bite basses, detuned leads, pads, brass, and stabs. Arguments are sound, transpose semitones, gain, and detune cents.",
    source: `melody("c4 e4 g4 c5")
  .osc("sawtooth", 0, 0.34, -7)
  .osc("sawtooth", 0, 0.34, 7)
  .osc("square", 0, 0.14)
  .cutoff(3600)
  .chorus(0.25)`,
  },
  {
    section: "4. Design reusable instruments",
    title: "Named Instruments",
    body: "Define instruments once, then reuse them across several melody or beat layers.",
    details: "Use instruments(instrument(...), song(...)) and .instrument(\"name\"). Local layer modifiers such as gain() or pan() override the shared definition. Named instruments are also important for instrument-pack export and game-time swapping.",
    source: `instruments(
  instrument("fat bass")
    .osc("sine", -12, 0.40)
    .osc("triangle", 0, 0.40)
    .osc("sawtooth", 0, 0.18)
    .cutoff(1200)
    .distortion(0.18),

  song(
    melody("c2 c2 g1 c2").instrument("fat bass"),
    melody("eb2 eb2 bb1 eb2").instrument("fat bass").gain(0.55)
  )
)`,
  },
  {
    section: "5. Add movement and texture",
    title: "Filter Envelope",
    body: "filterEnvelope() creates per-note wah, pluck brightness, and bass movement.",
    details: "Arguments are startHz, peakHz, attackSec, decaySec, sustainHz, releaseSec. This is especially useful for disco/funk basses, brass stabs, and acid-style patches.",
    source: `melody("c2 c2 g1 c2")
  .osc("sawtooth", 0, 0.62)
  .osc("square", 0, 0.22)
  .osc("sine", -12, 0.18)
  .filterEnvelope(420, 2400, 0.012, 0.13, 680, 0.08)
  .resonance(0.35)`,
  },
  {
    section: "5. Add movement and texture",
    title: "LFOs",
    body: "lfo() adds continuous motion to cutoff or pitch.",
    details: "Use lfo(\"cutoff\", ...) for sci-fi sweeps and moving pads. Use lfo(\"pitch\", ...) for extra wobble. Depth is normalized 0 to 1; waveform can be sine, triangle, square, or sawtooth.",
    source: `melody("a1/4 e2/4 g1/4 d2/4")
  .osc("sawtooth", 0, 0.34, -6)
  .osc("sawtooth", 0, 0.34, 6)
  .osc("sine", -12, 0.32)
  .cutoff(1100)
  .resonance(0.42)
  .lfo("cutoff", 0.28, 0.50, "triangle")
  .chorus(0.25)
  .reverb(0.15)`,
  },
  {
    section: "5. Add movement and texture",
    title: "Bitcrush and Lo-Fi Texture",
    body: "bitcrush() reduces bit depth for gritty digital color.",
    details: "Use lower values for rough tracker/game-console flavor. It is useful for Amiga-inspired basses, crunchy leads, and special effects. Subtle settings around 7-10 bits are usually safer than extreme values.",
    source: `melody("e2 e2 g2 a2 e2 d2 e2 b1")
  .osc("sawtooth", 0, 0.62)
  .osc("triangle", 0, 0.32)
  .osc("sine", -12, 0.20)
  .cutoff(820)
  .distortion(0.24)
  .bitcrush(7)`,
  },
  {
    section: "5. Add movement and texture",
    title: "Expression and Articulation",
    body: "Use vibrato, portamento, bends, and articulations for phrase-level character.",
    details: "vibrato(rate, depth, delay) adds pitch wobble. portamento(seconds) slides between reused voices. Note articulations include {accent}, {staccato}, {legato}, {mute}, {slide}, {vibrato}, and {bend:+2}.",
    source: `melody("bb4{accent} f5{slide} bb5{bend:+2}/2 bb5{vibrato}/2")
  .preset("metal-lead")
  .vibrato(5.5, 0.16, 0.4)
  .portamento(0.08)
  .cutoff(4200)`,
  },
  {
    section: "5. Add movement and texture",
    title: "Effects",
    body: "Effects shape the whole layer after notes or drums are generated.",
    details: "delay controls delay time. echo, room, reverb, distortion, and chorus are 0 to 1. lowpass/highpass are simple layer filters. Use effects for space, grit, and mix placement rather than note rhythm.",
    source: `song(
  melody("c4 e4 g4 c5")
    .preset("soft-pad")
    .room(0.4)
    .reverb(0.35)
    .lowpass(1800),
  melody("c5 d5 e5 g5")
    .preset("arcade-pluck")
    .delay(0.18)
    .echo(0.25)
)`,
  },
  {
    section: "6. Game/export workflow",
    title: "Instrument Packs",
    body: "For efficient game playback, render instruments into reusable sample packs in the Laboratory.",
    details: "A .s8inst.json pack stores instrument descriptions plus generated samples. Games can replay the same song with the sampler backend, swap named instruments, mute parts, or lower BPM for menu variants.",
    source: `instruments(
  instrument("fat bass")
    .osc("sine", -12, 0.40)
    .osc("triangle", 0, 0.40)
    .osc("sawtooth", 0, 0.18)
    .cutoff(1200),
  instrument("silent bass")
    .osc("sine", -12, 0.34)
    .osc("triangle", 0, 0.30)
    .cutoff(650)
    .gain(0.45),
  song(
    melody("c2 c2 g1 c2").instrument("fat bass").loop(),
    beat("kick _ snare _").instrument("drums").loop()
  )
)`,
  },
];
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderTutorial(root: HTMLElement) {
  const experimental = isExperimentalEnabled();

  root.innerHTML = `
    <main>
      <header class="app-header">
        <button class="brand-button" type="button" data-view="home">Synth8</button>
        <nav class="main-nav" aria-label="Main">
          <button class="nav-button" type="button" data-view="lab">Laboratory</button>
          ${experimental ? `<button class="nav-button" type="button" data-view="editor">Editor (preview)</button>` : ""}
          <button class="nav-button is-active" type="button" data-view="tutorial">Tutorial</button>
        </nav>
      </header>

      <section class="tutorial-hero">
        <h1>Synth8 Tutorial</h1>
        <p class="lead">Follow this path from small patterns to reusable game-ready instruments. Each card is editable and playable: change a pattern, then press Play to hear what changed.</p>
        <p class="tutorial-details">A practical Synth8 workflow is: write note/drum patterns, arrange them into layers, choose basic sounds, turn those sounds into named instruments, add movement and texture, then export/render for your game. The sections below follow that order.</p>
        ${experimental ? `<p class="tutorial-details"><strong>Tracker files and samples:</strong> Open the <strong>Laboratory</strong>, choose <strong>Music + Sfx</strong>, then use <strong>Load tracker module (MOD / TFMX / TFHD)</strong>. MOD files can be previewed as modules. TFMX and TFHD files are inspected for reusable sample candidates; each candidate can be previewed, renamed, exported as WAV or collected into a Synth8 sample-bank JSON file. TFMX/TFHD arrangement replay is intentionally not required for this workflow. See <a href="https://github.com/ViBuCa/synth8/blob/main/docs/tracker-modules-roadmap.md">the tracker roadmap</a>.</p>
        <div class="tutorial-tracker-guide">
          <h2>Imported sample workflow</h2>
          <ol>
            <li>Load a <code>.tfm</code> or <code>.tfx</code> file in the Laboratory.</li>
            <li>Preview candidates and rename useful assets.</li>
            <li>Export <code>tfmx-sample-candidates.s8bank.json</code>.</li>
            <li>Load that bank, select <strong>Use in Synth8</strong>, and play or export the generated pattern.</li>
          </ol>
          <pre><code>melody("c2 eb2 f2").sample("tfmx-candidate-5794")</code></pre>
        </div>` : ""}
      </section>

      <div class="tutorial-list">
        ${tutorialSections(tutorialExamples).map((section) => `
          <section class="tutorial-section">
            <h2>${section.title}</h2>
            ${section.examples.map((example, index) => {
              const id = `${section.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${index}`;
              return `
          <article class="tutorial-card" data-example-index="${id}">
            <div class="tutorial-copy">
              <h3>${example.title}</h3>
              <p>${example.body}</p>
              <p class="tutorial-details">${example.details}</p>
            </div>
            <label class="sr-only" for="tutorial-source-${id}">
              Synth8 source for ${example.title}
            </label>
            <textarea class="tutorial-editor" id="tutorial-source-${id}" rows="5">${escapeHtml(example.source)}</textarea>
            <div class="tutorial-controls">
              <label class="tutorial-bpm">
                <span>BPM</span>
                <input class="tutorial-bpm-input" type="number" min="40" max="240" value="${example.bpm ?? 120}" />
              </label>
              <button id="tutorial-play" class="play" type="button">Play</button>
              <button id="tutorial-stop" class="stop" type="button">Stop</button>
            </div>
            <div class="tutorial-status" role="status" aria-live="polite">Idle.</div>
          </article>`;
            }).join("")}
          </section>
        `).join("")}
      </div>
    </main>
    <footer class="site-footer">
      <a href="https://github.com/ViBuCa/synth8">GitHub</a>
      <span aria-hidden="true">|</span>
      <a href="https://www.npmjs.com/package/@vibuca/synth8-core">npm core</a>
      <span aria-hidden="true">|</span>
      <a href="https://www.npmjs.com/package/@vibuca/synth8-player">npm player</a>
    </footer>
  `;

  root.querySelectorAll<HTMLElement>(".tutorial-card").forEach((card) => {
    const editor = card.querySelector<HTMLTextAreaElement>(".tutorial-editor")!;
    const bpmInput = card.querySelector<HTMLInputElement>(".tutorial-bpm-input")!;
    const playButton = card.querySelector<HTMLButtonElement>("#tutorial-play")!;
    const stopButton = card.querySelector<HTMLButtonElement>("#tutorial-stop")!;
    const status = card.querySelector<HTMLDivElement>(".tutorial-status")!;

    playButton.addEventListener("click", async () => {
      try {
        playButton.disabled = true;
        status.textContent = "Preparing...";
        status.classList.add("is-busy");
        stopAllPlayback();

        const pattern = compile(editor.value);
        const bpm = Number(bpmInput.value);

        await play(pattern, { bpm, playbackMode: "rendered" });
        status.textContent = "Playing (Native Web Audio).";
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        playButton.disabled = false;
        status.classList.remove("is-busy");
      }
    });

    stopButton.addEventListener("click", () => {
      stopAllPlayback();
      status.textContent = "Stopped.";
    });
  });
}
