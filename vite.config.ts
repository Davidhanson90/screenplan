import { defineConfig } from "vite";

export default defineConfig({
  base: "/screenplan/",
  server: {
    open: false,
    port: 5173
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
