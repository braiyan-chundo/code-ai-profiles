import { SparklesIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { useDashboard } from "./dashboard-context";

/**
 * El error y el aviso de la última operación, cada uno con su botón de cerrar. Si el error trae título (HU-0026: «No se
 * pudo abrir {nombre}»), el mensaje de Rust va debajo tal cual.
 */
export function FeedbackBanners() {
  const { error, errorTitle, notice, setError, setNotice } = useDashboard();
  return (
    <>
      {error && (
        <NoticeAlert
          variant="destructive"
          icon={<TriangleAlertIcon aria-hidden="true" />}
          title={errorTitle ?? error}
          action={
            <Button variant="ghost" size="icon-sm" onClick={() => setError(null)} aria-label="Cerrar error">
              <XIcon />
            </Button>
          }
        >
          {errorTitle ? error : undefined}
        </NoticeAlert>
      )}
      {notice && (
        <NoticeAlert
          role="status"
          icon={<SparklesIcon aria-hidden="true" />}
          title={notice}
          action={
            <Button variant="ghost" size="icon-sm" onClick={() => setNotice(null)} aria-label="Cerrar aviso">
              <XIcon />
            </Button>
          }
        />
      )}
    </>
  );
}
