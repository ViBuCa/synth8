# Synt8

Synt8 is an MIT-licensed pattern music toolkit for TypeScript projects.

The long-term goal is to provide:

* A pattern language inspired by live-coding environments
* A TypeScript parser and compiler
* A Web Audio / Tone.js playback engine
* A reusable web editor
* A browser playground
* Easy integration with game engines such as Phaser

Synt8 is intended to be MIT licensed and suitable for inclusion in proprietary applications.

---

## Repository Structure

```text
synt8/
├── apps/
│   └── playground/
├── packages/
│   ├── core/
│   ├── player/
│   └── editor/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Packages

| Package              | Purpose                              |
| -------------------- | ------------------------------------ |
| `@vibuca/core`       | Parser, AST, compiler, pattern model |
| `@vibuca/player`     | Audio playback engine                |
| `@vibuca/editor`     | Reusable editor component            |
| `@vibuca/playground` | Browser-based development playground |

---

## Requirements

* Node.js 22+
* pnpm 11+

---

## Initial Setup

Clone the repository:

```bash
git clone <repository-url>
cd synt8
```

Install dependencies:

```bash
pnpm install
```

Build all packages:

```bash
pnpm build
```

---

## Development

Start the playground:

```bash
pnpm dev
```

This launches the development server for:

```text
apps/playground
```

---

## Building

Build everything:

```bash
pnpm build
```

Build a single package:

```bash
pnpm --filter @vibuca/core build
```

or

```bash
pnpm --filter @vibuca/player build
```

---

## Workspace Packages

Packages depend on each other using pnpm workspace references:

```json
{
  "dependencies": {
    "@vibuca/core": "workspace:*"
  }
}
```

This allows local development without publishing packages.

---

## Testing

Testing has not yet been configured.

Planned tooling:

* Vitest
* Playwright
* GitHub Actions

---

## Publishing Packages

Log into npm:

```bash
pnpm login
```

Build packages:

```bash
pnpm build
```

Publish a package:

```bash
pnpm --filter @vibuca/core publish --access public
```

Publish all public packages:

```bash
pnpm -r publish --access public
```

Only packages inside `packages/` should be published.

The playground application should remain private.

---

## Local Package Usage

After publishing:

```bash
pnpm add @vibuca/core
```

Example:

```ts
import { hello } from "@vibuca/core";

console.log(hello());
```

---

## Git Workflow

Create a feature branch:

```bash
git checkout -b feature/my-feature
```

Commit changes:

```bash
git add .
git commit -m "feat: add parser support"
```

Push:

```bash
git push origin feature/my-feature
```

---

## License

MIT

```
Copyright (c) 2026 Vibuca
```

---

## Project Status

Early development.

Current milestone:

* [x] Monorepo setup
* [x] pnpm workspaces
* [x] Vite library builds
* [x] Playground application
* [ ] Pattern parser
* [ ] AST
* [ ] Compiler
* [ ] Audio scheduler
* [ ] Tone.js player
* [ ] Web editor
* [ ] MIDI export
* [ ] Phaser integration examples
