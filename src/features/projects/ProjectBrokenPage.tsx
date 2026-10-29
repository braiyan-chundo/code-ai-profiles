import { EyeIcon, PinOffIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react";
import { Link } from "react-router";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";
import type { ProjectSummary } from "../../types";
import { ProjectInitial } from "./ProjectInitial";
import { formatLocalDay } from "./projects-format";
import { BADGE_MONO, PATH_TEXT } from "./projects-styles";
import { projectName, STATUS_LABEL } from "./projects-selectors";

/**
 * La página de un proyecto roto (AC-05): la cabecera en rojo con el último nombre leído, la ruta y cuándo se leyó por
 * última vez, el motivo tal como lo redactó Rust, «Reintentar» y «Desanclar», y la aclaración de que desanclar no toca
 * ninguna carpeta. Sin permiso, además, enlaza a Configuración › Permisos (A-6).
 */
export function ProjectBrokenPage({
  project,
  refreshing,
  unpinning,
  onRefresh,
  onUnpin,
}: {
  project: ProjectSummary;
  refreshing: boolean;
  unpinning: boolean;
  onRefresh: () => void;
  onUnpin: () => void;
}) {
  const name = projectName(project);
  const lastRead = project.lastReadAt ? `leído por última vez el ${formatLocalDay(project.lastReadAt)}` : "nunca se pudo leer";
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-8">
      <Card className="ring-destructive/35" data-status={project.status}>
        <CardContent className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-6 max-[1070px]:grid-cols-[64px_minmax(0,1fr)]">
          <ProjectInitial name={name} size="xl" broken />
          <div className="grid min-w-0 gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive" className={BADGE_MONO}>
                <i aria-hidden="true" className="size-2 rounded-full bg-current" />
                {STATUS_LABEL[project.status]}
              </Badge>
            </div>
            <span className={cn(PATH_TEXT, "break-all")}>{project.displayPath} · {lastRead}</span>
            {project.message && <p className="text-(length:--fs-small)/(--lh-prose) text-muted-foreground">{project.message}</p>}
            {project.status === "permissionDenied" && (
              <p className="text-(length:--fs-small)/(--lh-small)">
                <Button asChild variant="link" size="xs" className="h-auto p-0 text-(length:--fs-small)/(--lh-small)">
                  <Link to="/configuracion/permisos"><ShieldCheckIcon aria-hidden="true" /> Abrir Configuración › Permisos</Link>
                </Button>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 max-[1070px]:col-start-2">
            <Button variant="outline" disabled={refreshing} aria-busy={refreshing} onClick={onRefresh}>
              <RefreshCwIcon aria-hidden="true" className={cn(refreshing && "animate-spin")} /> Reintentar
            </Button>
            <Button variant="outline" disabled={unpinning} onClick={onUnpin}>
              {unpinning ? <Spinner aria-hidden="true" /> : <PinOffIcon aria-hidden="true" />} Desanclar
            </Button>
          </div>
        </CardContent>
      </Card>
      <NoticeAlert role="note" icon={<EyeIcon aria-hidden="true" />} title="Desanclar no toca ninguna carpeta">
        Solo quita el proyecto de la lista. Si la carpeta aparece en otro sitio, vuelve a anclarla con «Anclar proyecto».
      </NoticeAlert>
    </div>
  );
}
