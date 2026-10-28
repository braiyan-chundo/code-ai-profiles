import { HardDriveIcon } from "../../components/Icons";
import { originalAppName as selectOriginalAppName, useDashboard, useRuntimePlatform } from "../../features/dashboard";
import { formatBytes } from "../../lib/format";

export function Statusbar() {
  const { dashboard: state, loading } = useDashboard();
  const runtimePlatform = useRuntimePlatform();
  const originalAppName = selectOriginalAppName(state.system);
  const buildLabel = state.system.appVersion || (loading ? "cargando…" : "no disponible");
  return (
    <footer className="statusbar">
      <div className="footer-group">
        <span className={`footer-health ${state.system.sourcePath ? "healthy" : "warning"}`}>
          <span className="mini-dot" />
          {state.system.sourcePath ? `${originalAppName.toLocaleUpperCase()} DETECTADA` : "APLICACIÓN COMPATIBLE NO DETECTADA"}
        </span>
        <span className="footer-divider" />
        <span><HardDriveIcon size={14} /> {formatBytes(state.system.freeBytes)} libres</span>
        <span className="footer-divider" />
        <span>{formatBytes(state.system.managedBytes)} administrados</span>
      </div>
      <div className="footer-build">
        <span>AUTO · 60S</span><span className="mini-dot" /><span aria-label={`Versión de Code AI Profiles ${buildLabel}`}>BUILD {buildLabel}</span><span className="mini-dot" /><span>{runtimePlatform.toUpperCase()}</span>
      </div>
    </footer>
  );
}
