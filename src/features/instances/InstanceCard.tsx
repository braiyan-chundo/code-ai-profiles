import { useEffect, useState } from "react";
import type { CodeSession, DashboardState, ManagedInstance } from "../../types";
import {
  ChevronIcon,
  ClockIcon,
  CloudIcon,
  CodeSessionIcon,
  EditIcon,
  FolderIcon,
  PlayIcon,
  StopIcon,
  TransferIcon,
  TrashIcon,
  UnlinkIcon,
} from "../../components/Icons";
import { formatCaptureTime } from "../../lib/format";
import { SessionContextMeter, formatModelName, formatSessionTime } from "../sessions";
import { managedIconSource } from "./instance-icon";
import { UsageMeter } from "./UsageMeter";

export interface InstanceCardProps {
  instance: ManagedInstance;
  platform: DashboardState["system"]["platform"];
  busy: string | null;
  updateAvailable: boolean;
  iconPreviewUrl: string | null;
  autoExpand: boolean;
  onLaunch: () => void;
  onStop: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: (session: CodeSession) => void;
  onUnlink: (session: CodeSession) => void;
}

export function InstanceCard({ instance, platform, busy, updateAvailable, iconPreviewUrl, autoExpand, onLaunch, onStop, onOpen, onEdit, onDelete, onTransfer, onUnlink }: InstanceCardProps) {
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const isRunning = instance.status === "running";
  const sessionUsage = instance.usage?.sessionPercent ?? null;
  const weeklyUsage = instance.usage?.weeklyPercent ?? null;
  const isBusy = busy?.endsWith(instance.id) ?? false;
  const isStopping = busy === `stop:${instance.id}`;
  const stateLabel = isStopping
    ? "Deteniendo…"
    : instance.status === "running"
    ? "Ejecutándose"
    : instance.status === "missing" ? "No disponible" : "Detenido";
  useEffect(() => {
    if (autoExpand) setSessionsExpanded(true);
  }, [autoExpand]);

  return (
    <article className={`instance-card ${isRunning ? "is-running" : ""} ${isStopping ? "is-stopping" : ""} ${instance.status === "missing" ? "is-missing" : ""}`} aria-busy={isStopping}>
      <div className="instance-card-main">
        <div className={`instance-symbol ${instance.customIcon || iconPreviewUrl ? "has-custom-icon" : ""}`} aria-hidden="true" title={instance.customIcon?.systemMessage}>
          <CloudIcon size={34} />
          {managedIconSource(instance, iconPreviewUrl) && <img src={managedIconSource(instance, iconPreviewUrl)!} alt="" />}
          <span className={`symbol-status ${isRunning ? "online" : ""}`} />
        </div>

        <div className="instance-identity">
          <div className="name-line">
            <h2>{instance.name}</h2>
            <span className={`instance-state state-${isStopping ? "stopping" : instance.status}`}><span />{stateLabel}</span>
          </div>
          <span className="path" title={instance.appPath}>{instance.appPath}</span>
          <span className="version">
            Versión {instance.sourceVersion ?? "—"}
            {updateAvailable && <small className="version-update-badge">Actualización disponible</small>}
            {instance.customIcon && (
              <small className="custom-icon-badge" title={instance.customIcon.systemMessage}>
                Icono personalizado · {platform === "macos"
                  ? instance.customIcon.systemApplied ? "Dock aplicado" : "Dock no aplicado"
                  : instance.customIcon.systemApplied ? "sistema aplicado" : "solo en la app"}
              </small>
            )}
          </span>
        </div>
        <div className="usage-overview">
          <UsageMeter label="Uso de sesión" value={sessionUsage} />
          <UsageMeter label="Límite semanal" value={weeklyUsage} />
          <span className="usage-captured-at">{formatCaptureTime(instance.usage?.capturedAt)}</span>
        </div>

        <div className="card-actions">
          <button className="icon-button" disabled={isBusy} onClick={onOpen} title="Abrir carpeta del perfil"><FolderIcon size={20} /></button>
          <button className="icon-button" disabled={isBusy} onClick={onEdit} title="Editar nombre e icono"><EditIcon size={19} /></button>
          {isRunning ? (
            <button className="launch-button stop" disabled={isBusy} onClick={onStop}>
              <StopIcon size={20} /> {isStopping ? "Deteniendo…" : "Detener"}
            </button>
          ) : (
            <button className="launch-button" disabled={isBusy || instance.status === "missing"} onClick={onLaunch}>
              <PlayIcon size={20} /> {isBusy ? "Abriendo…" : "Abrir"}
            </button>
          )}
          {!isRunning && (
            <button className="icon-button danger-button" disabled={isBusy} onClick={onDelete} title="Eliminar instancia"><TrashIcon size={19} /></button>
          )}
        </div>
      </div>

      <section className={`code-sessions ${sessionsExpanded ? "is-expanded" : "is-collapsed"}`} aria-label={`Sesiones de Code de ${instance.name}`}>
        <div className="code-sessions-heading">
          <div><CodeSessionIcon size={17} /><strong>Sesiones de Code</strong></div>
          <button
            className="sessions-toggle"
            onClick={() => setSessionsExpanded((current) => !current)}
            aria-expanded={sessionsExpanded}
            aria-controls={`code-session-list-${instance.id}`}
          >
            <span>{instance.codeSessions.length} {instance.codeSessions.length === 1 ? "sesión" : "sesiones"}</span>
            <ChevronIcon className={sessionsExpanded ? "open" : ""} size={16} />
          </button>
        </div>
        {sessionsExpanded && (
          <div className="code-sessions-body" id={`code-session-list-${instance.id}`}>
            {instance.codeSessions.length ? (
              <div className="code-session-list">
                {instance.codeSessions.map((session) => (
              <div className="code-session-row" key={session.id} title={session.title}>
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
                    disabled={isBusy}
                    onClick={() => onTransfer(session)}
                    title="Transferir sesión a otro perfil"
                    aria-label={`Transferir “${session.title}” a otro perfil`}
                  >
                    <TransferIcon size={15} />
                  </button>
                  {session.transfer && (
                    <button
                      className="session-unlink-button"
                      disabled={isBusy}
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
              <div className="sessions-empty"><ClockIcon size={15} /> Aún no hay sesiones de Code en este perfil</div>
            )}
          </div>
        )}
      </section>
    </article>
  );
}
