import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import {
  mergeSourceUpdateForInstallation,
  sourceInstallationIdentity,
  summarizeSourceUpdateCheck,
} from "../../lib/source-update-controller";
import type { ManagedInstance, VersionSource } from "../../types";
import { originalAppName, useDashboard } from "../dashboard";
import { originalInstallAvailability, summarizeOriginalInstall } from "./original-install";
import { useSourceUpdate } from "./source-update-context";
import { summarizeSynchronization } from "./update-messages";

/**
 * Sincronizar instancias, entregar la original a su canal oficial (ambas reciben `close` como antes), descargar e
 * instalar la original en macOS (HU-0017) y comprobar la publicación oficial a petición; estas dos no abren ningún
 * diálogo ni salen de la ventana.
 */
export function useUpdateActions() {
  const {
    dashboard,
    busyRef,
    setBusy,
    clearFeedback,
    replaceDashboard,
    updateDashboard,
    setNotice,
    setError,
    setOriginalInstall,
    finishOriginalInstall,
    addPendingSync,
  } = useDashboard();
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

  const installOriginal = async () => {
    const { system } = dashboard;
    const expectedVersion = system.sourceUpdate.latestVersion;
    const availability = originalInstallAvailability(system, busyRef.current);
    if (!availability.visible || availability.disabled || !expectedVersion) return;
    const appName = originalAppName(system);
    // Un mensaje del canal puede llegar después de la respuesta: pasado `finally`, ya no pinta nada.
    let live = true;
    setBusy("install-original");
    clearFeedback();
    try {
      const result = await bridge.installOriginalUpdate({ expectedVersion }, (progress) => {
        if (live) setOriginalInstall(progress);
      });
      replaceDashboard(result.dashboard);
      addPendingSync(result.pendingInstanceIds);
      const summary = summarizeOriginalInstall(result, appName);
      if (summary.notice) setNotice(summary.notice);
      if (summary.error) setError(summary.error);
    } catch (reason) {
      setError(friendlyError(reason));
      // Si salió otra versión entre la detección y el clic, el aviso se corrige sin esperar al sondeo (A-5).
      const expected = sourceInstallationIdentity(system);
      try {
        const sourceUpdate = await bridge.checkSourceUpdate();
        updateDashboard((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
      } catch {
        // La comprobación es un extra: el error de la instalación ya está a la vista.
      }
    } finally {
      live = false;
      finishOriginalInstall();
      setBusy(null);
    }
  };

  /**
   * «Comprobar actualización»: consulta la publicación oficial desde Code AI Profiles, sin abrir la original. Si hay
   * versión nueva, el aviso pasa a ofrecer «Instalar»; si no, lo dice.
   */
  const checkOriginalUpdate = async () => {
    if (busyRef.current !== null) return;
    const { system } = dashboard;
    const expected = sourceInstallationIdentity(system);
    const appName = originalAppName(system);
    setBusy("check-original-update");
    clearFeedback();
    try {
      const sourceUpdate = await bridge.checkSourceUpdate();
      updateDashboard((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
      const summary = summarizeSourceUpdateCheck(sourceUpdate, appName);
      if (summary.notice) setNotice(summary.notice);
      if (summary.error) setError(summary.error);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(null);
    }
  };

  const cancelInstall = async () => {
    try {
      await bridge.cancelOriginalUpdate();
    } catch (reason) {
      setError(friendlyError(reason));
    }
  };

  return { synchronize, updateOriginal, installOriginal, checkOriginalUpdate, cancelInstall };
}
