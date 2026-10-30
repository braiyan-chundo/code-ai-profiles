import { TriangleAlertIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
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
 * una, 16 a 24. Los avisos de lectura ya no se listan aquí: van, con las historias de datos incompletos, en el modal que
 * abre el chip de la cabecera (HU-0025). Una fila de la tabla abre el lector de esa historia.
 */
export function ProjectPage({
  project,
  onUnpinned,
  onOpenIncomplete,
  onOpenHistory,
}: {
  project: ReadableProject;
  onUnpinned: () => void;
  onOpenIncomplete: () => void;
  onOpenHistory: (folder: string) => void;
}) {
  const { refreshing, refreshOne, openFolder, unpin, actionError, clearActionError } = useProjects();
  const [unpinning, setUnpinning] = useState(false);
  // Un reloj por lectura: «hace 2 h» se recalcula al releer, sin temporizador.
  const now = useMemo(() => new Date(), [project.readAt]);

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
        refreshFailed={Boolean(actionError)}
        onRefresh={() => void refreshOne(project.id)}
        onOpenFolder={() => void openFolder(project.id)}
        onUnpin={() => void handleUnpin()}
        onOpenIncomplete={onOpenIncomplete}
      />
      <ProjectFigures info={project.info} now={now} />
      <div className="grid grid-cols-12 items-stretch gap-6">
        <ProjectTechnologies info={project.info} className="col-span-5 max-[1070px]:col-span-12" />
        <ProjectRepos info={project.info} now={now} className="col-span-7 max-[1070px]:col-span-12" />
      </div>
      <ProjectHistories info={project.info} onOpenHistory={onOpenHistory} />
      <ProjectConsumption info={project.info} />
    </div>
  );
}
