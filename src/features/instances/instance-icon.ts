import { convertFileSrc } from "@tauri-apps/api/core";
import { bridge } from "../../lib/bridge";
import type { ManagedInstance } from "../../types";

export function managedIconSource(instance: ManagedInstance, previewUrl?: string | null) {
  if (previewUrl) return previewUrl;
  const path = instance.customIcon?.path;
  if (!path || path.startsWith("mock://")) return null;
  return bridge.isDesktop() ? convertFileSrc(path) : path;
}
