import type { DashboardState } from "../../types";
import { HardDriveIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Spinner } from "../../components/ui/spinner";
import { originalUpdateChannel } from "./original-update-channel";

export function OriginalApplicationUpdateDialog({
  appName,
  platform,
  version,
  busy,
  onClose,
  onConfirm,
}: {
  appName: string;
  platform: DashboardState["system"]["platform"];
  version: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const platformDetails = originalUpdateChannel(platform, appName);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent aria-busy={busy} closeDisabled={busy}>
        <DialogHeader>
          <DialogTitle className="pr-8 break-words">Actualizar {appName}</DialogTitle>
          <DialogDescription>Versión actual {version ?? "no disponible"} · {platformDetails.label}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex items-start gap-4 rounded-sm ring-1 ring-inset ring-primary/15 bg-primary/5 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-text">
              <RefreshCwIcon className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
              <small className="font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.1em] text-muted-foreground uppercase">Canal oficial</small>
              <strong className="text-(length:--fs-body)/(--lh-body) font-semibold">{platformDetails.channel}</strong>
              <p className="text-(length:--fs-small)/(--lh-prose) text-muted-foreground">{platformDetails.handoff}</p>
            </div>
          </div>

          <Alert className="ring-success/25 bg-success/5 text-success">
            <HardDriveIcon />
            <AlertTitle className="text-xs">Tus perfiles y sesiones no se tocan</AlertTitle>
            <AlertDescription className="text-(length:--fs-small)/(--lh-prose)">
              Esta acción no escribe ni sustituye instancias administradas. Solo entrega la original al actualizador, descarga o documentación oficial de la plataforma.
            </AlertDescription>
          </Alert>

          <Alert className="text-primary-text">
            <SparklesIcon />
            <AlertDescription className="text-(length:--fs-small)/(--lh-prose)">
              Cuando vuelvas a esta ventana, se refrescarán únicamente las versiones y su topología. No se iniciará un escaneo manual ni se consultarán sesiones.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button size="lg" className="min-w-36" onClick={() => void onConfirm()} disabled={busy}>
            {busy
              ? <><Spinner aria-hidden="true" /> Abriendo canal oficial…</>
              : <><RefreshCwIcon /> {platformDetails.action}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
