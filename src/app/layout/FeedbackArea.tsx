import { FeedbackBanners } from "../../features/dashboard";
import { ScanProgressPanel, useScan } from "../../features/scan";
import { OriginalInstallPanel } from "../../features/updates";

/**
 * El progreso o resultado del escaneo, el error y el aviso de la última operación (HU-0016, A-10): en el layout, entre
 * la barra de la página y su contenido, para que se vean estés donde estés (una acción de una página, el escaneo del
 * sidebar), y el avance de «Descargar e instalar» la original (HU-0017). Es siempre un hijo de `SidebarInset`, aunque
 * esté vacío, para que sus filas no se muevan.
 */
export function FeedbackArea() {
  const { progress: scanProgress, dismiss: dismissScan } = useScan();
  return (
    <div
      aria-live="polite"
      className="row-start-2 grid min-w-0 gap-3 px-8 max-[1070px]:px-6 not-empty:pt-2 not-empty:pb-1"
    >
      {scanProgress && <ScanProgressPanel {...scanProgress} onDismiss={() => dismissScan(scanProgress.generation)} />}
      <OriginalInstallPanel />
      <FeedbackBanners />
    </div>
  );
}
