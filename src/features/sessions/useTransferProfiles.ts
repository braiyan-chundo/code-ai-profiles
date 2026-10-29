import { useMemo } from "react";
import { ORIGINAL_INSTANCE_ID, type SessionProfile } from "../../types";
import { originalAppName as selectOriginalAppName, useDashboard } from "../dashboard";

/** La aplicación original seguida de las instancias: los perfiles entre los que se transfieren sesiones. */
export function useTransferProfiles(): SessionProfile[] {
  const { dashboard: state } = useDashboard();
  const originalAppName = selectOriginalAppName(state.system);
  return useMemo<SessionProfile[]>(() => [
    {
      id: ORIGINAL_INSTANCE_ID,
      name: originalAppName,
      status: state.system.originalStatus,
      codeSessions: state.system.originalCodeSessions,
      isOriginal: true,
    },
    ...state.instances,
  ], [originalAppName, state.instances, state.system.originalCodeSessions, state.system.originalStatus]);
}
