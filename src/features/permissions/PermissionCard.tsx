import {
  AppWindowIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  ExternalLinkIcon,
  FolderLockIcon,
  InfoIcon,
  TriangleAlertIcon,
  UserCogIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Spinner } from "../../components/ui/spinner";
import { bridge } from "../../lib/bridge";
import { cn } from "../../lib/utils";
import { OPEN_SETTINGS_SUCCESS, type PermissionCard as PermissionCardData, type PermissionId, type PermissionTone } from "./permission-cards";

const ICONS: Record<PermissionId, ReactNode> = {
  appManagement: <AppWindowIcon aria-hidden="true" className="size-5" />,
  filesAndFolders: <FolderLockIcon aria-hidden="true" className="size-5" />,
  adminAccount: <UserCogIcon aria-hidden="true" className="size-5" />,
};

/** El estado en una línea de 16: punto de 8 o icono de 16, con el color de su tono. */
function StatusLine({ card }: { card: PermissionCardData }) {
  const tone: PermissionTone = card.tone;
  const color = tone === "needs" || tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-muted-foreground";
  return (
    <p className={cn("flex min-w-0 items-center gap-2 text-(length:--fs-small)/(--lh-small)", color)} data-tone={tone}>
      {tone === "needs" && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" />}
      {tone === "idle" && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--quiet)" />}
      {tone === "unknown" && <CircleHelpIcon aria-hidden="true" className="size-4 shrink-0" />}
      {tone === "ok" && <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />}
      {tone === "warn" && <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" />}
      {tone === "pending" && <Spinner aria-hidden="true" aria-label="" className="shrink-0" />}
      <span className="min-w-0">
        {card.status}
        {card.who && <span className="text-muted-foreground"> · {card.who}</span>}
      </span>
    </p>
  );
}

/** El popover de información (AC-03): se abre con clic, Intro o Espacio y se cierra con Esc; lleva su `aria-label`. */
function InfoPopover({ card }: { card: PermissionCardData }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Más información sobre ${card.name}`} className="text-muted-foreground">
          <InfoIcon aria-hidden="true" className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-84 gap-3 text-(length:--fs-small)/(--lh-prose)" aria-label={card.name}>
        <h4 className="text-(length:--fs-body)/(--lh-body) font-semibold">{card.name}</h4>
        <dl className="grid gap-2">
          {card.info.rows.map((row) => (
            <div key={row.label}>
              <dt className="text-(length:--fs-micro)/(--lh-micro) font-bold tracking-[0.08em] text-muted-foreground uppercase">{row.label}</dt>
              <dd className="mt-1 text-foreground">{row.text}</dd>
            </div>
          ))}
        </dl>
        <p className="flex items-center gap-2 text-(length:--fs-small)/(--lh-small) font-medium text-success">
          <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />
          {card.info.optional}
        </p>
        <p className="pt-2 font-mono text-(length:--fs-micro)/(--lh-micro) text-muted-foreground shadow-[inset_0_1px_0_var(--border)]">{card.info.path}</p>
      </PopoverContent>
    </Popover>
  );
}

type OpenResult = { kind: "ok" } | { kind: "error"; message: string } | null;

/**
 * Un permiso (HU-0022, A-3): icono, nombre, información, «Opcional», para qué sirve, su estado y, si tiene panel, el
 * botón que lo abre. Solo abre el panel por su nombre (`openSystemSettings(panel)`): el frontend nunca manda ni muestra
 * una URL. Tras pulsar, una línea dice qué pasó (A-3.6); nunca un toast (R-1).
 */
export function PermissionCard({ card }: { card: PermissionCardData }) {
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<OpenResult>(null);
  const panel = card.panel;

  const open = async () => {
    if (!panel || opening) return;
    setOpening(true);
    setResult(null);
    try {
      await bridge.openSystemSettings(panel);
      setResult({ kind: "ok" });
    } catch {
      setResult({ kind: "error", message: card.openFailure ?? "No se pudo abrir Ajustes del Sistema." });
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Card
        size="sm"
        data-permission={card.id}
        data-tone={card.tone}
        className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0 px-4", card.tone === "needs" && "ring-warning/40")}
      >
        <span className="grid size-(--ctl-lg) place-items-center rounded-md bg-(--surface-soft) text-foreground ring-1 ring-(--line-strong) ring-inset">
          {ICONS[card.id]}
        </span>
        <div className="grid min-w-0 gap-1">
          <div className="flex min-h-(--ctl-xs) flex-wrap items-center gap-x-2">
            <h3 className="text-(length:--fs-heading)/(--lh-title) font-semibold">{card.name}</h3>
            <InfoPopover card={card} />
            <span className="text-(length:--fs-small)/(--lh-title) text-muted-foreground">Opcional</span>
          </div>
          <p className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">{card.purpose}</p>
          <StatusLine card={card} />
        </div>
        <div className="self-center">
          {panel && (
            <Button variant="outline" size="sm" disabled={opening} aria-busy={opening} onClick={() => void open()}>
              <ExternalLinkIcon aria-hidden="true" /> Abrir Ajustes del Sistema
            </Button>
          )}
        </div>
      </Card>
      {result?.kind === "ok" && (
        <p role="status" className="flex items-center gap-2 px-4 text-(length:--fs-small)/(--lh-small) text-success">
          <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />
          {OPEN_SETTINGS_SUCCESS}
        </p>
      )}
      {result?.kind === "error" && (
        <p role="alert" className="flex items-start gap-2 px-4 text-(length:--fs-small)/(--lh-small) text-destructive">
          <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
          {result.message}
        </p>
      )}
    </div>
  );
}
