import './style.css';

type View = "home" | "lab" | "tutorial";

const app = document.querySelector<HTMLDivElement>("#app")!;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function renderShell(view: View, content: string) {
  app.innerHTML = `
    <main>
      <header class="app-header">
        <button class="brand-button" type="button" data-view="home">Synth8</button>
        <nav class="main-nav" aria-label="Main">
          <button class="nav-button ${view === "lab" ? "is-active" : ""}" type="button" data-view="lab">Laboratory</button>
          <button class="nav-button ${view === "tutorial" ? "is-active" : ""}" type="button" data-view="tutorial">Tutorial</button>
        </nav>
      </header>
      ${content}
    </main>
    <footer class="site-footer">
      <a href="https://github.com/ViBuCa/synth8">GitHub</a>
      <span aria-hidden="true">|</span>
      <a href="https://www.npmjs.com/package/@vibuca/synth8-core">npm core</a>
      <span aria-hidden="true">|</span>
      <a href="https://www.npmjs.com/package/@vibuca/synth8-player">npm player</a>
    </footer>
  `;
}

function renderHome(error?: string) {
  renderShell("home", `
    <section class="landing">
      <div class="landing-copy">
        <h1>Synth8 Playground</h1>
        <p class="lead">Compose compact pattern music, test playback modes, export WAV files, and try game-ready music plus SFX.</p>
      </div>
      <div class="landing-actions">
        <button class="landing-action primary" type="button" data-view="lab">Open Laboratory</button>
        <button class="landing-action" type="button" data-view="tutorial">Start Tutorial</button>
      </div>
      ${error ? `<pre class="output output-error">${escapeHtml(error)}</pre>` : ""}
    </section>
  `);
}

async function navigate(view: View) {
  if (view === "home") {
    try {
      const { stop } = await import("@vibuca/synth8-player");
      stop();
    } catch {
      // The landing page should stay reachable even if audio failed to initialize.
    }

    renderHome();
    return;
  }

  try {
    const { stop } = await import("@vibuca/synth8-player");
    stop();

    if (view === "lab") {
      const { renderLab } = await import("./lab");
      renderLab(app);
      return;
    }

    if (view === "tutorial") {
      const { renderTutorial } = await import("./tutorial");
      renderTutorial(app);
      return;
    }
  } catch (error) {
    renderHome(error instanceof Error ? error.message : String(error));
  }
}

app.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-view]");

  if (!button) {
    return;
  }

  const nextView = button.dataset.view;

  if (nextView === "home" || nextView === "lab" || nextView === "tutorial") {
    void navigate(nextView);
  }
});

renderHome();
