import Phaser from "phaser";
import { Synth8Plugin } from "@vibuca/synth8-phaser-plugin";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game",
    width: 800,
    height: 480,
    backgroundColor: "#101018",
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

new Phaser.Game(config);