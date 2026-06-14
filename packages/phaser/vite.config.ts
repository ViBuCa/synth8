import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";

export default defineConfig({
    plugins: [dts({ entryRoot: "src" })],
    build: {
        lib: {
            entry: "src/index.ts",
            formats: ["es"],
            fileName: "index",
        },
        rollupOptions: {
            external: [
                "phaser",
                "@vibuca/synth8-core",
                "@vibuca/synth8-player",
            ],
        },
    },
});
