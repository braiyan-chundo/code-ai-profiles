import type { DashboardState, OriginalInstallProgress, OriginalInstallResult } from "../../types";

/** Lo que la interfaz necesita para ofrecer (o no) «Descargar e instalar» (HU-0017, A-10). */
export interface OriginalInstallAvailability {
  /** Solo en macOS, con una versión oficial fresca y disponible. */
  visible: boolean;
  /** El botón no responde: por el motivo de abajo o porque hay otra operación en curso. */
  disabled: boolean;
  /** El motivo que se ve en pantalla; `null` si no hay (otra operación en curso se explica sola). */
  disabledReason: string | null;
}

/**
 * Decide si «Descargar e instalar» se ofrece. Es la misma condición de «hay versión oficial fresca» que usa el aviso
 * y nada más: fuera de macOS la acción no existe, y la original en marcha o una operación en curso solo la bloquean.
 */
export function originalInstallAvailability(
  system: DashboardState["system"],
  busy: string | null,
): OriginalInstallAvailability {
  const { sourceUpdate } = system;
  const fresh = !sourceUpdate.stale && sourceUpdate.checkedAt !== null && sourceUpdate.source !== null;
  const visible =
    system.platform === "macos" &&
    Boolean(system.sourcePath) &&
    fresh &&
    sourceUpdate.status === "available" &&
    Boolean(sourceUpdate.latestVersion);
  if (!visible) return { visible: false, disabled: false, disabledReason: null };
  if (system.originalStatus === "running") {
    return { visible, disabled: true, disabledReason: `Cierra ${system.sourceName ?? "Aplicación compatible"} para actualizarla.` };
  }
  return { visible, disabled: busy !== null, disabledReason: null };
}

/** Megabytes decimales, como los muestra macOS al descargar. */
function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}

/** La línea de estado de cada fase (HU-0017, A-10). */
export function installPhaseLabel(progress: OriginalInstallProgress, appName: string): string {
  switch (progress.phase) {
    case "preparing":
      return `Preparando la descarga de ${appName}…`;
    case "downloading": {
      const target = progress.targetVersion ? `${appName} ${progress.targetVersion}` : appName;
      return progress.totalBytes > 0
        ? `Descargando ${target} · ${megabytes(progress.receivedBytes)} de ${megabytes(progress.totalBytes)}`
        : `Descargando ${target}…`;
    }
    case "verifying":
      return "Verificando paquete, firma y versión…";
    case "installing":
      return "Instalando y comprobando…";
    case "synchronizing":
      return "Sincronizando instancias detenidas…";
  }
}

/** El avance de la descarga en porcentaje, o `null` cuando la fase no tiene una medida (barra indeterminada). */
export function installProgressPercent(progress: OriginalInstallProgress): number | null {
  if (progress.phase !== "downloading" || progress.totalBytes <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((progress.receivedBytes / progress.totalBytes) * 100)));
}

export interface OriginalInstallSummary {
  notice: string | null;
  error: string | null;
}

/** El aviso y el error que deja una instalación; los fallos de sincronización no deshacen la instalación. */
export function summarizeOriginalInstall(result: OriginalInstallResult, appName: string): OriginalInstallSummary {
  if (result.status === "cancelled") {
    return { notice: "Descarga cancelada. La original no cambió.", error: null };
  }
  const updated = result.synchronization.filter((item) => item.status === "updated").length;
  const failed = result.synchronization.filter((item) => item.status === "failed");
  const pending = result.pendingInstanceIds.length;
  const version = result.previousVersion
    ? `de ${result.previousVersion} a ${result.installedVersion ?? "la versión nueva"}`
    : `a ${result.installedVersion ?? "la versión nueva"}`;
  const parts: string[] = [];
  if (updated > 0) parts.push(updated === 1 ? "1 instancia actualizada" : `${updated} instancias actualizadas`);
  if (pending > 0) {
    parts.push(pending === 1 ? "1 pendiente: se sincronizará al detenerla" : `${pending} pendientes: se sincronizarán al detenerlas`);
  }
  return {
    notice: `${appName} se actualizó ${version}.${parts.length ? ` ${parts.join(", ")}.` : ""}`,
    error: failed.length
      ? `No se completó en ${failed.length} instancia(s): ${failed.map((item) => item.message).join(" · ")}`
      : null,
  };
}

/** Reutiliza el resumen de `summarizeSynchronization` con el prefijo de la sincronización automática. */
export function pendingSyncNotice(notice: string): string {
  return notice.replace(/^Sincronización finalizada:/, "Sincronización pendiente:");
}

export interface PendingSyncPlan {
  /** Pendientes detenidas y todavía por detrás: se sincronizan ahora. */
  ready: string[];
  /** Pendientes que ya no existen o ya no están por detrás: se olvidan. */
  drop: string[];
}

/**
 * Qué hacer con las instancias pendientes tras cualquier cambio del panel (HU-0017, A-6). Una que sigue en marcha no
 * está en ninguna de las dos listas: se espera a que se detenga.
 */
export function pendingSyncPlan(pendingIds: string[], dashboard: DashboardState): PendingSyncPlan {
  const stale = new Set(dashboard.system.versionTopology.staleInstanceIds);
  const ready: string[] = [];
  const drop: string[] = [];
  for (const id of pendingIds) {
    const instance = dashboard.instances.find((item) => item.id === id);
    if (!instance || !stale.has(id)) drop.push(id);
    else if (instance.status === "stopped") ready.push(id);
  }
  return { ready, drop };
}
