import { useEffect } from "react";
import { PinProjectButton, ProjectsView, RefreshProjectsButton, useProjects } from "../../../features/projects";
import { PageContent } from "../../layout/PageContent";
import { PageHeader } from "../../layout/PageHeader";
import { PageSkeleton } from "../../layout/PageSkeleton";
import { useStartPinProject } from "../../providers/useStartPinProject";

/**
 * `#/proyectos` (HU-0023, A-4): la lista de proyectos anclados. Al entrar relee la lista (D-4; las llamadas en vuelo se
 * comparten con la carga de montaje y con StrictMode) y «Actualizar» hace lo mismo. Mientras carga por primera vez, un
 * esqueleto; la vacía, la de error y las rotas al final las pinta `ProjectsView`.
 */
export function ProjectsRoute() {
  const { status, projects, refreshAll } = useProjects();
  const { start, busy } = useStartPinProject();

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const loading = projects.length === 0 && (status === "idle" || status === "loading");
  return (
    <>
      <PageHeader eyebrow="Proyectos" title="Todos los proyectos">
        {projects.length > 0 && <RefreshProjectsButton />}
        <PinProjectButton onPin={() => void start()} busy={busy} />
      </PageHeader>
      <PageContent aria-live="polite" aria-busy={loading}>
        {loading ? <PageSkeleton rows={2} /> : <ProjectsView onPin={() => void start()} pinBusy={busy} />}
      </PageContent>
    </>
  );
}
