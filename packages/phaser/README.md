# @vibuca/synth8-phaser

Phaser integration for Synth8, an MIT-licensed TypeScript music DSL and playback toolkit.

Use Synth8 patterns directly inside Phaser scenes for background music and overlapping sound effects.

## Install

```bash
npm install @vibuca/synth8-core @vibuca/synth8-player @vibuca/synth8-phaser
```

You also need Phaser:

```bash
npm install phaser
```

## Register the plugin

```ts
import Phaser from "phaser";
import { Synth8Plugin } from "@vibuca/synth8-phaser";

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

## Play music

```ts
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

## Pause and resume simple playback

```ts
this.synth8.pause();
this.synth8.resume();
this.synth8.stop();
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
