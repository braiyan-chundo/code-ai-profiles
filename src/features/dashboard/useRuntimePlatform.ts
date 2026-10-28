import { resolveRuntimePlatform, type RuntimePlatform } from "../../lib/platform";
import { useDashboard } from "./dashboard-context";

/** La plataforma en uso: la que informa Rust o, si no la conoce, la que deduce el navegador. */
export function useRuntimePlatform(): RuntimePlatform {
  const { dashboard } = useDashboard();
  return resolveRuntimePlatform(dashboard.system.platform, navigator.platform);
}
