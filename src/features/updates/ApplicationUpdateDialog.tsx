import { CircleStopIcon, HardDriveIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../../components/ui/item";
import { Spinner } from "../../components/ui/spinner";
import type { ManagedInstance } from "../../types";
import { InstanceAvatar, InstanceStatusBadge, managedIconSource } from "../instances";

export function ApplicationUpdateDialog({
  instances,
  sourceName,
  targetVersion,
  canSynchronize,
  unavailableReason,
  busy,
  onClose,
  onConfirm,
}: {
  instances: ManagedInstance[];
  sourceName: string;
  targetVersion: string;
  canSynchronize: boolean;
  unavailableReason: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const runningInstances = instances.filter((instance) => instance.status === "running");
  const eligibleInstances = instances.filter((instance) => instance.status === "stopped");
  const ready = eligibleInstances.length > 0 && canSynchronize;
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent aria-busy={busy} closeDisabled={busy}>
        <DialogHeader>
          <DialogTitle className="pr-8 break-words">Sincronizar instancias desde {sourceName} v{targetVersion}</DialogTitle>
          <DialogDescription>La fuente local más reciente fue validada antes de mostrar esta acción</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center gap-4 rounded-sm ring-1 ring-inset ring-primary/15 bg-primary/5 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-text">
              <RefreshCwIcon className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
              <small className="font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.1em] text-muted-foreground uppercase">Fuente local validada</small>
              <strong className="text-(length:--fs-body)/(--lh-body) font-semibold">{sourceName} · versión {targetVersion}</strong>
              <p className="text-(length:--fs-small)/(--lh-prose) text-muted-foreground">Se reemplazará únicamente la aplicación de cada instancia; cada perfil permanece separado.</p>
            </div>
          </div>

          <ItemGroup aria-label="Instancias por actualizar" className="max-h-[220px] gap-2 overflow-y-auto">
            {instances.map((instance) => (
              <Item key={instance.id} role="listitem" variant="outline" size="sm" className="flex-nowrap rounded-sm bg-(--surface-soft)">
                <ItemMedia className="size-8 rounded-sm bg-muted">
                  <InstanceAvatar iconSrc={managedIconSource(instance)} status={instance.status} className="size-4" />
                </ItemMedia>
                <ItemContent className="min-w-0 gap-1">
                  <ItemTitle className="block max-w-full truncate text-xs font-semibold">{instance.name}</ItemTitle>
                  <ItemDescription className="font-mono text-(length:--fs-small)/(--lh-small)">
                    {instance.sourceVersion ?? "sin versión"} <span className="px-1 text-primary-text">→</span> {targetVersion}
                  </ItemDescription>
                </ItemContent>
                <InstanceStatusBadge status={instance.status} className="shrink-0" />
              </Item>
            ))}
          </ItemGroup>

          {(runningInstances.length > 0 || !canSynchronize || eligibleInstances.length === 0) && (
            <Alert className="ring-warning/30 text-warning">
              <CircleStopIcon />
              <AlertDescription className="text-(length:--fs-small)/(--lh-prose) text-warning">
                {!canSynchronize
                  ? unavailableReason ?? "La fuente local ya no es elegible. Vuelve a escanear el sistema."
                  : runningInstances.length
                  ? `${runningInstances.map((instance) => `“${instance.name}”`).join(" y ")} ${runningInstances.length === 1 ? "se omitirá" : "se omitirán"} porque ${runningInstances.length === 1 ? "está ejecutándose" : "están ejecutándose"}. Detén las instancias para incluirlas en otro intento.`
                  : "No hay objetivos detenidos disponibles para sincronizar."}
              </AlertDescription>
            </Alert>
          )}

          <Alert className="text-muted-foreground">
            <HardDriveIcon />
            <AlertDescription className="text-(length:--fs-small)/(--lh-prose)">
              Las cuentas, sesiones, preferencias y datos de los perfiles no se modifican. Si el reemplazo falla, se restaura automáticamente la aplicación anterior.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="items-center">
          {busy && (
            <span className="mr-auto font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground">Cada instancia devuelve un resultado independiente</span>
          )}
          <Button variant="outline" size="lg" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button size="lg" className="min-w-36" onClick={() => void onConfirm()} disabled={busy || !ready}>
            {busy
              ? <><Spinner aria-hidden="true" /> Sincronizando y verificando…</>
              : <><RefreshCwIcon /> Sincronizar {eligibleInstances.length === 1 ? "instancia" : `${eligibleInstances.length} instancias`}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
