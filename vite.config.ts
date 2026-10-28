import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// HU-0016 (A-1): Tailwind entra en la app, así que se carga siempre. `vite build` sigue empaquetando solo
// `index.html`: el showcase (`showcase.html`) solo lo sirve `pnpm dev` y no llega a `dist/`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": "/src" } },
  clearScreen: false,
  server: {
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
