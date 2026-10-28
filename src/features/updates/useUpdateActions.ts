import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import type { ManagedInstance, VersionSource } from "../../types";
import { useDashboard } from "../dashboard";
import { useSourceUpdate } from "./source-update-context";
import { summarizeSynchronization } from "./update-messages";

/** Sincronizar instancias y entregar la original a su canal oficial. Reciben `close` como antes. */
export function useUpdateActions() {
  const { setBusy, clearFeedback, replaceDashboard, setNotice, setError } = useDashboard();
  const { runHandoff } = useSourceUpdate();

  const synchronize = async (updateTargets: ManagedInstance[], latestSource: VersionSource, close: () => void) => {
    const targets = updateTargets.filter((instance) => instance.status === "stopped");
    setBusy("update-applications");
    clearFeedback();
    try {
      const result = await bridge.synchronizeApplications({
        source: latestSource,
        targetInstanceIds: targets.map((instance) => instance.id),
      });
      replaceDashboard(result.dashboard);
      const summary = summarizeSynchronization(result.results);
      if (summary.notice) setNotice(summary.notice);
      if (summary.error) setError(summary.error);
      close();
    } catch (reason) {
      setError(friendlyError(reason));
      close();
    } finally {
      setBusy(null);
    }
  };

  const updateOriginal = async (close: () => void) => {
    setBusy("update-original");
    clearFeedback();
    try {
      const result = await runHandoff(() => bridge.updateOriginalApplication());
      setNotice(result.message);
      close();
    } catch (reason) {
      setError(friendlyError(reason));
      close();
    } finally {
      setBusy(null);
    }
  };

  return { synchronize, updateOriginal };
}
