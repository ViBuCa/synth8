import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

type TutorialExample = {
  title: string;
  body: string;
  details: string;
  source: string;
  bpm?: number;
};

const tutorialExamples: TutorialExample[] = [
  {
    title: "Melodies",
    body: "A melody is a sequence of notes. Notes use pitch names plus octaves.",
    details: "Notes: c, d, e, f, g, a, b with optional # or b, plus an octave number, for example c4, f#3, bb4.",
    source: `melody("c4 d4 e4 g4")`,
  },
  {
    title: "Rests",
    body: "Use an underscore when a step should be silent.",
    details: "Rest token: _. Whitespace separates steps.",
    source: `melody("c4 _ e4 _ g4 _ e4 _")`,
  },
  {
    title: "Durations",
    body: "Add a slash to make an event shorter or longer than one step.",
    details: "Duration suffix: /number. The number must be greater than 0, for example /2, /4, /0.5.",
    source: `melody("c4/2 d4/2 e4 g4/2 e4/2 c4")`,
  },
  {
    title: "Velocity",
    body: "Add a colon to control how hard a note or drum is played.",
    details: "Velocity suffix: :number. Use 0 to 1 for normal quiet-to-loud values.",
    source: `melody("c4:0.25 d4:0.5 e4:0.75 g4:1")`,
  },
  {
    title: "Chords",
    body: "Use plus signs to play multiple notes at the same time.",
    details: "Any melody notes can be stacked with + inside one step.",
    source: `melody("c4+e4+g4 _ f4+a4+c5 _ g4+b4+d5 _ c4+e4+g4")`,
  },
  {
    title: "Arpeggios",
    body: "Arpeggios turn chords into fast melodic note sequences.",
    details: "Modes: up, down, updown. This technique was commonly used on classic systems such as the NES, Game Boy, and Commodore 64.",
    source: `song(
  melody("c4+e4+g4 c4+f4+a4")
    .arp("up")
    .preset("chip-lead"),

  melody("c2+g2")
    .arp("updown")
    .preset("chip-bass")
    .gain(0.7)
)`
  },
  {
    title: "Drums",
    body: "Beat patterns use named drum sounds such as kick, snare, hihat, clap, and tom.",
    details: "Drums: kick, snare, clap, hihat, openhat, tom, lowtom, midtom, hitom, crash.",
    source: `beat("kick _ snare _ kick hihat snare hihat")`,
  },
  {
    title: "Drum Stacks",
    body: "Drums can be stacked with plus signs just like chords.",
    details: "Any drum names can be stacked with + inside one step.",
    source: `beat("kick+hihat _ snare+hihat _ kick openhat snare hihat")`,
  },
  {
    title: "Sounds",
    body: "Use sound() to choose the synth waveform for a melody layer.",
    details: "Waveforms: sine, triangle, square, sawtooth.",
    source: `melody("c4 e4 g4 c5")
  .sound("square")`,
  },
  {
    title: "Envelope",
    body: "Use envelope modifiers to shape how notes fade in, settle, and release.",
    details: "attack, decay, and release are seconds from 0 to 30. sustain is a level from 0 to 1.",
    source: `melody("c4 e4 g4 c5")
  .sound("triangle")
  .attack(0.02)
  .decay(0.18)
  .sustain(0.45)
  .release(0.35)`,
  },
  {
    title: "Presets",
    body: "Use preset() for quick layer defaults that can still be overridden.",
    details: "Presets: chip-lead, chip-bass, soft-pad, metal-rhythm, arcade-pluck.",
    source: `song(
  melody("c5 e5 g5 c6")
    .preset("chip-lead"),
  melody("c2 _ g1 _")
    .preset("chip-bass"),
  melody("c4+g4 _ eb4+bb4 _")
    .preset("metal-rhythm")
)`,
  },
  {
    title: "Drum Banks",
    body: "Use bank() to switch the overall drum-kit character.",
    details: "Banks: default, 808, arcade. 808 is rounder and longer; arcade is shorter and clickier.",
    source: `song(
  beat("kick _ snare _")
    .bank("808"),
  beat("_ hihat _ hihat")
    .fast(2)
    .bank("808")
)`,
  },
  {
    title: "Effects",
    body: "Use effects to shape the whole layer after its notes or drums are generated.",
    details: "delay: 0 to 2 seconds. echo, room, reverb, distortion, chorus: 0 to 1. lowpass and highpass: 20 to 20000 Hz.",
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
    title: "Sequences",
    body: "sequence() plays patterns one after another.",
    details: "Pass one or more patterns separated by commas.",
    source: `sequence(
  melody("c4 e4 g4 c5"),
  melody("d4 f4 a4 d5"),
  melody("e4 g4 b4 e5")
)`,
  },
  {
    title: "Songs",
    body: "song() plays patterns together as separate layers.",
    details: "Pass one or more patterns separated by commas. Short non-looping layers are expanded to match the song length.",
    source: `song(
  melody("c4 e4 g4 c5"),
  beat("kick _ snare _")
)`,
  },
  {
    title: "Gain",
    body: "Use gain() to mix a layer louder or quieter.",
    details: "Range: 0 to 1.",
    source: `song(
  melody("c4 e4 g4 c5").sound("square").gain(0.45),
  melody("c2 _ g1 _").sound("triangle").gain(0.8)
)`,
  },
  {
    title: "Panning",
    body: "Use pan() to place layers in the stereo field.",
    details: "Range: -1 full left, 0 center, 1 full right.",
    source: `song(
  melody("c4 e4 g4 c5").sound("triangle").pan(-0.7),
  melody("e4 g4 c5 e5").sound("square").pan(0.7)
)`,
  },
  {
    title: "Repeats",
    body: "repeat() copies a phrase inside the pattern, before the next phrase plays.",
    details: "Value: positive integer, for example repeat(2) or repeat(4). This changes the compiled song length before playback wraps around.",
    source: `sequence(
  melody("c4 e4").repeat(3),
  melody("g4 c5")
)`,
  },
  {
    title: "Speed",
    body: "fast() compresses a pattern so it plays more times in the same space.",
    details: "fast(), slow(), and rate() accept values greater than 0 up to 100.",
    source: `beat("hihat _ hihat _").fast(4)`,
  },
  {
    title: "Transposition",
    body: "transpose() shifts melody notes by semitones.",
    details: "Value: integer semitones. 12 is one octave up, -12 is one octave down.",
    source: `song(
  melody("c4 d4 e4 g4"),
  melody("c4 d4 e4 g4").transpose(12).sound("square").gain(0.35)
)`,
  },
  {
    title: "Layers",
    body: "Layers can combine melodies, drums, and different loop lengths.",
    details: "Use song() for parallel layers and loop() for layers that should repeat inside the song.",
    source: `song(
  melody("c4 e4 g4 c5").sound("triangle").loop(),
  beat("kick _ snare _").loop(),
  beat("_ hihat _ hihat").fast(2).gain(0.35).loop()
)`,
  },
  {
    title: "Offsets",
    body: "offset() delays a layer or phrase by a number of beats.",
    details: "Value: integer beats, for example offset(2).",
    source: `song(
  melody("c4 _ e4 _ g4 _ c5 _"),
  melody("g4 _ c5 _ e5 _ g5 _").offset(2).sound("square").gain(0.45)
)`,
  },
  {
    title: "Loops",
    body: "loop() lets a short layer repeat underneath a longer layer.",
    details: "No value: call loop(). It is most useful inside song(), where one layer is shorter than the full song.",
    source: `song(
  melody("c2 _ g1 _").sound("sawtooth").loop(),
  sequence(
    melody("c4 e4 g4 c5"),
    melody("d4 f4 a4 d5")
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
  root.innerHTML = `
    <main>
      <header class="app-header">
        <button class="brand-button" type="button" data-view="home">Synth8</button>
        <nav class="main-nav" aria-label="Main">
          <button class="nav-button" type="button" data-view="lab">Laboratory</button>
          <button class="nav-button is-active" type="button" data-view="tutorial">Tutorial</button>
        </nav>
      </header>

      <section class="tutorial-hero">
        <h1>Synth8 Tutorial</h1>
        <p class="lead">Each example is editable and playable. Change a pattern, then press Play to hear what changed.</p>
      </section>

      <div class="tutorial-list">
        ${tutorialExamples.map((example, index) => `
          <article class="tutorial-card" data-example-index="${index}">
            <div class="tutorial-copy">
              <h2>${example.title}</h2>
              <p>${example.body}</p>
              <p class="tutorial-details">${example.details}</p>
            </div>
            <label class="sr-only" for="tutorial-source-${index}">
              Synth8 source for ${example.title}
            </label>
            <textarea class="tutorial-editor" id="tutorial-source-${index}" rows="5">${escapeHtml(example.source)}</textarea>
            <div class="tutorial-controls">
              <label class="tutorial-bpm">
                <span>BPM</span>
                <input class="tutorial-bpm-input" type="number" min="40" max="240" value="${example.bpm ?? 120}" />
              </label>
              <button class="tutorial-play" type="button">Play</button>
              <button class="tutorial-stop" type="button">Stop</button>
            </div>
            <div class="tutorial-status" role="status" aria-live="polite">Idle.</div>
          </article>
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
    const playButton = card.querySelector<HTMLButtonElement>(".tutorial-play")!;
    const stopButton = card.querySelector<HTMLButtonElement>(".tutorial-stop")!;
    const status = card.querySelector<HTMLDivElement>(".tutorial-status")!;

    playButton.addEventListener("click", async () => {
      try {
        playButton.disabled = true;
        status.textContent = "Preparing...";
        status.classList.add("is-busy");
        stop();

        const pattern = compile(editor.value);
        const bpm = Number(bpmInput.value);

        await play(pattern, {
          bpm,
          playbackMode: "streamed",
        });

        status.textContent = "Playing.";
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
  });
}
