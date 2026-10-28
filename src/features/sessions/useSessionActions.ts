import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import type { SessionProfile, SessionTransferMode } from "../../types";
import { useDashboard } from "../dashboard";
import { transferNotice, type UnlinkDialogCopy } from "./session-messages";
import type { SessionTransferSelection, SessionUnlinkSelection } from "./session-types";

/** Transferir y desvincular sesiones. Reciben `close` y lo llaman en el mismo punto que antes. */
export function useSessionActions() {
  const { setBusy, clearFeedback, replaceDashboard, setNotice, setError } = useDashboard();

  const transfer = async (
    selection: SessionTransferSelection,
    profiles: SessionProfile[],
    targetId: string,
    mode: SessionTransferMode,
    includeLocalArtifacts: boolean,
    close: () => void,
  ) => {
    const target = profiles.find((instance) => instance.id === targetId);
    if (!target) return;
    setBusy(`transfer:${selection.session.id}`);
    clearFeedback();
    try {
      const result = await bridge.copySession({
        sourceInstanceId: selection.source.id,
        targetInstanceId: targetId,
        sessionId: selection.session.id,
        mode,
        includeLocalArtifacts,
      });
      replaceDashboard(result.dashboard);
      setNotice(transferNotice(mode, selection.session.title, selection.source.name, target.name, result.artifacts));
      close();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(null);
    }
  };

  const unlink = async (selection: SessionUnlinkSelection, copy: UnlinkDialogCopy, close: () => void) => {
    setBusy(`unlink:${selection.session.id}`);
    clearFeedback();
    try {
      const nextState = await bridge.unlinkSession({
        instanceId: selection.instance.id,
        sessionId: selection.session.id,
      });
      replaceDashboard(nextState);
      setNotice(copy.notice);
      close();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(null);
    }
  };

  return { transfer, unlink };
}
