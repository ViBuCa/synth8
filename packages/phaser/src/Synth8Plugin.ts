import Phaser from "phaser";
import { compile } from "@vibuca/synth8-core";
import { createGameAudio, prepare } from "@vibuca/synth8-player";
import type {
  GameAudio,
  GameAudioOptions,
  GameMusicOptions,
  GameSfxOptions,
  PlayOptions,
  PlaySfxOptions,
  PreparedPlayback,
  PreparedSfx,
} from "@vibuca/synth8-player";

export class Synth8Plugin extends Phaser.Plugins.ScenePlugin {
  private gameAudio?: GameAudio;
  private playback?: PreparedPlayback;
  private music?: PreparedPlayback;
  private sfx = new Map<string, PreparedSfx>();

  async play(
    source: string,
    options: PlayOptions = {}
  ): Promise<PreparedPlayback> {
    this.playback?.stop();

    this.playback = await prepare(compile(source), options);
    this.playback.start();

    return this.playback;
  }

  async startAudio(options?: GameAudioOptions) {
    this.stopMusic();
    this.disposeSfx();
    this.gameAudio?.dispose();
    this.gameAudio = await createGameAudio(options);
    return this.gameAudio;
  }

  pause() {
    this.playback?.pause();
  }

  resume() {
    this.playback?.resume();
  }

  stop() {
    this.playback?.stop();
    this.playback = undefined;
  }

  async startGameAudio(options?: GameAudioOptions) {
    return this.startAudio(options);
  }

  private async getGameAudio(): Promise<GameAudio> {
    if (!this.gameAudio) {
      this.gameAudio = await createGameAudio();
    }

    return this.gameAudio;
  }

  async playMusic(
    source: string,
    options?: GameMusicOptions
  ): Promise<PreparedPlayback> {
    const audio = await this.getGameAudio();

    this.music?.stop();

    this.music = await audio.prepareMusic(compile(source), options);
    this.music.start();

    return this.music;
  }

  pauseMusic() {
    this.music?.pause();
  }

  resumeMusic() {
    this.music?.resume();
  }

  stopMusic() {
    this.music?.stop();
    this.music = undefined;
  }

  async prepareSfx(
    key: string,
    source: string,
    options: GameSfxOptions = {}
  ) {
    const audio = await this.getGameAudio();
    const prepared = await audio.prepareSfx(compile(source), options);

    this.sfx.set(key, prepared);

    return prepared;
  }

  async playSfx(key: string, options?: PlaySfxOptions) {
    const audio = await this.getGameAudio();
    const prepared = this.sfx.get(key);

    if (!prepared) {
      throw new Error(`Unknown Synth8 SFX: ${key}`);
    }

    audio.playSfx(prepared, options);
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

  private disposeSfx() {
    for (const sfx of this.sfx.values()) {
      sfx.dispose();
    }

    this.sfx.clear();
  }

  shutdown() {
    this.stop();
    this.stopMusic();
    this.disposeSfx();
    this.gameAudio?.dispose();
    this.gameAudio = undefined;
  }

  destroy() {
    this.shutdown();
    super.destroy();
  }
}
