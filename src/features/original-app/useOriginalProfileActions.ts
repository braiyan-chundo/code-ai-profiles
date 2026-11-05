import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import { useDashboard } from "../dashboard";

/**
 * Elegir u olvidar la carpeta de datos de la original (HU-0029, A-4). Si la persona cancela el selector no cambia
 * nada; un rechazo deja la página como estaba y el motivo lo pinta `FeedbackArea`.
 */
export function useOriginalProfileActions() {
  const { setBusy, setError, replaceDashboard } = useDashboard();
  const run = async (action: () => Promise<Parameters<typeof replaceDashboard>[0] | null>) => {
    setBusy("original-profile");
    setError(null);
    try {
      const next = await action();
      if (next) replaceDashboard(next);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(null);
    }
  };
  return {
    choose: () => run(() => bridge.chooseOriginalProfileFolder()),
    forget: () => run(() => bridge.forgetOriginalProfileFolder()),
  };
}
