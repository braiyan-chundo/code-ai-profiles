import type { SystemInfo } from "../types";

export type SystemPlatform = SystemInfo["platform"];
export type RuntimePlatform = Exclude<SystemPlatform, "unknown">;

/** La plataforma que informa Rust y, si no la conoce, la que deduce el navegador. */
export function resolveRuntimePlatform(platform: SystemPlatform, navigatorPlatform: string): RuntimePlatform {
  const browserPlatform = navigatorPlatform.toLowerCase();
  const fallbackPlatform = browserPlatform.includes("mac")
    ? "macos"
    : browserPlatform.includes("linux")
      ? "linux"
      : "windows";
  return platform === "unknown"
    ? fallbackPlatform
    : platform;
}

/** La tecla modificadora que se muestra junto al buscador. */
export function shortcutModifierLabel(navigatorPlatform: string): string {
  return navigatorPlatform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";
}
