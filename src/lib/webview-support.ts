/**
 * HU-0016 (A-16): la interfaz, con Tailwind 4, necesita capas en cascada (`@layer`) y `color-mix()`. Un motor web
 * sin ellas (un WebKitGTK anterior a 2.40 en Linux) se quedaría sin estilos. Esta comprobación pura se hace antes de
 * pintar la app: recibe `CSS` y el constructor de `CSSLayerBlockRule` para poder probarla sin navegador.
 */

/** Lo único de `CSS` que se usa. */
export interface CssSupports {
  supports(property: string, value: string): boolean;
}

export const UNSUPPORTED_WEBVIEW_MESSAGE =
  "El motor web del sistema no es compatible con esta versión. En Linux, actualiza libwebkit2gtk-4.1-0 a 2.40 o posterior.";

export function isWebviewSupported(css: CssSupports | undefined, layerBlockRule: unknown): boolean {
  if (typeof layerBlockRule === "undefined") return false;
  try {
    return css?.supports("color", "color-mix(in srgb, red, red)") === true;
  } catch {
    return false;
  }
}
