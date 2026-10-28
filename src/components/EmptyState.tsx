import { CloudIcon, PlusIcon, RefreshIcon, SearchIcon } from "./Icons";

export function EmptyState({
  searching,
  sourceFound,
  onCreate,
  onClear,
  onScan,
}: {
  searching: boolean;
  sourceFound: boolean;
  onCreate: () => void;
  onClear: () => void;
  onScan: () => void;
}) {
  if (searching) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><SearchIcon size={29} /></div>
        <h2>Sin coincidencias</h2>
        <p>No hay perfiles que coincidan con la búsqueda actual.</p>
        <button className="secondary-button" onClick={onClear}>Limpiar búsqueda</button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-icon"><CloudIcon size={34} /></div>
      <h2>{sourceFound ? "Crea tu primer perfil aislado" : "No se detectó una aplicación compatible"}</h2>
      <p>
        {sourceFound
          ? "Code AI Profiles creará una copia administrada y un directorio de datos independiente. Cada perfil podrá iniciar sesión con una cuenta distinta."
          : "Instala una aplicación compatible y vuelve a escanear el sistema."}
      </p>
      <button className={sourceFound ? "primary-action" : "secondary-button"} onClick={sourceFound ? onCreate : onScan}>
        {sourceFound ? <><PlusIcon size={17} /> Nueva instancia</> : <><RefreshIcon size={17} /> Escanear de nuevo</>}
      </button>
    </div>
  );
}
