import { useState, type ReactNode } from "react";
import { ArrowRightLeftIcon, CircleStopIcon, TerminalSquareIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "../../components/ui/field";
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

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent aria-busy={busy} closeDisabled={busy}>
        <DialogHeader>
          <DialogTitle>Transferir sesión de Code</DialogTitle>
          <DialogDescription>Transferencia experimental con respaldo automático</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3.5">
            <span className="grid size-[38px] shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-text">
              <TerminalSquareIcon className="size-[19px]" />
            </span>
            <div className="grid min-w-0 gap-1">
              <small className="font-mono text-(length:--fs-micro) font-semibold tracking-[0.11em] text-muted-foreground uppercase">Sesión actual</small>
              <strong className="truncate text-(length:--fs-body) font-semibold">{session.title}</strong>
              <span className="text-(length:--fs-small) text-muted-foreground">
                En {source.name}
                {registeredOrigin && registeredOrigin.id !== source.id ? ` · origen: ${registeredOrigin.name}` : ""}
              </span>
            </div>
          </div>

          <FieldSet className="gap-2.5">
            <FieldLegend variant="label" className={LEGEND}>Qué deseas hacer</FieldLegend>
            <RadioGroup
              aria-label="Modo de transferencia"
              value={mode}
              onValueChange={(value) => setMode(value as SessionTransferMode)}
              disabled={busy}
              className="grid-cols-2 gap-2"
            >
              <ChoiceCard id="transfer-mode-move" value="move" title="Mover" description="Queda visible solo en el destino">
                <Badge variant="secondary" className="font-mono text-(length:--fs-micro) tracking-[0.06em] text-primary-text">RECOMENDADO</Badge>
              </ChoiceCard>
              <ChoiceCard id="transfer-mode-copy" value="copy" title="Copiar" description="Permanece visible en ambos perfiles" />
            </RadioGroup>
          </FieldSet>

          {candidates.length ? (
            <FieldSet className="gap-2.5">
              <FieldLegend variant="label" className={LEGEND}>Perfil de destino</FieldLegend>
              <RadioGroup
                aria-label="Perfil de destino"
                value={targetId}
                onValueChange={setTargetId}
                disabled={busy}
                className="gap-2"
              >
                {candidates.map((candidate) => {
                  const existing = candidate.codeSessions.some((item) => item.id === session.id);
                  return (
                    <ChoiceCard
                      key={candidate.id}
                      id={`transfer-target-${candidate.id}`}
                      value={candidate.id}
                      title={candidate.name}
                      description={existing
                        ? "Ya contiene esta sesión · su índice se actualizará"
                        : mode === "move" ? "La sesión se retirará del perfil actual" : "Se creará una copia vinculada"}
                    >
                      <ProfileStatus status={candidate.status} />
                    </ChoiceCard>
                  );
                })}
              </RadioGroup>
            </FieldSet>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              Crea otro perfil para poder transferir esta sesión.
            </p>
          )}

          {!ready && candidates.length > 0 && (
            <Alert className="border-warning/30 text-warning">
              <CircleStopIcon />
              <AlertDescription className="text-(length:--fs-small) leading-relaxed text-warning">
                Detén {sourceStopped ? target?.name : targetStopped ? source.name : "ambos perfiles"} antes de transferir. La app no los cerrará automáticamente.
              </AlertDescription>
            </Alert>
          )}

          <FieldLabel htmlFor="transfer-artifacts">
            <Field orientation="horizontal">
              <Checkbox
                id="transfer-artifacts"
                checked={includeLocalArtifacts}
                onCheckedChange={(checked) => setIncludeLocalArtifacts(checked === true)}
                disabled={busy}
              />
              <FieldContent>
                <FieldTitle className="text-xs">Incluir copias locales de artefactos si están disponibles</FieldTitle>
                <FieldDescription className="text-(length:--fs-small) leading-snug">
                  Los archivos se copian como bytes opacos. Si el esquema no es verificable, quedan en una exportación administrada para importarlos o publicarlos de nuevo.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

          <Alert className="text-muted-foreground">
            <TriangleAlertIcon />
            <AlertDescription className="grid gap-2 text-(length:--fs-small) leading-relaxed [&_p:not(:last-child)]:mb-0">
              <p>
                {mode === "move"
                  ? "La sesión se retira del origen después de confirmar la copia en el destino. Se crea un respaldo y podrás devolverla a su origen desde el botón de desvincular."
                  : "La sesión aparecerá en ambos perfiles, pero su transcript sigue siendo global y compartido. No la abras simultáneamente en los dos perfiles."}
              </p>
              <p className="border-t pt-2 text-primary-text">
                {(session.publishedArtifactCount ?? 0) > 0 || session.artifactMonitor
                  ? <>
                    Esta sesión registra {Math.max(session.publishedArtifactCount ?? 0, session.artifactMonitor?.artifactCount ?? 0)} artefacto(s).
                    Se transferirá la conversación, no la propiedad remota ni sus monitores: en {target?.name ?? "el destino"} deberás publicar y activar la vigilancia de nuevo.
                  </>
                  : "Los artefactos publicados y sus monitores pertenecen a cada perfil y no se reasignan durante la transferencia."}
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
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

const LEGEND = "mb-0 pl-0.5 font-mono data-[variant=label]:text-(length:--fs-micro) font-semibold tracking-[0.11em] text-muted-foreground uppercase";

/** Una opción de la transferencia: el radio, su título y su descripción; `children` va a la derecha. */
function ChoiceCard({ id, value, title, description, children }: {
  id: string;
  value: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <FieldLabel htmlFor={id} className="min-w-0">
      <Field orientation="horizontal" className="items-center">
        <RadioGroupItem value={value} id={id} />
        <FieldContent className="min-w-0 gap-1">
          <FieldTitle className="max-w-full truncate text-xs">{title}</FieldTitle>
          <FieldDescription className="text-(length:--fs-small) leading-snug">{description}</FieldDescription>
        </FieldContent>
        {children}
      </Field>
    </FieldLabel>
  );
}

/** El estado de un perfil de destino, con las palabras de siempre. */
function ProfileStatus({ status }: { status: SessionProfile["status"] }) {
  return (
    <span
      data-status={status}
      className="inline-flex shrink-0 items-center gap-1.5 self-center font-mono text-(length:--fs-micro) font-semibold text-muted-foreground uppercase data-[status=missing]:text-destructive data-[status=running]:text-primary-text"
    >
      <i aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status === "stopped" ? "Detenido" : status === "running" ? "Ejecutándose" : "No disponible"}
    </span>
  );
}
