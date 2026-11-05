import type { OriginalProfileOrigin } from "../../types";

/** Lo que la pantalla de la original necesita saber de su carpeta de datos (HU-0029, A-5). */
export type OriginalProfileView = {
  /** El valor de «Perfil local». */
  label: "Elegido" | "Detectado" | "Sin sesiones" | "Sin detectar";
  warning: "chosen-missing" | "no-sessions" | null;
  /** La ruta elegida por la persona; solo con origen `chosen`. */
  chosenPath: string | null;
  /** Hay algo que olvidar: una carpeta elegida o una elegida que ya no existe. */
  canForget: boolean;
};

export function originalProfileView(system: {
  originalProfilePath: string | null;
  originalProfileOrigin: OriginalProfileOrigin;
  originalProfileHasSessions: boolean;
  originalProfileChosenMissing: boolean;
}): OriginalProfileView {
  const { originalProfileOrigin: origin, originalProfileHasSessions: hasSessions, originalProfileChosenMissing: missing } = system;
  const label: OriginalProfileView["label"] =
    origin === "chosen" ? "Elegido" : origin === "none" ? "Sin detectar" : hasSessions ? "Detectado" : "Sin sesiones";
  return {
    label,
    warning: missing ? "chosen-missing" : !hasSessions ? "no-sessions" : null,
    chosenPath: origin === "chosen" ? system.originalProfilePath : null,
    canForget: origin === "chosen" || missing,
  };
}
