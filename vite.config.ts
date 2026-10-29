import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuration Vite pour Tauri 2 : port fixe, pas de nettoyage d'écran
// pour laisser passer les messages de Rust.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "es2021",
    outDir: "dist",
  },
});
