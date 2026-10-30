import { FolderPlusIcon, LayoutGridIcon, TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useMatch } from "react-router";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "../../components/ui/sidebar";
import {
  inProgressCount,
  isReadable,
  ProjectInitial,
  projectName,
  sortProjects,
  STATUS_LABEL,
  useProjects,
} from "../../features/projects";
import { useStartPinProject } from "../providers/useStartPinProject";
import { GROUP_LABEL, MenuCount } from "./sidebar-parts";

/**
 * El grupo «Proyectos» del sidebar (HU-0023, A-4), bajo «Instancias»: «Todos los proyectos», una fila por proyecto con
 * su inicial de 16 y el número de historias en curso, y «Anclar proyecto». Un proyecto roto lleva la inicial en rojo y
 * un triángulo. Plegado, solo quedan las iniciales, con su tooltip «<nombre> · N en curso». La búsqueda del sidebar sigue
 * filtrando solo instancias.
 */
export function ProjectsSidebarGroup() {
  const { status, projects } = useProjects();
  const { start, busy } = useStartPinProject();
  const onAll = Boolean(useMatch({ path: "/proyectos", end: true }));
  const activeId = useMatch("/proyectos/:projectId")?.params.projectId;
  const sorted = useMemo(() => sortProjects(projects), [projects]);

  return (
    <SidebarGroup className="px-2 py-0">
      <SidebarGroupLabel className={GROUP_LABEL}>Proyectos</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label="Proyectos anclados">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={onAll} tooltip="Todos los proyectos">
              <Link to="/proyectos" aria-current={onAll ? "page" : undefined}>
                <LayoutGridIcon />
                <span>Todos los proyectos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {status !== "ready" && projects.length === 0 ? (
            status !== "error" && [0, 1].map((item) => (
              <SidebarMenuItem key={item}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))
          ) : (
            sorted.map((project) => {
              const name = projectName(project);
              const broken = !isReadable(project);
              const count = inProgressCount(project);
              const active = activeId === project.id;
              const label = broken ? `${name} · ${STATUS_LABEL[project.status]}` : count > 0 ? `${name} · ${count} en curso` : name;
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild isActive={active} tooltip={label} className={count > 0 || broken ? "pr-8" : undefined}>
                    <Link to={`/proyectos/${encodeURIComponent(project.id)}`} aria-current={active ? "page" : undefined}>
                      <ProjectInitial name={name} size="sm" broken={broken} />
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      {broken && <span className="sr-only">{STATUS_LABEL[project.status]}</span>}
                    </Link>
                  </SidebarMenuButton>
                  {broken ? (
                    <TriangleAlertIcon
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-destructive group-data-[collapsible=icon]:hidden"
                    />
                  ) : (
                    count > 0 && <MenuCount count={count} active={active} singular="en curso" plural="en curso" />
                  )}
                </SidebarMenuItem>
              );
            })
          )}
          {status === "ready" && projects.length === 0 && (
            <SidebarMenuItem className="flex h-(--ctl-sm) items-center px-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground group-data-[collapsible=icon]:hidden">
              Sin proyectos todavía
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => void start()} disabled={busy} tooltip="Anclar proyecto" className="text-primary-text hover:text-primary-text">
              <FolderPlusIcon />
              <span>Anclar proyecto</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
