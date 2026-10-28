import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [react()];
  // HU-0014: Tailwind solo existe para el showcase, que solo sirve `pnpm dev`. `vite build` no lo carga.
  if (command === "serve") plugins.push((await import("@tailwindcss/vite")).default());
  return {
    plugins,
    resolve: { alias: { "@": "/src" } },
    clearScreen: false,
    server: {
      strictPort: true,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
