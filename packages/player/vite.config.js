import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [dts()],
  worker: {
    rollupOptions: {
      // The worker is shipped as a separate module, but Tone must be bundled
      // into it: consumers do not resolve package imports inside worker URLs.
      external: ["@vibuca/synth8-core"]
    }
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index"
    },
    rollupOptions: {
      external: ["tone", "@vibuca/synth8-core"]
    }
  }
});