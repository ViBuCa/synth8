import Phaser from "phaser";
import type { Synth8Plugin } from "@vibuca/synth8-phaser";

declare global {
    namespace Phaser {
        interface Scene {
            synth8: Synth8Plugin;
        }
    }
}

const MUSIC = `song(
  melody("c4+e4+g4 f4+a4+c5 g4+b4+d5 c5+e5+g5")
    .arp("updown")
    .preset("chip-lead")
    .delay(0.12)
    .echo(0.25)
    .loop(),

  melody("c2 _ g1 _ bb1 _ g1 _")
    .preset("chip-bass")
    .loop(),

  beat("kick _ snare _")
    .bank("arcade")
    .loop(),

  beat("_ hihat _ hihat")
    .bank("arcade")
    .fast(2)
    .gain(0.35)
    .loop()
)`;

const LASER = `melody("c7/16 g6/16 c6/16")
  .preset("arcade-pluck")
  .fast(16)
  .gain(0.55)`;

const EXPLOSION = `song(
  beat("kick+crash")
    .bank("808")
    .gain(0.9),

  beat("_ lowtom+snare")
    .bank("arcade")
    .fast(2)
    .gain(0.45)
)`;

const COIN = `melody("e6/16 c7/16")
  .preset("arcade-pluck")
  .fast(16)
  .gain(0.5)`;

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
                "1 = laser SFX",
                "2 = explosion SFX",
                "3 = coin SFX",
                "Up/Down = music volume",
            ],
            {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#c7c7d8",
                lineSpacing: 10,
            }
        );

        await this.synth8.startGameAudio({
            masterVolume: 1,
            musicVolume: 0.75,
            sfxVolume: 1,
        });

        await this.synth8.prepareSfx("laser", LASER, {
            bpm: 180,
            voices: 10,
        });

        await this.synth8.prepareSfx("explosion", EXPLOSION, {
            bpm: 140,
            voices: 10,
        });

        await this.synth8.prepareSfx("coin", COIN, {
            bpm: 180,
            voices: 10,
        });

        this.input.keyboard?.on("keydown-M", async () => {
            await this.synth8.playMusic(MUSIC, {
                bpm: 155,
            });
        });

        this.input.keyboard?.on("keydown-S", () => {
            this.synth8.stopMusic();
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

        this.input.keyboard?.on("keydown-UP", () => {
            musicVolume = Math.min(1.5, musicVolume + 0.1);
            this.synth8.setMusicVolume(musicVolume);
        });

        this.input.keyboard?.on("keydown-DOWN", () => {
            musicVolume = Math.max(0, musicVolume - 0.1);
            this.synth8.setMusicVolume(musicVolume);
        });
    }

    shutdown() {
        this.synth8.stopMusic();
    }
}
