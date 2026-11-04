import { convertFileSrc } from "@tauri-apps/api/core";
import { bridge } from "./bridge";

/**
 * La URL con la que el webview carga un archivo local: en el navegador (mocks) es la propia ruta; en escritorio, el
 * protocolo de assets de Tauri. Con `revision`, un `?v=` hace que la imagen se recargue al cambiar el archivo.
 */
export function localFileSource(path: string, revision?: number): string {
  if (!bridge.isDesktop()) return path;
  const source = convertFileSrc(path);
  return revision === undefined ? source : `${source}?v=${revision}`;
}
