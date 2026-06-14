import Phaser from "phaser";
import type { Synth8Plugin } from "@vibuca/synth8-phaser-plugin";

declare global {
    namespace Phaser {
        interface Scene {
            synth8: Synth8Plugin;
        }
    }
}

const MUSIC = `song(
  sequence(
    melody("e5+g5+b5 d5+f#5+a5 c5+e5+g5 b4+d5+f#5")
      .arp("updown")
      .preset("chip-lead")
      .delay(0.08)
      .echo(0.15),

    melody("e5+g5+b5 g5+b5+d6 a5+c6+e6 b5+d6+f#6")
      .arp("updown")
      .preset("chip-lead")
      .delay(0.08)
      .echo(0.15),

    melody("c6+b5 a5 g5 e5 d5 c5 b4")
      .preset("chip-lead")
      .gain(0.85),

    melody("e5 g5 b5 d6 b5 g5 e5 d5")
      .preset("chip-lead")
      .gain(0.85)
  )
  .repeat(2),

  sequence(
    melody("e2 _ b1 _ g1 _ b1 _"),
    melody("c2 _ g1 _ c2 _ g1 _"),
    melody("a1 _ e1 _ a1 _ e1 _"),
    melody("b1 _ f#1 _ b1 _ f#1 _")
  )
    .preset("chip-bass")
    .gain(0.8)
    .loop(),

  sequence(
    melody("e4+b4 _ d4+a4 _")
      .preset("metal-rhythm"),

    melody("c4+g4 _ b3+f#4 _")
      .preset("metal-rhythm"),

    melody("a3+e4 _ b3+f#4 _")
      .preset("metal-rhythm"),

    melody("g3+d4 _ b3+f#4 _")
      .preset("metal-rhythm")
  )
    .gain(0.35)
    .loop(),

  beat("kick _ snare _")
    .bank("808")
    .gain(0.85)
    .loop(),

  beat("_ hihat _ hihat")
    .bank("arcade")
    .fast(2)
    .gain(0.35)
    .loop(),

  beat("_ _ kick+crash _")
    .gain(0.25)
    .repeat(8)
)`;

const LASER = `song(
  melody("c7 b6 a6 g6 f6 e6 d6 c6")
    .preset("chip-lead")
    .distortion(0.45)
    .chorus(0.35)
    .fast(8)
    .gain(0.55),

  melody("c6 g5 c5")
    .preset("chip-bass")
    .fast(8)
    .gain(0.25)
)`;

const EXPLOSION = `song(
  beat("kick+crash")
    .bank("808")
    .gain(0.95)
    .distortion(0.35)
    .room(0.35),

  beat("_ lowtom+snare _ rim")
    .bank("arcade")
    .fast(2)
    .gain(0.45)
    .distortion(0.25),

  melody("c3 g2 c2")
    .sound("sawtooth")
    .fast(4)
    .gain(0.25)
    .distortion(0.4)
    .lowpass(700)
)`;

const POWER_UP = `song(
  melody("c5 e5 g5 c6 e6 g6 c7")
    .preset("arcade-pluck")
    .fast(6)
    .gain(0.5)
    .delay(0.08)
    .echo(0.2),

  melody("c4+e4+g4 c5+e5+g5")
    .arp("up")
    .preset("chip-lead")
    .fast(3)
    .gain(0.25)
    .chorus(0.25)
)`;

export class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    async create() {
        this.add.text(40, 32, "Synth8 Phaser Test Game", {
            fontFamily: "monospace",
            fontSize: "24px",
            color: "#f8f8f2",
        });

        this.add.text(
            40,
            84,
            [
                "M = start music",
                "S = stop music",
                "P = pause music",
                "R = resume music",
                "1 = laser SFX",
                "2 = explosion SFX",
                "3 = power up SFX",
                "Up/Down = music volume",
                "Left/Right = SFX volume",
            ],
            {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#c7c7d8",
                lineSpacing: 10,
            }
        );

        await this.synth8.startAudio({
            masterVolume: 1,
            musicVolume: 0.75,
            sfxVolume: 1,
        });

        await this.synth8.prepareSfx("laser", LASER, {
            bpm: 180,
            voices: 10,
        });

        await this.synth8.prepareSfx("explosion", EXPLOSION, {
            bpm: 170,
            voices: 5,
        });

        await this.synth8.prepareSfx("coin", POWER_UP, {
            bpm: 180,
            voices: 2,
        });

        this.input.keyboard?.on("keydown-M", async () => {
            await this.synth8.playMusic(MUSIC, {
                bpm: 155,
            });
        });

        this.input.keyboard?.on("keydown-S", () => {
            this.synth8.stopMusic();
        });

        this.input.keyboard?.on("keydown-P", () => {
            this.synth8.pauseMusic();
        });

        this.input.keyboard?.on("keydown-R", () => {
            this.synth8.resumeMusic();
        });

        this.input.keyboard?.on("keydown-ONE", () => {
            this.synth8.playSfx("laser");
        });

        this.input.keyboard?.on("keydown-TWO", () => {
            this.synth8.playSfx("explosion");
        });

        this.input.keyboard?.on("keydown-THREE", () => {
            this.synth8.playSfx("coin");
        });

        let musicVolume = 0.75;
        let sfxVolume = 1;

        this.input.keyboard?.on("keydown-UP", () => {
            musicVolume = Math.min(1.5, musicVolume + 0.05);
            this.synth8.setMusicVolume(musicVolume);
        });

        this.input.keyboard?.on("keydown-DOWN", () => {
            musicVolume = Math.max(0, musicVolume - 0.05);
            this.synth8.setMusicVolume(musicVolume);
        });

        this.input.keyboard?.on("keydown-LEFT", () => {
            sfxVolume = Math.min(1.5, sfxVolume - 0.05);
            this.synth8.setSfxVolume(sfxVolume);
        });

        this.input.keyboard?.on("keydown-RIGHT", () => {
            sfxVolume = Math.max(0, sfxVolume + 0.05);
            this.synth8.setSfxVolume(sfxVolume);
        });
    }

    shutdown() {
        this.synth8.stopMusic();
    }
}
