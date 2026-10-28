import type { SynchronizationItemResult, VersionSource } from "../../types";

export function synchronizeLabel(latestSource: VersionSource | null, latestVersion: string | null): string {
  return latestSource && latestVersion
    ? `Sincronizar instancias desde ${latestSource.name} v${latestVersion}`
    : "Sincronizar instancias";
}

export interface SynchronizationSummary {
  notice: string | null;
  error: string | null;
}

/** El aviso y el error que deja una sincronización; cualquiera de los dos puede faltar. */
export function summarizeSynchronization(results: SynchronizationItemResult[]): SynchronizationSummary {
  const updated = results.filter((item) => item.status === "updated");
  const skipped = results.filter((item) => item.status === "skipped");
  const failed = results.filter((item) => item.status === "failed");
  return {
    notice: updated.length || skipped.length
      ? `Sincronización finalizada: ${updated.length} actualizada(s), ${skipped.length} omitida(s), ${failed.length} con error.`
      : null,
    error: failed.length
      ? `No se completó en ${failed.length} instancia(s): ${failed.map((item) => item.message).join(" · ")}`
      : null,
  };
}
