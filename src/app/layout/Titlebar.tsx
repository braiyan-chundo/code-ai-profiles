import { CloudIcon, PlusIcon, RefreshIcon, SettingsIcon, SparklesIcon } from "../../components/Icons";
import { useDashboard } from "../../features/dashboard";
import { useScan } from "../../features/scan";
import { useDialogs } from "../providers/dialogs-context";
import { windowAction } from "./window-actions";

export function Titlebar() {
  const { dashboard: state, loading, busy } = useDashboard();
  const { requestManual: scanManually } = useScan();
  const { setAppearanceOpen, setEditor } = useDialogs();
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand-cluster" data-tauri-drag-region>
        <div className="window-controls" aria-label="Controles de ventana">
          <button className="window-dot close" aria-label="Cerrar" onClick={() => void windowAction("close")} />
          <button className="window-dot minimize" aria-label="Minimizar" onClick={() => void windowAction("minimize")} />
          <button className="window-dot maximize" aria-label="Maximizar" onClick={() => void windowAction("maximize")} />
        </div>
        <div className="brand-divider" />
        <div className="brand" data-tauri-drag-region>
          <span className="brand-mark"><CloudIcon size={29} /></span>
          <span>Code AI Profiles</span>
          <span className="beta-label">BETA</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="action-island">
          <span className="sparkle"><SparklesIcon size={19} /></span>
          <span className="action-divider" />
          <button className="text-action" onClick={scanManually} disabled={loading || busy !== null}>
            <RefreshIcon className={busy === "scan" ? "spin" : ""} size={18} />
            <span>Escanear sistema</span>
          </button>
        </div>
        <button
          className="appearance-button"
          onClick={() => setAppearanceOpen(true)}
          title="Configurar apariencia"
          aria-label="Configurar apariencia"
        >
          <SettingsIcon size={19} />
        </button>
        <button
          className="primary-action"
          onClick={() => setEditor("new")}
          disabled={!state.system.sourcePath || busy !== null}
          title={!state.system.sourcePath ? "Instala una aplicación compatible o configura una ruta válida" : undefined}
        >
          <span className="plus-disc"><PlusIcon size={15} /></span>
          Nueva instancia
        </button>
      </div>
    </header>
  );
}
