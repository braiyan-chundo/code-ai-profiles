import { AlertIcon, SparklesIcon, XIcon } from "../../components/Icons";
import { useDashboard } from "./dashboard-context";

/** El error y el aviso de la última operación, cada uno con su botón de cerrar. */
export function FeedbackBanners() {
  const { error, notice, setError, setNotice } = useDashboard();
  return (
    <>
      {error && (
        <div className="error-banner">
          <AlertIcon size={19} />
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Cerrar error"><XIcon size={16} /></button>
        </div>
      )}
      {notice && (
        <div className="notice-banner">
          <SparklesIcon size={19} />
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Cerrar aviso"><XIcon size={16} /></button>
        </div>
      )}
    </>
  );
}
