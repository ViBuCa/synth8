import Phaser from "phaser";
import { compile } from "@vibuca/synth8-core";
import {
  createGameAudio,
  pause,
  play,
  resume,
  stop,
} from "@vibuca/synth8-player";
import type {
  GameAudio,
  PlayOptions,
  PreparedPlayback,
  PreparedSfx,
} from "@vibuca/synth8-player";

export class Synth8Plugin extends Phaser.Plugins.ScenePlugin {
  private gameAudio?: GameAudio;
  private music?: PreparedPlayback;
  private sfx = new Map<string, PreparedSfx>();

  async play(source: string, options: PlayOptions = {}) {
    const pattern = compile(source);
    await play(pattern, options);
  }

  pause() {
    pause();
  }

  resume() {
    resume();
  }

  stop() {
    stop();
  }

  async startGameAudio(options?: {
    masterVolume?: number;
    musicVolume?: number;
    sfxVolume?: number;
  }) {
    this.gameAudio = await createGameAudio(options);
    return this.gameAudio;
  }

  private async getGameAudio(): Promise<GameAudio> {
    if (!this.gameAudio) {
      this.gameAudio = await createGameAudio();
    }

    return this.gameAudio;
  }

  async playMusic(source: string, options?: Parameters<GameAudio["prepareMusic"]>[1]
) {
    const audio = await this.getGameAudio();

    this.music?.stop();

    this.music = await audio.prepareMusic(compile(source), options);
    this.music.start();

    return this.music;
  }

  stopMusic() {
    this.music?.stop();
    this.music = undefined;
  }

  async prepareSfx(
    key: string,
    source: string,
    options: PlayOptions & { voices?: number } = {}

  ) {
    const audio = await this.getGameAudio();
    const prepared = await audio.prepareSfx(compile(source), options);

    this.sfx.set(key, prepared);

    return prepared;
  }

  async playSfx(key: string) {
    const audio = await this.getGameAudio();
    const prepared = this.sfx.get(key);

    if (!prepared) {
      throw new Error(`Unknown Synth8 SFX: ${key}`);
    }

    audio.playSfx(prepared);
  }

  setMasterVolume(value: number) {
    this.gameAudio?.setMasterVolume(value);
  }

  setMusicVolume(value: number) {
    this.gameAudio?.setMusicVolume(value);
  }

  setSfxVolume(value: number) {
    this.gameAudio?.setSfxVolume(value);
  }

  shutdown() {
    this.stop();
    this.stopMusic();
    this.sfx.clear();
  }

  destroy() {
    this.shutdown();
    super.destroy();
  }
}