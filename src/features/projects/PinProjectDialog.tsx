import { CircleCheckIcon, CircleXIcon, EyeIcon, FolderPlusIcon, PinIcon, TriangleAlertIcon } from "lucide-react";
import { Fragment } from "react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";
import type { ProjectCandidate } from "../../types";
import { ProjectInitial } from "./ProjectInitial";
import { BADGE_MONO, PATH_TEXT } from "./projects-styles";
import { candidateChecks, candidateProblemTitle, STATUS_LABEL } from "./projects-selectors";

/** Parte un texto en trozos normales y en `código` (entre acentos graves). */
function WithCode({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) => (
        <Fragment key={index}>
          {index % 2 === 1 ? <code className="font-mono text-(length:--fs-small)/(--lh-small)">{part}</code> : part}
        </Fragment>
      ))}
    </>
  );
}

/**
 * El diálogo que sigue al selector nativo (HU-0023, AC-02): enseña lo que hay en la carpeta elegida antes de guardar nada.
 * Una carpeta v4 se ancla con «Anclar» (o se ve con «Ver proyecto» si ya estaba); una que no lo es explica qué paso falla y
 * no se ancla. «Elegir otra carpeta» vuelve a abrir el selector. Escape, la X y el clic fuera pasan por `onOpenChange`, con
 * la misma guarda de `busy` que los botones (HU-0016, A-12).
 */
export function PinProjectDialog({
  candidate,
  pinning,
  picking,
  error,
  onClose,
  onPickAnother,
  onPin,
  onView,
}: {
  candidate: ProjectCandidate;
  pinning: boolean;
  picking: boolean;
  error: string | null;
  onClose: () => void;
  onPickAnother: () => void;
  onPin: () => void;
  onView: (id: string) => void;
}) {
  const busy = pinning || picking;
  const valid = candidate.status === "v4";
  const alreadyPinned = valid && candidate.alreadyPinnedId !== null;
  const name = candidate.name ?? candidate.displayPath.split(/[\\/]/).filter(Boolean).pop() ?? "Carpeta";
  const checks = candidateChecks(candidate);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent aria-busy={busy} closeDisabled={busy}>
        <DialogHeader>
          <DialogTitle className="text-(length:--fs-dialog)/(--lh-dialog) font-semibold tracking-[-0.035em]">Anclar proyecto</DialogTitle>
          <DialogDescription className="text-(length:--fs-small)/(--lh-small)">Esto es lo que hay en la carpeta que elegiste.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-sm border border-(--line) bg-(--surface-soft) p-3">
          <ProjectInitial name={name} size="lg" broken={!valid} />
          <div className="grid min-w-0 flex-1 gap-1">
            <b className="truncate text-(length:--fs-heading)/(--lh-heading) font-semibold">{name}</b>
            <span className={cn(PATH_TEXT, "truncate")} title={candidate.displayPath}>{candidate.displayPath}</span>
          </div>
          <Badge
            variant={candidate.status === "v4" ? "outline" : candidate.status === "notV4" ? "outline" : "destructive"}
            className={cn(BADGE_MONO, candidate.status === "v4" && "border-success/40 text-success", candidate.status === "notV4" && "border-warning/40 text-warning")}
          >
            <i aria-hidden="true" className="size-2 rounded-full bg-current" />
            {STATUS_LABEL[candidate.status]}
          </Badge>
        </div>

        <ul className="m-0 grid list-none gap-3 p-0">
          {checks.map((check) => (
            <li key={check.text} className="flex items-center gap-2 text-(length:--fs-body)/(--lh-body)">
              {check.ok ? (
                <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" />
              ) : (
                <CircleXIcon aria-hidden="true" className="size-4 shrink-0 text-destructive" />
              )}
              <span className="sr-only">{check.ok ? "Correcto: " : "Falla: "}</span>
              <span className="min-w-0 flex-1"><WithCode text={check.text} /></span>
              {check.detail && <em className="text-(length:--fs-small)/(--lh-small) whitespace-nowrap text-muted-foreground not-italic">{check.detail}</em>}
            </li>
          ))}
        </ul>

        {valid ? (
          <p className="flex items-start gap-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
            <EyeIcon aria-hidden="true" className="size-4 shrink-0" />
            <span>
              {alreadyPinned
                ? "Este proyecto ya está anclado. "
                : "Se guardan la ruta y el nombre. "}
              La app lee estos archivos y no cambia ni ejecuta nada en la carpeta.
            </span>
          </p>
        ) : (
          <NoticeAlert
            role="note"
            icon={<TriangleAlertIcon aria-hidden="true" />}
            title={candidateProblemTitle(candidate.status)}
            className="ring-warning/40 text-warning"
          >
            {candidate.message ? `${candidate.message} ` : ""}No se ancló nada.
          </NoticeAlert>
        )}

        {error && (
          <NoticeAlert variant="destructive" icon={<TriangleAlertIcon aria-hidden="true" />} title="No se pudo anclar el proyecto">
            {error}
          </NoticeAlert>
        )}

        <DialogFooter>
          {valid ? (
            <>
              <Button variant="outline" size="lg" disabled={busy} onClick={onPickAnother}>
                {picking && <Spinner aria-hidden="true" />} Elegir otra carpeta
              </Button>
              {alreadyPinned ? (
                <Button size="lg" disabled={busy} onClick={() => onView(candidate.alreadyPinnedId ?? "")}>Ver proyecto</Button>
              ) : (
                <Button size="lg" disabled={busy} onClick={onPin}>
                  {pinning ? <><Spinner aria-hidden="true" /> Anclando…</> : <><PinIcon aria-hidden="true" /> Anclar</>}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="lg" disabled={busy} onClick={onClose}>Cancelar</Button>
              <Button size="lg" disabled={busy} onClick={onPickAnother}>
                {picking ? <Spinner aria-hidden="true" /> : <FolderPlusIcon aria-hidden="true" />} Elegir otra carpeta
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
