import { FeedbackBanners } from "../../features/dashboard";
import { ScanProgressPanel, useScan } from "../../features/scan";

/**
 * El progreso o resultado del escaneo, el error y el aviso de la última operación (HU-0016, A-10): en el layout, entre
 * la barra de la página y su contenido, para que se vean estés donde estés (una acción de una página, el escaneo del
 * sidebar). Es siempre un hijo de `SidebarInset`, aunque esté vacío, para que sus filas no se muevan.
 */
export function FeedbackArea() {
  const { progress: scanProgress, dismiss: dismissScan } = useScan();
  return (
    <div
      aria-live="polite"
      className="row-start-2 grid min-w-0 gap-2.5 px-[38px] max-[1070px]:px-[25px] not-empty:pt-1 not-empty:pb-3"
    >
      {scanProgress && <ScanProgressPanel {...scanProgress} onDismiss={() => dismissScan(scanProgress.generation)} />}
      <FeedbackBanners />
    </div>
  );
}
