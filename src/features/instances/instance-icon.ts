import { localFileSource } from "../../lib/local-asset";
import type { ManagedInstance, SystemInfo } from "../../types";

export function managedIconSource(instance: ManagedInstance, previewUrl?: string | null) {
  if (previewUrl) return previewUrl;
  const path = instance.customIcon?.path;
  if (!path || path.startsWith("mock://")) return null;
  return localFileSource(path);
}

/** El distintivo de la aplicación original (HU-0028): su ruta cambia con su contenido, así que no lleva revisión. */
export function providerBadgeSource(system: SystemInfo): string | null {
  const path = system.providerBadge?.path;
  return path ? localFileSource(path) : null;
}
