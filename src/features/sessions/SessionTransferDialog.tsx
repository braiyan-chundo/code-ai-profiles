import { useState } from "react";
import { ArrowRightLeftIcon, CircleStopIcon, TerminalSquareIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "../../components/ui/field";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Spinner } from "../../components/ui/spinner";
import type { CodeSession, SessionProfile, SessionTransferMode } from "../../types";

export function SessionTransferDialog({
  source,
  session,
  instances,
  busy,
  onClose,
  onTransfer,
}: {
  source: SessionProfile;
  session: CodeSession;
  instances: SessionProfile[];
  busy: boolean;
  onClose: () => void;
  onTransfer: (targetId: string, mode: SessionTransferMode, includeLocalArtifacts: boolean) => Promise<void>;
}) {
  const candidates = instances.filter((instance) => instance.id !== source.id);
  const preferredTarget = candidates.find((instance) => !instance.isOriginal && instance.status === "stopped")
    ?? candidates.find((instance) => instance.status === "stopped")
    ?? candidates[0];
  const [targetId, setTargetId] = useState(preferredTarget?.id ?? "");
  const [mode, setMode] = useState<SessionTransferMode>("move");
  const [includeLocalArtifacts, setIncludeLocalArtifacts] = useState(true);
  const target = candidates.find((instance) => instance.id === targetId) ?? null;
  const registeredOrigin = session.transfer
    ? instances.find((instance) => instance.id === session.transfer?.originInstanceId)
    : source;
  const sourceStopped = source.status === "stopped";
  const targetStopped = target?.status === "stopped";
  const hasExistingCopy = target?.codeSessions.some((item) => item.id === session.id) ?? false;
  const ready = Boolean(target && sourceStopped && targetStopped);

  const consequence = mode === "move" ? "La sesión se retirará del perfil actual." : "Se creará una copia vinculada en el perfil de destino.";
  const artifactCount = Math.max(session.publishedArtifactCount ?? 0, session.artifactMonitor?.artifactCount ?? 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent aria-busy={busy} closeDisabled={busy} className="flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pr-12 pb-4">
          <DialogTitle>Transferir sesión de Code</DialogTitle>
          <DialogDescription>Transferencia experimental con respaldo automático</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-6 pt-1 pb-4">
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/15 ring-inset">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-text">
              <TerminalSquareIcon className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
              <small className="font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.11em] text-muted-foreground uppercase">Sesión actual</small>
              <strong className="truncate text-(length:--fs-body)/(--lh-body) font-semibold">{session.title}</strong>
              <span className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">
                En {source.name}
                {registeredOrigin && registeredOrigin.id !== source.id ? ` · origen: ${registeredOrigin.name}` : ""}
              </span>
            </div>
          </div>

          <FieldSet className="gap-2">
            <FieldLegend variant="label" className={LEGEND}>Qué deseas hacer</FieldLegend>
            <RadioGroup
              aria-label="Modo de transferencia"
              value={mode}
              onValueChange={(value) => setMode(value as SessionTransferMode)}
              disabled={busy}
              className="grid-cols-2 items-stretch gap-2"
            >
              <ModeOption id="transfer-mode-move" value="move" title="Mover" description="Queda visible solo en el destino" recommended />
              <ModeOption id="transfer-mode-copy" value="copy" title="Copiar" description="Permanece visible en ambos perfiles" />
            </RadioGroup>
          </FieldSet>

          {candidates.length ? (
            <FieldSet className="gap-2">
              <FieldLegend variant="label" className={LEGEND}>Perfil de destino</FieldLegend>
              <p className="pl-1 text-(length:--fs-small)/(--lh-prose) text-muted-foreground">{consequence}</p>
              <RadioGroup
                aria-label="Perfil de destino"
                value={targetId}
                onValueChange={setTargetId}
                disabled={busy}
                className="gap-1"
              >
                {candidates.map((candidate) => (
                  <TargetOption
                    key={candidate.id}
                    id={`transfer-target-${candidate.id}`}
                    candidate={candidate}
                    existing={candidate.codeSessions.some((item) => item.id === session.id)}
                  />
                ))}
              </RadioGroup>
            </FieldSet>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              Crea otro perfil para poder transferir esta sesión.
            </p>
          )}

          {!ready && candidates.length > 0 && (
            <Alert className="ring-warning/30 text-warning">
              <CircleStopIcon />
              <AlertDescription className="text-(length:--fs-small)/(--lh-prose) text-warning">
                Detén {sourceStopped ? target?.name : targetStopped ? source.name : "ambos perfiles"} antes de transferir. La app no los cerrará automáticamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 rounded-lg bg-(--surface-soft) p-3 ring-1 ring-border ring-inset">
            <Label htmlFor="transfer-artifacts" className="items-start gap-3">
              <Checkbox
                id="transfer-artifacts"
                checked={includeLocalArtifacts}
                onCheckedChange={(checked) => setIncludeLocalArtifacts(checked === true)}
                disabled={busy}
                />
              <span className="grid gap-1">
                <span className="flex h-4 items-center text-xs font-medium">Incluir copias locales de artefactos si están disponibles</span>
                <span className="text-(length:--fs-small)/(--lh-prose) font-normal text-muted-foreground">
                  Los archivos se copian como bytes opacos. Si el esquema no es verificable, quedan en una exportación administrada para importarlos o publicarlos de nuevo.
                </span>
              </span>
            </Label>
            <div className="flex items-start gap-3 border-t pt-3 text-(length:--fs-small)/(--lh-prose) text-muted-foreground">
              <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
              <div className="grid gap-1">
                <p>
                  {mode === "move"
                    ? "La sesión se retira del origen después de confirmar la copia en el destino. Se crea un respaldo y podrás devolverla a su origen desde el botón de desvincular."
                    : "La sesión aparecerá en ambos perfiles, pero su transcript sigue siendo global y compartido. No la abras simultáneamente en los dos perfiles."}
                </p>
                <p>
                  {artifactCount > 0
                    ? `Esta sesión registra ${artifactCount} artefacto(s). Se transferirá la conversación, no la propiedad remota ni sus monitores: en ${target?.name ?? "el destino"} deberás publicar y activar la vigilancia de nuevo.`
                    : "Los artefactos publicados y sus monitores pertenecen a cada perfil y no se reasignan durante la transferencia."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" size="lg" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button size="lg" className="min-w-36" onClick={() => target && void onTransfer(target.id, mode, includeLocalArtifacts)} disabled={busy || !ready}>
            {busy
              ? <><Spinner aria-hidden="true" /> Transfiriendo y respaldando…</>
              : <><ArrowRightLeftIcon /> {
                mode === "move"
                  ? hasExistingCopy ? "Mover y actualizar" : "Mover sesión"
                  : hasExistingCopy ? "Actualizar copia" : "Copiar sesión"
              }</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const LEGEND = "mb-0 pl-1 font-mono data-[variant=label]:text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.11em] text-muted-foreground uppercase";

/** Una opción de modo: radio y título (con su insignia en línea) arriba, descripción a todo el ancho debajo. */
function ModeOption({ id, value, title, description, recommended = false }: {
  id: string;
  value: string;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <FieldLabel htmlFor={id} className="min-w-0">
      <Field orientation="horizontal" className="h-full items-start">
        <RadioGroupItem value={value} id={id} />
        <FieldContent className="min-w-0 gap-1">
          <FieldTitle className="h-4 max-w-full gap-2 text-xs">
            <span className="truncate">{title}</span>
            {recommended && (
              <Badge variant="secondary" className="h-4 shrink-0 px-1 font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.06em] text-primary-text uppercase">Recomendado</Badge>
            )}
          </FieldTitle>
          <FieldDescription className="text-(length:--fs-small)/(--lh-prose)">{description}</FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  );
}

/** Un perfil de destino: una línea con radio, nombre y estado; la nota de índice solo si ya contiene la sesión. */
function TargetOption({ id, candidate, existing }: { id: string; candidate: SessionProfile; existing: boolean }) {
  return (
    <FieldLabel htmlFor={id} className="min-w-0 *:data-[slot=field]:px-3 *:data-[slot=field]:py-2">
      <Field orientation="horizontal" className="min-h-10 items-center has-[>[data-slot=field-content]]:items-center">
        <RadioGroupItem value={candidate.id} id={id} />
        <FieldContent className="min-w-0 gap-0">
          <FieldTitle className="max-w-full text-xs"><span className="truncate">{candidate.name}</span></FieldTitle>
          {existing && (
            <FieldDescription className="text-(length:--fs-small)/(--lh-small)">Ya contiene esta sesión · su índice se actualizará</FieldDescription>
          )}
        </FieldContent>
        <ProfileStatus status={candidate.status} />
      </Field>
    </FieldLabel>
  );
}

/** El estado de un perfil de destino, con las palabras de siempre. */
function ProfileStatus({ status }: { status: SessionProfile["status"] }) {
  return (
    <span
      data-status={status}
      className="inline-flex shrink-0 items-center gap-2 self-center font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold text-muted-foreground uppercase data-[status=missing]:text-destructive data-[status=running]:text-primary-text"
    >
      <i aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status === "stopped" ? "Detenido" : status === "running" ? "Ejecutándose" : "No disponible"}
    </span>
  );
}
