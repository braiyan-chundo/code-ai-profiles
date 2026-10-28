import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./showcase.css";

function Showcase() {
  return (
    <main className="p-8">
      <button type="button" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white">
        Botón con utilidades
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
);
