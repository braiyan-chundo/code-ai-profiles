import { EyeIcon, FolderPlusIcon, RefreshCwIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../components/ui/empty";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";
import { BrokenProjectCard, ProjectCard } from "./ProjectCard";
import { formatClock } from "./projects-format";
import { isReadable, sortProjects } from "./projects-selectors";
import { useProjects } from "./useProjects";

/** El botón «Actualizar» de la cabecera de la lista: con la etiqueta a partir de 1071 px y solo el icono por debajo. */
export function RefreshProjectsButton() {
  const { refreshAll, listRefreshing } = useProjects();
  return (
    <Button variant="outline" disabled={listRefreshing} aria-busy={listRefreshing} aria-label="Actualizar" title="Actualizar" onClick={() => void refreshAll()}>
      <RefreshCwIcon aria-hidden="true" className={cn(listRefreshing && "animate-spin")} />
      <span className="max-[1070px]:hidden">Actualizar</span>
    </Button>
  );
}

/** El botón «Anclar proyecto»: abre el selector nativo (`onPin`) y se deshabilita mientras está abierto. */
export function PinProjectButton({ onPin, busy }: { onPin: () => void; busy: boolean }) {
  return (
    <Button disabled={busy} aria-busy={busy} onClick={onPin}>
      {busy ? <Spinner aria-hidden="true" /> : <FolderPlusIcon aria-hidden="true" />} Anclar proyecto
    </Button>
  );
}

/**
 * El cuerpo de `#/proyectos` (HU-0023, AC-02 y AC-05): una tarjeta por proyecto en dos columnas de 6/12, por última
 * actividad y con las rotas al final. Estados: cargando, error, vacía y con datos. «Leídos a las…» enseña cuándo leyó
 * Rust la lista, y el aviso dice que la app solo lee.
 */
export function ProjectsView({ onPin, pinBusy }: { onPin: () => void; pinBusy: boolean }) {
  const { status, projects, readAt, error, actionError, clearActionError, refreshAll, unpin } = useProjects();
  const [unpinning, setUnpinning] = useState<string | null>(null);
  const sorted = useMemo(() => sortProjects(projects), [projects]);
  // Un reloj por render: las fechas relativas («hace 2 h») se recalculan al releer, sin temporizador.
  const now = useMemo(() => new Date(), [readAt]);

  const unpinOne = async (id: string) => {
    setUnpinning(id);
    try {
      await unpin(id);
    } finally {
      setUnpinning(null);
    }
  };

  const banner = (message: string, close: (() => void) | null) => (
    <NoticeAlert
      variant="destructive"
      icon={<TriangleAlertIcon aria-hidden="true" />}
      title={message}
      action={close && (
        <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Cerrar aviso">
          <XIcon />
        </Button>
      )}
    />
  );

  if (status === "error" && projects.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-[1200px] gap-4">
        <NoticeAlert
          variant="destructive"
          icon={<TriangleAlertIcon aria-hidden="true" />}
          title="No se pudieron leer los proyectos"
          action={<Button variant="outline" size="sm" onClick={() => void refreshAll()}>Reintentar</Button>}
        >
          {error}
        </NoticeAlert>
      </div>
    );
  }

  if (projects.length === 0 && status !== "ready") return null;

  if (projects.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-[1200px] gap-4">
        {actionError && banner(actionError, clearActionError)}
        <Empty aria-label="Sin proyectos" className="gap-4 rounded-xl border border-dashed bg-(--surface-soft)">
          <EmptyHeader className="max-w-md gap-2">
            <EmptyMedia variant="icon" className="rounded-md ring-1 ring-(--line) ring-inset">
              <FolderPlusIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">Ancla tu primer proyecto</EmptyTitle>
            <EmptyDescription className="text-(length:--fs-small)/(--lh-prose)">
              Elige la carpeta de un proyecto que use la metodología v4, la que tiene{" "}
              <code className="font-mono">.metodo/config.json</code>. Verás en qué fase está, sus historias y lo que ha consumido.
            </EmptyDescription>
            <EmptyDescription className="text-(length:--fs-small)/(--lh-prose)">
              Por ahora solo admite proyectos v4. La app lee sus archivos: no cambia ni ejecuta nada.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <PinProjectButton onPin={onPin} busy={pinBusy} />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const readable = sorted.filter(isReadable).length;
  const total = sorted.length;
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-4">
      {error && banner(error, null)}
      {actionError && banner(actionError, clearActionError)}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
        <span>
          {total} {total === 1 ? "proyecto anclado" : "proyectos anclados"} · por última actividad
          {readable < total && ` · ${total - readable} ${total - readable === 1 ? "requiere atención" : "requieren atención"}`}
        </span>
        <span className="inline-flex items-center gap-2">
          <EyeIcon aria-hidden="true" className="size-4" />
          Solo lectura{readAt ? ` · leídos a las ${formatClock(readAt)}` : ""}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-6 max-[760px]:grid-cols-1" aria-label="Lista de proyectos">
        {sorted.map((project) => (
          <li key={project.id} className="min-w-0">
            {isReadable(project) ? (
              <ProjectCard project={project} now={now} />
            ) : (
              <BrokenProjectCard project={project} busy={unpinning === project.id} onUnpin={() => void unpinOne(project.id)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
