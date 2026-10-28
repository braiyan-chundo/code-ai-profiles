import { useEffect, useState } from "react";
import type { CodeSession, DashboardState, SessionProfile } from "../../types";
import {
  ChevronIcon,
  ClockIcon,
  CloudIcon,
  CodeSessionIcon,
  RefreshIcon,
  SparklesIcon,
  TransferIcon,
  UnlinkIcon,
} from "../../components/Icons";
import { SessionContextMeter, formatModelName, formatSessionTime } from "../sessions";

export function OriginalAppSection({
  appName,
  appPath,
  platform,
  profilePath,
  version,
  status,
  sessions,
  autoExpand,
  busy,
  onUpdate,
  onTransfer,
  onUnlink,
}: {
  appName: string;
  appPath: string;
  platform: DashboardState["system"]["platform"];
  profilePath: string | null;
  version: string | null;
  status: SessionProfile["status"];
  sessions: CodeSession[];
  autoExpand: boolean;
  busy: boolean;
  onUpdate: () => void;
  onTransfer: (session: CodeSession) => void;
  onUnlink: (session: CodeSession) => void;
}) {
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const stateLabel = status === "running"
    ? "Ejecutándose"
    : status === "missing" ? "No disponible" : "Detenido";
  useEffect(() => {
    if (autoExpand) setSessionsExpanded(true);
  }, [autoExpand]);
  return (
    <section className="original-app-section" aria-labelledby="original-app-title">
      <div className="dashboard-section-heading original-heading">
        <div><SparklesIcon size={17} /><strong id="original-app-title">Aplicación original</strong><span className="original-badge">PRINCIPAL</span></div>
        <span className={`original-state state-${status}`}><i />{stateLabel}</span>
      </div>
      <article className="original-app-card">
        <div className="original-app-main">
          <div className="original-symbol"><CloudIcon size={31} /><span className={status === "running" ? "online" : ""} /></div>
          <div className="original-identity">
            <div><h2>{appName}</h2><span>Instalación original</span></div>
            <span className="path" title={appPath}>{appPath}</span>
            <span className="version">Versión {version ?? "—"}</span>
          </div>
          <div className="original-summary-metrics">
            <div><small>PERFIL LOCAL</small><strong>{profilePath ? "Detectado" : "Sin detectar"}</strong></div>
            <div><small>SESIONES CODE</small><strong>{sessions.length}</strong></div>
            <button
              type="button"
              className="original-update-button"
              onClick={onUpdate}
              disabled={busy}
              aria-label={`Actualizar ${appName} mediante su canal oficial`}
              title={`Abrir confirmación para el canal oficial de ${platform === "linux" ? "Linux" : platform === "windows" ? "Windows" : "macOS"}`}
            >
              <RefreshIcon size={14} /> Actualizar original
            </button>
          </div>
        </div>

        <section className={`original-code-sessions ${sessionsExpanded ? "is-expanded" : "is-collapsed"}`} aria-label="Sesiones de Code de la aplicación original">
          <div className="code-sessions-heading">
            <div><CodeSessionIcon size={17} /><strong>Sesiones de la aplicación original</strong></div>
            <button
              className="sessions-toggle"
              onClick={() => setSessionsExpanded((current) => !current)}
              aria-expanded={sessionsExpanded}
              aria-controls="original-code-session-list"
            >
              <span>{sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}</span>
              <ChevronIcon className={sessionsExpanded ? "open" : ""} size={16} />
            </button>
          </div>
          {sessionsExpanded && (
            <div className="code-sessions-body" id="original-code-session-list">
              {sessions.length ? (
                <div className="code-session-list original-session-list">
                  {sessions.map((session) => (
                    <div className="code-session-row original-session-row" key={session.id} title={session.title}>
                      <span className="session-index"><CodeSessionIcon size={14} /></span>
                      <div className="session-copy">
                        <strong>{session.title}</strong>
                        <span>
                          {formatModelName(session.model)}
                          <i />
                          {session.completedTurns} {session.completedTurns === 1 ? "turno" : "turnos"}
                          <i />
                          {formatSessionTime(session.lastActivityAt)}
                        </span>
                        <SessionContextMeter session={session} />
                      </div>
                      <div className="session-actions">
                        {session.isArchived && <span className="archived-badge">Archivada</span>}
                        {session.transfer && (
                          <span className={`linked-badge mode-${session.transfer.mode}`}>
                            {session.transfer.mode === "move" ? "Movida" : "Copia"}
                          </span>
                        )}
                        <button
                          className="session-transfer-button"
                          onClick={() => onTransfer(session)}
                          title="Transferir sesión a otro perfil"
                          aria-label={`Transferir “${session.title}” a otro perfil`}
                        >
                          <TransferIcon size={15} />
                        </button>
                        {session.transfer && (
                          <button
                            className="session-unlink-button"
                            onClick={() => onUnlink(session)}
                            title={session.transfer.mode === "move" ? "Devolver a la instancia de origen" : "Desvincular esta copia"}
                            aria-label={session.transfer.mode === "move" ? `Devolver “${session.title}” a su origen` : `Desvincular copia de “${session.title}”`}
                          >
                            <UnlinkIcon size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sessions-empty"><ClockIcon size={15} /> La aplicación original aún no tiene sesiones de Code indexadas</div>
              )}
            </div>
          )}
        </section>
      </article>
    </section>
  );
}
