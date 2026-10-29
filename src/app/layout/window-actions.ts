import { getCurrentWindow } from "@tauri-apps/api/window";
import { bridge } from "../../lib/bridge";

export type WindowAction = "close" | "minimize" | "maximize";

/** Los controles propios de la ventana (Windows). En el navegador no hacen nada. */
export async function windowAction(action: WindowAction) {
  if (!bridge.isDesktop()) return;
  const window = getCurrentWindow();
  if (action === "close") await window.close();
  if (action === "minimize") await window.minimize();
  if (action === "maximize") await window.toggleMaximize();
}
