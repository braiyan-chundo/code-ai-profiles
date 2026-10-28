import { useEffect, useRef } from "react";
import { SearchIcon, XIcon } from "../../../components/Icons";
import { Metric } from "../../../components/Metric";
import { countCodeSessions, countRunning, useDashboard } from "../../../features/dashboard";
import { shortcutModifierLabel } from "../../../lib/platform";

/** El resumen del sistema y el buscador del panel. Ctrl/⌘ F enfoca el buscador. */
export function Toolbar({ query, setQuery }: { query: string; setQuery: (query: string) => void }) {
  const { dashboard: state } = useDashboard();
  const searchRef = useRef<HTMLInputElement>(null);
  const running = countRunning(state.instances);
  const codeSessionCount = countCodeSessions(state);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <section className="toolbar">
      <div className="system-pill">
        <div className="active-summary">
          <span className={`status-dot ${running > 0 ? "live" : ""}`} />
          <strong>{running} EN EJECUCIÓN</strong>
        </div>
        <span className="pill-divider" />
        <Metric label="Perfiles" value={`${state.instances.length}`} />
        <span className="pill-divider short" />
        <Metric label="Sesiones Code" value={`${codeSessionCount}`} />
        <span className="pill-divider short" />
        <Metric label="Aplicación" value={state.system.sourceVersion ?? "No detectada"} accent={!state.system.sourcePath} />
      </div>

      <label className="search-pill">
        <SearchIcon size={18} />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar perfiles o sesiones…"
          aria-label="Buscar instancias"
        />
        {query ? (
          <button className="clear-search" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><XIcon size={15} /></button>
        ) : (
          <kbd>{shortcutModifierLabel(navigator.platform)} F</kbd>
        )}
      </label>
    </section>
  );
}
