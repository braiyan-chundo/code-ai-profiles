import type { SystemInfo } from "../../types";

export interface OriginalUpdateChannel {
  label: string;
  channel: string;
  handoff: string;
  action: string;
}

/** Cómo se actualiza la aplicación original en cada plataforma. */
export function originalUpdateChannel(platform: SystemInfo["platform"], appName: string): OriginalUpdateChannel {
  return platform === "linux"
    ? {
        label: "Linux",
        channel: "Instrucciones oficiales del repositorio apt",
        handoff: "Se abrirán las instrucciones oficiales de apt. Revisa y completa los pasos en tu sistema; Code AI Profiles no ejecutará comandos ni solicitará permisos.",
        action: "Ver instrucciones oficiales",
      }
    : platform === "windows"
      ? {
          label: "Windows",
          channel: "Descarga oficial para Windows",
          handoff: "Se abrirá la descarga oficial. Después debes ejecutar y completar el instalador de Windows; Code AI Profiles no instalará ni cerrará la aplicación por ti.",
          action: "Abrir descarga oficial",
        }
      : {
          label: "macOS",
          channel: "Actualizador oficial de la aplicación original",
          handoff: `Se abrirá únicamente ${appName}. En la aplicación original elige Claude > Check for Updates; Code AI Profiles no automatizará el menú ni solicitará permisos adicionales.`,
          action: `Abrir ${appName}`,
        };
}
