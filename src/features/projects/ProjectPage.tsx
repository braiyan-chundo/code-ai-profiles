import { TriangleAlertIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { limitWarnings } from "./projects-detail";
import type { ReadableProject } from "./projects-selectors";
import { ProjectConsumption } from "./ProjectConsumption";
import { ProjectFigures } from "./ProjectFigures";
import { ProjectHero } from "./ProjectHero";
import { ProjectHistories } from "./ProjectHistories";
import { ProjectRepos } from "./ProjectRepos";
import { ProjectTechnologies } from "./ProjectTechnologies";
import { useProjects } from "./useProjects";

/**
 * El cuerpo de `#/proyectos/<id>` de un proyecto v4 (AC-03 y AC-04): cabecera, cifras, Tecnologías (5/12) y Repos
 * (7/12) con la misma altura, la tabla de historias y el consumo. Las secciones van separadas 32 px; dentro de cada
 * una, 16 a 24. Los avisos por campo que devolvió Rust se listan debajo de la cabecera, tal cual y con un tope de 20 («y N más»).
 */
export function ProjectPage({ project, onUnpinned }: { project: ReadableProject; onUnpinned: () => void }) {
  const { refreshing, refreshOne, openFolder, unpin, actionError, clearActionError } = useProjects();
  const [unpinning, setUnpinning] = useState(false);
  // Un reloj por lectura: «hace 2 h» se recalcula al releer, sin temporizador.
  const now = useMemo(() => new Date(), [project.readAt]);

  const { shown: shownWarnings, hidden: hiddenWarnings } = useMemo(() => limitWarnings(project.warnings), [project.warnings]);

  const handleUnpin = async () => {
    setUnpinning(true);
    const done = await unpin(project.id);
    setUnpinning(false);
    if (done) onUnpinned();
  };

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-8">
      {actionError && (
        <NoticeAlert
          variant="destructive"
          icon={<TriangleAlertIcon aria-hidden="true" />}
          title={actionError}
          action={
            <Button variant="ghost" size="icon-sm" onClick={clearActionError} aria-label="Cerrar aviso">
              <XIcon />
            </Button>
          }
        />
      )}
      <ProjectHero
        project={project}
        refreshing={Boolean(refreshing[project.id])}
        unpinning={unpinning}
        onRefresh={() => void refreshOne(project.id)}
        onOpenFolder={() => void openFolder(project.id)}
        onUnpin={() => void handleUnpin()}
      />
      {project.warnings.length > 0 && (
        <NoticeAlert
          role="status"
          icon={<TriangleAlertIcon aria-hidden="true" />}
          title={project.warnings.length === 1 ? "Un aviso al leer el proyecto" : `${project.warnings.length} avisos al leer el proyecto`}
          className="text-warning"
        >
          <ul className="m-0 grid list-none gap-1 p-0">
            {shownWarnings.map((warning, index) => (
              <li key={`${warning.scope}:${warning.target ?? ""}:${index}`}>
                {warning.target && <span className="mr-2 font-mono">{warning.target}</span>}
                {warning.message}
              </li>
            ))}
            {hiddenWarnings > 0 && <li className="font-medium">y {hiddenWarnings} más</li>}
          </ul>
        </NoticeAlert>
      )}
      <ProjectFigures info={project.info} now={now} />
      <div className="grid grid-cols-12 items-stretch gap-6">
        <ProjectTechnologies info={project.info} className="col-span-5 max-[1070px]:col-span-12" />
        <ProjectRepos info={project.info} now={now} className="col-span-7 max-[1070px]:col-span-12" />
      </div>
      <ProjectHistories info={project.info} />
      <ProjectConsumption info={project.info} />
    </div>
  );
}
