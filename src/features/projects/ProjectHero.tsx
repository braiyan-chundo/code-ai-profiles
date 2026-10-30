import { CheckIcon, CircleCheckIcon, FileSearchIcon, FolderOpenIcon, HistoryIcon, PinOffIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";
import { ProjectInitial } from "./ProjectInitial";
import { incompleteChip } from "./projects-detail";
import { formatClock, formatPhase } from "./projects-format";
import { BADGE_MONO, PATH_TEXT } from "./projects-styles";
import { projectName, type ReadableProject } from "./projects-selectors";

const META = "inline-flex min-w-0 items-center gap-2";

/**
 * La cabecera de la página (AC-03): la inicial de 64, el perfil, la fase y «Metodología v4», el resumen en dos líneas,
 * quién aprueba, la ruta y cuándo se leyó, y las acciones: «Actualizar», «Abrir carpeta» y «Desanclar». Desanclar no
 * pide confirmación: no toca la carpeta y se deshace anclando otra vez. Si hay historias con datos incompletos o avisos
 * de lectura, un chip de 24 px en la fila de insignias abre el modal (HU-0025, D-1).
 */
export function ProjectHero({
  project,
  refreshing,
  unpinning,
  refreshFailed,
  onRefresh,
  onOpenFolder,
  onUnpin,
  onOpenIncomplete,
}: {
  project: ReadableProject;
  refreshing: boolean;
  unpinning: boolean;
  /** La última lectura falló: no se anuncia «Actualizado» (el error se ve en el aviso de la página). */
  refreshFailed: boolean;
  onRefresh: () => void;
  onOpenFolder: () => void;
  onUnpin: () => void;
  onOpenIncomplete: () => void;
}) {
  const { info } = project;
  const chip = incompleteChip(info, project.warnings);
  const name = projectName(project);
  // «Actualizado» se enseña un par de segundos al terminar una lectura buena, para que el clic tenga respuesta.
  const [justUpdated, setJustUpdated] = useState(false);
  const wasRefreshing = useRef(false);
  useEffect(() => {
    const finished = wasRefreshing.current && !refreshing;
    wasRefreshing.current = refreshing;
    if (refreshing) setJustUpdated(false);
    if (!finished || refreshFailed) return;
    setJustUpdated(true);
    const timer = setTimeout(() => setJustUpdated(false), 2500);
    return () => clearTimeout(timer);
  }, [refreshing, refreshFailed]);
  return (
    <Card>
      <CardContent className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-6 max-[1070px]:grid-cols-[64px_minmax(0,1fr)]">
        <ProjectInitial name={name} size="xl" />
        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap gap-2">
            {info.profile && <Badge variant="secondary" className={BADGE_MONO}>Perfil {info.profile}</Badge>}
            {info.phase && <Badge variant="secondary" className={BADGE_MONO}>{formatPhase(info.phase)}</Badge>}
            <Badge variant="outline" className={cn(BADGE_MONO, "border-primary/30 text-primary-text")}>Metodología v4</Badge>
            {chip && (
              <Badge asChild variant="outline" className={cn("cursor-pointer gap-2 px-2 hover:bg-muted", chip.tone === "warning" && "border-(--ui-warning) text-warning hover:text-warning")}>
                <button type="button" onClick={onOpenIncomplete} aria-haspopup="dialog">
                  {chip.tone === "warning" ? <TriangleAlertIcon aria-hidden="true" className="size-3.5!" /> : <FileSearchIcon aria-hidden="true" className="size-3.5!" />}
                  {chip.text}
                  <span aria-hidden="true" className="text-muted-foreground">· </span>
                  <b className="font-semibold text-primary-text">Ver</b>
                </button>
              </Badge>
            )}
          </div>
          {info.summary && (
            <p className="line-clamp-2 max-w-[760px] text-(length:--fs-body)/(--lh-body)" title={info.summary}>{info.summary}</p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
            {info.approver && (
              <span className={META}>
                <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />
                Aprueba <b className="font-medium text-foreground">{info.approver}</b>
              </span>
            )}
            <span className={META}>
              <FolderOpenIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className={cn(PATH_TEXT, "truncate")} title={project.displayPath}>{project.displayPath}</span>
            </span>
            <span className={META}>
              <HistoryIcon aria-hidden="true" className="size-4 shrink-0" />
              Leído a las {formatClock(project.readAt, true)}
              {justUpdated && (
                <span role="status" className="inline-flex items-center gap-1 font-medium text-success">
                  <CheckIcon aria-hidden="true" className="size-4" /> Actualizado
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-[1070px]:col-start-2">
          <Button variant="outline" disabled={refreshing} aria-busy={refreshing} onClick={onRefresh}>
            <RefreshCwIcon aria-hidden="true" className={cn(refreshing && "animate-spin")} /> Actualizar
          </Button>
          <Button variant="outline" onClick={onOpenFolder}>
            <FolderOpenIcon aria-hidden="true" /> Abrir carpeta
          </Button>
          <Button variant="outline" disabled={unpinning} onClick={onUnpin}>
            {unpinning ? <Spinner aria-hidden="true" /> : <PinOffIcon aria-hidden="true" />} Desanclar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
