# @vibuca/synth8-phaser-plugin

Phaser integration for Synth8, an MIT-licensed TypeScript music DSL and playback toolkit.

Use Synth8 patterns directly inside Phaser scenes for background music and overlapping sound effects.

## Install

```bash
npm install @vibuca/synth8-core @vibuca/synth8-player @vibuca/synth8-phaser-plugin
```

You also need Phaser:

```bash
npm install phaser
```

## Register the plugin

```ts
import Phaser from "phaser";
import { Synth8Plugin } from "@vibuca/synth8-phaser-plugin";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [GameScene],
  plugins: {
    scene: [
      {
        key: "Synth8Plugin",
        plugin: Synth8Plugin,
        mapping: "synth8",
      },
    ],
  },
};
```

## TypeScript scene typing

```ts
declare global {
  namespace Phaser {
    interface Scene {
      synth8: Synth8Plugin;
    }
  }
}
```

## Prepared tracks, persistent audio, and backends

The audio service is owned by the Phaser `Game`, not a scene, so it survives
scene changes and level transitions. Register tracks once (for example in a
loading scene), then preload or play them by key:

```ts
this.synth8.registerTrack("menu", `song(melody("c4 e4 g4").loop())`, {
  bpm: 120, playbackMode: "rendered", // "live" | "streamed" | "rendered"
});
await this.synth8.preload("menu");
await this.synth8.playTrack("menu");
```

Use `pushMusic`/`popMusic` for a pause or boss stack. `setMusicDucking(0.35)`
attenuates music while dialogue plays and `unduckMusic()` restores it. Phaser
assets that were rendered or loaded separately can optionally use
`this.synth8.playBuffer("asset-key")` (Phaser's Web Audio backend).

## Play music

```ts
await this.synth8.startAudio({
  masterVolume: 1,
  musicVolume: 0.7,
  sfxVolume: 1,
});

await this.synth8.playMusic(
  `song(
    melody("c4 e4 g4 c5")
      .preset("chip-lead")
      .loop(),

    beat("kick _ snare _")
      .bank("arcade")
      .loop()
  )`,
  {
    bpm: 150,
  }
);
```

## Stop music

```ts
this.synth8.stopMusic();
```

## Pause and resume music

```ts
this.synth8.pauseMusic();
this.synth8.resumeMusic();
this.synth8.stopMusic();
```

## Sound effects

Prepare SFX once:

```ts
await this.synth8.prepareSfx(
  "laser",
  `melody("c7/16 g6/16 c6/16")
    .preset("arcade-pluck")
    .fast(16)
    .gain(0.5)`,
  {
    bpm: 180,
    voices: 10,
  }
);
```

Trigger them during gameplay:

```ts
this.synth8.playSfx("laser");
```

## Volumes

```ts
this.synth8.setMasterVolume(1);
this.synth8.setMusicVolume(0.7);
this.synth8.setSfxVolume(1);
```

## License

MIT
