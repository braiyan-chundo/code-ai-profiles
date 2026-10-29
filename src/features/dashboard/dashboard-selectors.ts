import type { DashboardState, ManagedInstance, SystemInfo } from "../../types";

export function originalAppName(system: SystemInfo): string {
  return system.sourceName ?? "Aplicación compatible";
}

/** Instancias que coinciden con la búsqueda; sin término devuelve el mismo array. */
export function filterInstances(instances: ManagedInstance[], query: string): ManagedInstance[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return instances;
  return instances.filter((instance) =>
    [instance.name, instance.appPath, instance.status, ...instance.codeSessions.map((session) => session.title)]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(term)),
  );
}

/** Si la sección de la aplicación original se muestra con la búsqueda actual. */
export function matchesOriginalApp(system: SystemInfo, appName: string, query: string): boolean {
  if (!system.sourcePath) return false;
  const term = query.trim().toLocaleLowerCase();
  if (!term) return true;
  return [
    "Aplicación original",
    "Instalación principal",
    appName,
    system.sourcePath,
    system.originalProfilePath,
    ...system.originalCodeSessions.map((session) => session.title),
  ]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase().includes(term));
}

/**
 * La instancia de `#/instancias/<id>` (HU-0016, A-9). `undefined` si el id no existe, si se borró o si falta en la URL:
 * la página entonces vuelve al dashboard.
 */
export function findInstance(instances: ManagedInstance[], id: string | undefined): ManagedInstance | undefined {
  if (!id) return undefined;
  return instances.find((instance) => instance.id === id);
}

/** El mayor de los dos porcentajes de uso de una instancia, o `null` si no tiene ninguno. */
function peakUsage(instance: ManagedInstance): number | null {
  const values = [instance.usage?.sessionPercent, instance.usage?.weeklyPercent].filter(
    (value): value is number => typeof value === "number",
  );
  return values.length ? Math.max(...values) : null;
}

/**
 * Las instancias de más a menos uso (HU-0016, A-15): por el mayor de sus dos porcentajes, las que no tienen dato al
 * final y, si empatan, por nombre. Devuelve un array nuevo.
 */
export function usageRanking(instances: ManagedInstance[]): ManagedInstance[] {
  return [...instances].sort((a, b) => {
    const usageA = peakUsage(a);
    const usageB = peakUsage(b);
    if (usageA == null && usageB != null) return 1;
    if (usageA != null && usageB == null) return -1;
    if (usageA != null && usageB != null && usageA !== usageB) return usageB - usageA;
    return a.name.localeCompare(b.name, "es");
  });
}

export function countRunning(instances: ManagedInstance[]): number {
  return instances.filter((instance) => instance.status === "running").length;
}

export function countCodeSessions(dashboard: DashboardState): number {
  return dashboard.instances.reduce((total, instance) => total + instance.codeSessions.length, 0)
    + dashboard.system.originalCodeSessions.length;
}

export function outdatedInstances(instances: ManagedInstance[], staleInstanceIds: string[]): ManagedInstance[] {
  const staleIds = new Set(staleInstanceIds);
  return instances.filter((instance) => staleIds.has(instance.id));
}

export function runningInstanceIds(instances: ManagedInstance[]): string[] {
  return instances.filter((instance) => instance.status === "running").map((instance) => instance.id);
}
