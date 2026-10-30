import { FolderSearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "../../../components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../../components/ui/empty";
import {
  findProject,
  isReadable,
  ProjectBrokenPage,
  ProjectPage,
  projectName,
  useProjects,
} from "../../../features/projects";
import { useDialogs } from "../../providers/dialogs-context";
import { PageContent } from "../../layout/PageContent";
import { PageHeader } from "../../layout/PageHeader";
import { PageSkeleton } from "../../layout/PageSkeleton";

/**
 * `#/proyectos/<id>` (HU-0023, A-4): la página de un proyecto. Al entrar, y al cambiar el id, relee ese proyecto (D-4);
 * un id que no está en el estado enseña «Proyecto no encontrado» con el enlace a la lista, no una redirección silenciosa.
 * Mientras carga por primera vez, un esqueleto. Un proyecto roto enseña su página de recuperación (AC-05).
 */
export function ProjectRoute() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { status, projects, refreshing, refreshOne, unpin } = useProjects();
  const { setProjectDialog } = useDialogs();
  const [unpinning, setUnpinning] = useState(false);
  const project = findProject(projects, projectId);

  useEffect(() => {
    if (projectId) void refreshOne(projectId);
  }, [projectId, refreshOne]);

  if (!project) {
    if (status === "idle" || status === "loading") {
      return (
        <>
          <PageHeader eyebrow="Proyectos" title="Cargando…" />
          <PageContent aria-busy="true"><PageSkeleton rows={2} /></PageContent>
        </>
      );
    }
    return (
      <>
        <PageHeader eyebrow="Proyectos" title="No encontrado" />
        <PageContent>
          <Empty aria-label="Proyecto no encontrado" className="mx-auto max-w-[1200px] gap-4 rounded-xl border border-dashed bg-(--surface-soft)">
            <EmptyHeader className="max-w-md gap-2">
              <EmptyMedia variant="icon" className="rounded-md ring-1 ring-(--line) ring-inset">
                <FolderSearchIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">Este proyecto ya no está anclado</EmptyTitle>
              <EmptyDescription className="text-(length:--fs-small)/(--lh-prose)">
                Puede que lo hayas desanclado o que el enlace sea de otra sesión. La carpeta no se tocó: vuelve a anclarla desde Proyectos.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild><Link to="/proyectos">Ir a Proyectos</Link></Button>
            </EmptyContent>
          </Empty>
        </PageContent>
      </>
    );
  }

  const handleUnpin = async () => {
    setUnpinning(true);
    const done = await unpin(project.id);
    setUnpinning(false);
    if (done) navigate("/proyectos", { replace: true });
  };

  return (
    <>
      <PageHeader eyebrow="Proyectos" title={projectName(project)} />
      <PageContent aria-live="polite">
        {isReadable(project) ? (
          <ProjectPage
            project={project}
            onUnpinned={() => navigate("/proyectos", { replace: true })}
            onOpenIncomplete={() => setProjectDialog({ kind: "incomplete", projectId: project.id })}
            onOpenHistory={(folder) => setProjectDialog({ kind: "reader", projectId: project.id, folder })}
          />
        ) : (
          <ProjectBrokenPage
            project={project}
            refreshing={Boolean(refreshing[project.id])}
            unpinning={unpinning}
            onRefresh={() => void refreshOne(project.id)}
            onUnpin={() => void handleUnpin()}
          />
        )}
      </PageContent>
    </>
  );
}
