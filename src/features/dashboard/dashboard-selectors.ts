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
