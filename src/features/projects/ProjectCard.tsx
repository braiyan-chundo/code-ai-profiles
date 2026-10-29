import { ClockIcon, PinOffIcon } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Spinner } from "../../components/ui/spinner";
import type { ProjectSummary } from "../../types";
import { ProjectInitial } from "./ProjectInitial";
import { StateBar, StateLegend } from "./StateBar";
import {
  formatLocalDay,
  formatPhase,
  formatRelative,
  formatRepoCount,
} from "./projects-format";
import { BADGE_MONO, PATH_TEXT } from "./projects-styles";
import { cardTechnologies, isReadable, projectName, STATUS_LABEL } from "./projects-selectors";

/**
 * Una tarjeta de la lista (HU-0023): la inicial, el nombre y la ruta, el perfil y la fase, el reparto de historias por
 * estado, 4 o 5 tecnologías, la última actividad y los repos. Entera es un enlace a la página del proyecto. Las de una
 * fila miden lo mismo y el pie queda siempre abajo.
 */
export function ProjectCard({ project, now }: { project: ProjectSummary; now: Date }) {
  const info = isReadable(project) ? project.info : null;
  if (!info) return null;
  const name = projectName(project);
  const technologies = cardTechnologies(info);
  return (
    <Link
      to={`/proyectos/${encodeURIComponent(project.id)}`}
      className="group/project block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-shadow group-hover/project:ring-foreground/25">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start gap-3">
            <ProjectInitial name={name} size="lg" />
            <div className="grid min-w-0 flex-1 gap-1">
              <h2 className="truncate text-(length:--fs-heading)/(--lh-heading) font-semibold tracking-[-0.01em]">{name}</h2>
              <span className={`${PATH_TEXT} truncate`} title={project.displayPath}>{project.displayPath}</span>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {info.profile && <Badge variant="secondary" className={BADGE_MONO}>Perfil {info.profile}</Badge>}
              {info.phase && <Badge variant="secondary" className={BADGE_MONO}>{formatPhase(info.phase)}</Badge>}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">
                <b className="mr-1 font-mono text-(length:--fs-heading)/(--lh-heading) font-semibold text-foreground">{info.counts.total}</b>
                {info.counts.total === 1 ? "historia" : "historias"}
              </span>
              <StateLegend counts={info.counts} />
            </div>
            <StateBar counts={info.counts} />
          </div>

          {technologies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {technologies.map((label) => (
                <Badge key={label} variant="outline" className="bg-(--surface-soft) text-(length:--fs-small)/(--lh-small)">{label}</Badge>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-(--line) pt-4 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ClockIcon aria-hidden="true" className="size-4" />
              {info.lastActivity ? `Última actividad ${formatRelative(info.lastActivity, now)}` : "Sin actividad registrada"}
            </span>
            <span>{formatRepoCount(info.repos.length)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * La tarjeta de un proyecto roto (AC-05): su último nombre leído, la ruta, el motivo tal como lo redactó Rust y
 * «Desanclar». El nombre lleva a su página, que explica las causas y deja reintentar.
 */
export function BrokenProjectCard({
  project,
  busy,
  onUnpin,
}: {
  project: ProjectSummary;
  busy: boolean;
  onUnpin: () => void;
}) {
  const name = projectName(project);
  return (
    <Card className="h-full ring-destructive/35" data-status={project.status}>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <ProjectInitial name={name} size="lg" broken />
          <div className="grid min-w-0 flex-1 gap-1">
            <h2 className="truncate text-(length:--fs-heading)/(--lh-heading) font-semibold tracking-[-0.01em]">
              <Link
                to={`/proyectos/${encodeURIComponent(project.id)}`}
                className="rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {name}
              </Link>
            </h2>
            <span className={`${PATH_TEXT} truncate`} title={project.displayPath}>{project.displayPath}</span>
          </div>
          <Badge variant="destructive" className={BADGE_MONO}>
            <i aria-hidden="true" className="size-2 rounded-full bg-current" />
            {STATUS_LABEL[project.status]}
          </Badge>
        </div>
        {project.message && <p className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">{project.message}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-(--line) pt-4 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <ClockIcon aria-hidden="true" className="size-4" />
            {project.lastReadAt ? `Leído por última vez el ${formatLocalDay(project.lastReadAt)}` : "Nunca se pudo leer"}
          </span>
          <Button variant="outline" size="sm" disabled={busy} onClick={onUnpin}>
            {busy ? <Spinner aria-hidden="true" /> : <PinOffIcon aria-hidden="true" />} Desanclar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
