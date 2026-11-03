import { localFileSource } from "../../lib/local-asset";
import type { ManagedInstance } from "../../types";

export function managedIconSource(instance: ManagedInstance, previewUrl?: string | null) {
  if (previewUrl) return previewUrl;
  const path = instance.customIcon?.path;
  if (!path || path.startsWith("mock://")) return null;
  return localFileSource(path);
}
