import { FolderOpenIcon, PencilIcon, PlayIcon, SquareIcon, TerminalSquareIcon, Trash2Icon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { formatCaptureTime } from "../../lib/format";
import type { CodeSession, DashboardState, ManagedInstance } from "../../types";
import { SessionList } from "../sessions";
import { iconBadgeLabel } from "./icon-status";
import { managedIconSource } from "./instance-icon";
import { InstanceAvatar } from "./InstanceAvatar";
import { InstanceStatusBadge } from "./InstanceStatusBadge";
import { UsageMeter } from "./UsageMeter";

export interface InstanceDetailProps {
  instance: ManagedInstance;
  platform: DashboardState["system"]["platform"];
  busy: string | null;
  updateAvailable: boolean;
  /** Quedó por detrás tras instalar la original y se sincronizará al detenerla (HU-0017). */
  syncPending: boolean;
  iconPreviewUrl: string | null;
  onLaunch: () => void;
  onStop: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: (session: CodeSession) => void;
  onUnlink: (session: CodeSession) => void;
}

/**
 * El cuerpo de `#/instancias/<id>` (HU-0016, AC-03): estado, versión, acciones, uso de sesión y semanal, y las sesiones
 * de Code con su contexto. Sustituye a la `InstanceCard`: la misma lógica y las mismas guardas de `busy`, con las
 * piezas del catálogo.
 */
export function InstanceDetail({
  instance,
  platform,
  busy,
  updateAvailable,
  syncPending,
  iconPreviewUrl,
  onLaunch,
  onStop,
  onOpen,
  onEdit,
  onDelete,
  onTransfer,
  onUnlink,
}: InstanceDetailProps) {
  const isRunning = instance.status === "running";
  const isBusy = busy?.endsWith(instance.id) ?? false;
  const isStopping = busy === `stop:${instance.id}`;
  const iconSrc = managedIconSource(instance, iconPreviewUrl);
  const sessionCount = instance.codeSessions.length;

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-4" aria-busy={isStopping}>
      <Card
        size="sm"
        data-status={isStopping ? "stopping" : instance.status}
        className="data-[status=missing]:opacity-60 data-[status=running]:ring-primary/30"
      >
        <CardContent className="flex-row flex-wrap items-center gap-x-6 gap-y-4">
          <InstanceAvatar
            iconSrc={iconSrc}
            status={instance.status}
            stopping={isStopping}
            className="size-16 rounded-2xl border border-(--line-strong) bg-secondary [&>svg]:size-9"
            dotClassName="-right-1 -bottom-1 size-3.5"
          />
          <div className="grid min-w-0 flex-1 basis-60 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <InstanceStatusBadge status={instance.status} stopping={isStopping} />
              {updateAvailable && (
                <Badge variant="outline" className="border-primary/30 font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.04em] text-primary-text uppercase">
                  Actualización disponible
                </Badge>
              )}
              {syncPending && (
                <Badge variant="outline" className="border-warning/30 font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.04em] text-warning uppercase">
                  Sincronización pendiente
                </Badge>
              )}
              {instance.customIcon && (
                <Badge
                  variant="outline"
                  className="border-success/30 text-(length:--fs-micro)/(--lh-micro) text-success"
                  title={instance.customIcon.systemMessage}
                >
                  Icono personalizado · {iconBadgeLabel(platform, instance.customIcon.systemApplied)}
                </Badge>
              )}
            </div>
            <span className="truncate font-mono text-(length:--fs-small)/(--lh-small) font-medium text-muted-foreground" title={instance.appPath}>
              {instance.appPath}
            </span>
            <span className="font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground">Versión {instance.sourceVersion ?? "—"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon-lg" disabled={isBusy} onClick={onOpen} title="Abrir carpeta del perfil" aria-label="Abrir carpeta del perfil">
              <FolderOpenIcon />
            </Button>
            <Button variant="outline" size="icon-lg" disabled={isBusy} onClick={onEdit} title="Editar nombre e icono" aria-label="Editar nombre e icono">
              <PencilIcon />
            </Button>
            {!isRunning && (
              <Button variant="destructive" size="icon-lg" disabled={isBusy} onClick={onDelete} title="Eliminar instancia" aria-label="Eliminar instancia">
                <Trash2Icon />
              </Button>
            )}
            {isRunning ? (
              <Button
                variant="outline"
                size="lg"
                disabled={isBusy}
                onClick={onStop}
                className="min-w-28 border-primary/30 bg-primary/10 px-4 text-primary-text hover:bg-primary/15 hover:text-primary-text"
              >
                <SquareIcon /> {isStopping ? "Deteniendo…" : "Detener"}
              </Button>
            ) : (
              <Button size="lg" disabled={isBusy || instance.status === "missing"} onClick={onLaunch} className="min-w-28 px-4">
                <PlayIcon /> {isBusy ? "Abriendo…" : "Abrir"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
          <UsageMeter label="Uso de sesión" value={instance.usage?.sessionPercent ?? null} />
          <UsageMeter label="Límite semanal" value={instance.usage?.weeklyPercent ?? null} />
        </div>
        <span className="text-right font-mono text-(length:--fs-small)/(--lh-small) font-medium text-muted-foreground">
          {formatCaptureTime(instance.usage?.capturedAt)}
        </span>
      </div>

      <Card size="sm" role="region" aria-label={`Sesiones de Code de ${instance.name}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-(length:--fs-heading)/(--lh-heading) font-semibold">
            <TerminalSquareIcon className="size-4 text-muted-foreground" aria-hidden="true" /> Sesiones de Code
          </CardTitle>
          <CardAction>
            <Badge variant="secondary" className="font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.06em] uppercase">
              {sessionCount} {sessionCount === 1 ? "sesión" : "sesiones"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SessionList
            sessions={instance.codeSessions}
            emptyLabel="Aún no hay sesiones de Code en este perfil"
            disabled={isBusy}
            onTransfer={onTransfer}
            onUnlink={onUnlink}
          />
        </CardContent>
      </Card>
    </div>
  );
}
