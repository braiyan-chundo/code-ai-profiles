import { DownloadIcon, RefreshCwIcon, TerminalSquareIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { CodeSession, DashboardState, SessionProfile } from "../../types";
import { InstanceAvatar, InstanceStatusBadge } from "../instances";
import { SessionList } from "../sessions";
import type { OriginalInstallAvailability } from "../updates";

/**
 * El cuerpo de `#/original` (HU-0016, AC-04): la aplicación original con su ruta, versión, estado, perfil local y
 * sesiones de Code, y sus acciones: actualizar por el canal oficial y, por sesión, transferir y desvincular o devolver.
 * Sustituye a la `OriginalAppSection`. Sus botones de sesión **no** se deshabilitan con `busy`, como antes; solo
 * los de actualizar. En macOS no se abre la original para actualizarla: «Comprobar actualización» consulta la
 * publicación oficial desde la app y, con una versión disponible (HU-0017, A-10), «Descargar e instalar» es el botón
 * principal, con el motivo de bloqueo a la vista. En Windows y Linux, «Actualizar original» abre su canal oficial.
 */
export function OriginalDetail({
  appName,
  appPath,
  platform,
  profilePath,
  version,
  status,
  sessions,
  busy,
  install,
  onInstall,
  onUpdate,
  checking,
  onCheck,
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
  busy: boolean;
  install: OriginalInstallAvailability;
  onInstall: () => void;
  onUpdate: () => void;
  /** La comprobación oficial está en curso. */
  checking: boolean;
  onCheck: () => void;
  onTransfer: (session: CodeSession) => void;
  onUnlink: (session: CodeSession) => void;
}) {
  const channel = platform === "linux" ? "Linux" : platform === "windows" ? "Windows" : "macOS";
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-4">
      <Card size="sm" data-status={status} className="ring-primary/20 data-[status=missing]:opacity-60">
        <CardContent className="flex-row flex-wrap items-center gap-x-6 gap-y-4">
          <InstanceAvatar
            iconSrc={null}
            status={status}
            className="size-16 rounded-2xl border border-(--line-strong) bg-secondary [&>svg]:size-9"
            dotClassName="-right-1 -bottom-1 size-3.5"
          />
          <div className="grid min-w-0 flex-1 basis-60 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <InstanceStatusBadge status={status} />
              <Badge variant="outline" className="border-primary/30 font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.08em] text-primary-text uppercase">
                Principal
              </Badge>
              <Badge variant="secondary" className="font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.06em] uppercase">Instalación original</Badge>
            </div>
            <span className="truncate font-mono text-(length:--fs-small)/(--lh-small) font-medium text-muted-foreground" title={appPath}>
              {appPath}
            </span>
            <span className="font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground">Versión {version ?? "—"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Metric label="Perfil local" value={profilePath ? "Detectado" : "Sin detectar"} />
            <Metric label="Sesiones Code" value={`${sessions.length}`} />
            <div className="grid justify-items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-3">
                {platform === "macos" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onCheck}
                    disabled={busy}
                    aria-busy={checking}
                    title={`Consultar la publicación oficial de ${appName}`}
                    className="min-w-56 px-4"
                  >
                    {checking ? <><Spinner aria-hidden="true" /> Buscando…</> : <><RefreshCwIcon /> Comprobar actualización</>}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onUpdate}
                    disabled={busy}
                    aria-label={`Actualizar ${appName} mediante su canal oficial`}
                    title={`Abrir confirmación para el canal oficial de ${channel}`}
                    className="px-4"
                  >
                    <RefreshCwIcon /> Actualizar original
                  </Button>
                )}
                {install.visible && (
                  <Button type="button" size="lg" onClick={onInstall} disabled={install.disabled} className="px-4">
                    <DownloadIcon /> Descargar e instalar
                  </Button>
                )}
              </div>
              {install.visible && install.disabledReason && (
                <span className="text-right text-xs text-muted-foreground">{install.disabledReason}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" role="region" aria-label="Sesiones de Code de la aplicación original">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-(length:--fs-heading)/(--lh-heading) font-semibold">
            <TerminalSquareIcon className="size-4 text-muted-foreground" aria-hidden="true" /> Sesiones de la aplicación original
          </CardTitle>
          <CardAction>
            <Badge variant="secondary" className="font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.06em] uppercase">
              {sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SessionList
            sessions={sessions}
            emptyLabel="La aplicación original aún no tiene sesiones de Code indexadas"
            onTransfer={onTransfer}
            onUnlink={onUnlink}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-24 gap-2 rounded-lg border border-border bg-(--surface-soft) px-3 py-2">
      <small className="font-mono text-(length:--fs-micro)/(--lh-micro) font-medium tracking-[0.08em] text-muted-foreground uppercase">{label}</small>
      <strong className="font-mono text-(length:--fs-body)/(--lh-body) font-semibold text-foreground">{value}</strong>
    </div>
  );
}
