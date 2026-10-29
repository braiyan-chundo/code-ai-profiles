import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import App from "./app/App";
import { isWebviewSupported, UNSUPPORTED_WEBVIEW_MESSAGE } from "./lib/webview-support";
import "./styles/index.css";

const root = document.getElementById("root")!;

if (isWebviewSupported(globalThis.CSS, globalThis.CSSLayerBlockRule)) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  // A-16: sin Tailwind (el motor descartaría sus capas), con estilos en línea y colores del sistema. Sin enlaces ni red.
  const notice = document.createElement("p");
  notice.setAttribute("role", "alert");
  notice.textContent = UNSUPPORTED_WEBVIEW_MESSAGE;
  notice.style.cssText = [
    "box-sizing: border-box",
    "height: 100%",
    "margin: 0",
    "padding: 48px",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "text-align: center",
    "font: 15px/1.5 Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "background: Canvas",
    "color: CanvasText",
  ].join("; ");
  root.replaceChildren(notice);
}
