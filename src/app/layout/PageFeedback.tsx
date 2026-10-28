import { FeedbackBanners } from "../../features/dashboard";
import { ScanProgressPanel, useScan } from "../../features/scan";

/**
 * TEMPORAL (HU-0016, paso 2): el progreso del escaneo, el error y el aviso dentro de las páginas nuevas, para que una
 * acción lanzada desde ellas o el escaneo del sidebar se vean. En el paso 5 lo sustituye `FeedbackArea` en el layout (A-10).
 */
export function PageFeedback() {
  const { progress: scanProgress, dismiss: dismissScan } = useScan();
  return (
    <>
      {scanProgress && <ScanProgressPanel {...scanProgress} onDismiss={() => dismissScan(scanProgress.generation)} />}
      <FeedbackBanners />
    </>
  );
}
