import type { CustomIcon, InstanceStatus, SystemInfo } from "../../types";

export const ICON_RETRY_RUNNING_HINT = "Detén la instancia para reintentar.";

export interface IconRetryInput {
  platform: SystemInfo["platform"];
  customIcon: CustomIcon | null | undefined;
  status: InstanceStatus;
  /** La persona marcó «Quitar» en el editor, todavía sin guardar. */
  removeIcon: boolean;
  /** Hay otra operación en curso (guardar, o un reintento anterior). */
  busy: boolean;
}

export interface IconRetryState {
  /** Se muestra «Reintentar» (HU-0020, A-5). */
  visible: boolean;
  enabled: boolean;
  /** Texto bajo el botón cuando no se puede reintentar todavía. */
  hint: string | null;
  /** El aviso de «Gestión de apps» sustituye a la línea de estado. */
  appManagement: boolean;
}

const HIDDEN: IconRetryState = { visible: false, enabled: false, hint: null, appManagement: false };

/** Decide si el editor ofrece reaplicar el icono al Dock. Solo macOS, con icono y sin aplicar. */
export function iconRetryState(input: IconRetryInput): IconRetryState {
  const { platform, customIcon, status, removeIcon, busy } = input;
  if (platform !== "macos" || !customIcon || customIcon.systemApplied || removeIcon) return HIDDEN;
  const stopped = status === "stopped";
  return {
    visible: true,
    enabled: stopped && !busy,
    hint: status === "running" ? ICON_RETRY_RUNNING_HINT : null,
    appManagement: customIcon.systemIssue === "appManagement",
  };
}

/** Texto del badge de la ficha de la instancia (macOS: Dock; el resto no cambia). */
export function iconBadgeLabel(platform: SystemInfo["platform"], systemApplied: boolean): string {
  if (platform === "macos") return systemApplied ? "en el Dock" : "solo en la app";
  return systemApplied ? "sistema aplicado" : "solo en la app";
}

/** Primera frase de la línea de estado del editor en macOS; `systemMessage` se añade tal cual. */
export function iconStatusLead(systemApplied: boolean): string {
  return systemApplied ? "Aplicado al Dock. " : "Solo en Code AI Profiles. ";
}
