import Phaser from "phaser";
import { compile } from "@vibuca/synth8-core";
import { play, stop } from "@vibuca/synth8-player";

export type Synth8PlayOptions = {
    bpm?: number;
};

export class Synth8Plugin extends Phaser.Plugins.ScenePlugin {
    private currentBpm = 120;

    constructor(scene: Phaser.Scene, pluginManager: Phaser.Plugins.PluginManager) {
        super(scene, pluginManager, "Synt8Plugin");

        scene.events.once("shutdown", this.shutdown, this);
        scene.events.once("destroy", this.destroy, this);
    }

    play(source: string, options: Synth8PlayOptions = {}): void {
        this.currentBpm = options.bpm ?? this.currentBpm;

        const pattern = compile(source);

        stop();
        play(pattern, {
            bpm: this.currentBpm,
        });
    }

    stop(): void {
        stop();
    }

    setBpm(bpm: number): void {
        this.currentBpm = bpm;
        // Later: forward to player when Synth8 supports live BPM changes.
    }

    shutdown(): void {
        this.stop();
    }

    destroy(): void {
        this.stop();
    }
}