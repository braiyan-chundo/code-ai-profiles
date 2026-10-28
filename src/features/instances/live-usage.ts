import type { DashboardState, UsageStats } from "../../types";

/** Sustituye el uso de las instancias recibidas y deja intactas las demás. */
export function applyLiveUsage(current: DashboardState, usageById: Map<string, UsageStats>): DashboardState {
  return {
    ...current,
    instances: current.instances.map((instance) => {
      const usage = usageById.get(instance.id);
      return usage ? { ...instance, usage } : instance;
    }),
  };
}
