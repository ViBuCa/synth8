import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [dts()],
  worker: {
    rollupOptions: {
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
      external: ["@vibuca/synth8-core"]
    }
  }
});