import { LayoutDashboardIcon, PlusIcon, RefreshCwIcon, Settings2Icon } from "lucide-react";
import { Link, useMatch } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "../../components/ui/sidebar";
import { originalAppName as selectOriginalAppName, useDashboard } from "../../features/dashboard";
import { InstanceAvatar, instanceStatusLabel, managedIconSource } from "../../features/instances";
import { useScan } from "../../features/scan";
import { cn } from "../../lib/utils";
import { useDialogs } from "../providers/dialogs-context";

const NO_SOURCE_TITLE = "Instala una aplicación compatible o configura una ruta válida";
/** DESIGN.md: las cabeceras del sidebar, en mayúsculas y con algo de espaciado. */
const GROUP_LABEL = "text-[10px] font-bold tracking-[0.1em] text-(--quiet) uppercase";

/**
 * La navegación de la app (HU-0016, AC-01): Dashboard, la aplicación original y una entrada por instancia, con
 * «Nueva instancia», «Escanear sistema» y «Apariencia». Plegado a iconos, cada entrada lleva su tooltip.
 * Se pinta debajo de la titlebar (A-6): el contenedor `fixed` del catálogo empieza en `--titlebar-height`.
 */
export function AppSidebar() {
  const { dashboard: state, loading, busy, iconPreviews } = useDashboard();
  const { requestManual: scanManually } = useScan();
  const { setAppearanceOpen, setEditor } = useDialogs();
  const onDashboard = useMatch({ path: "/", end: true });
  const onOriginal = useMatch("/original");
  const instanceMatch = useMatch("/instancias/:instanceId");
  const activeInstanceId = instanceMatch?.params.instanceId;
  const sourceFound = Boolean(state.system.sourcePath);
  const originalName = sourceFound ? selectOriginalAppName(state.system) : "Aplicación original";
  const originalLabel = `${originalName} · ${sourceFound ? instanceStatusLabel(state.system.originalStatus) : "No detectada"}`;
  const canCreate = sourceFound && busy === null;

  return (
    <Sidebar
      collapsible="icon"
      className="top-(--titlebar-height)! h-auto!"
      role="navigation"
      aria-label="Navegación principal"
    >
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL}>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={Boolean(onDashboard)} tooltip="Dashboard">
                  <Link to="/" aria-current={onDashboard ? "page" : undefined}>
                    <LayoutDashboardIcon />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={Boolean(onOriginal)} tooltip={originalLabel}>
                  <Link to="/original" aria-current={onOriginal ? "page" : undefined}>
                    <InstanceAvatar
                      iconSrc={null}
                      status={sourceFound ? state.system.originalStatus : "missing"}
                      className="size-4"
                    />
                    <span>{originalName}</span>
                    <span className="sr-only">{sourceFound ? instanceStatusLabel(state.system.originalStatus) : "No detectada"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL}>Instancias</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Instancias clonadas">
              {loading && state.instances.length === 0 ? (
                [0, 1, 2].map((item) => (
                  <SidebarMenuItem key={item}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))
              ) : (
                state.instances.map((instance) => {
                  const stopping = busy === `stop:${instance.id}`;
                  const label = `${instance.name} · ${instanceStatusLabel(instance.status, stopping)}`;
                  const active = activeInstanceId === instance.id;
                  return (
                    <SidebarMenuItem key={instance.id}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link
                          to={`/instancias/${encodeURIComponent(instance.id)}`}
                          aria-current={active ? "page" : undefined}
                        >
                          <InstanceAvatar
                            iconSrc={managedIconSource(instance, iconPreviews[instance.id] ?? null)}
                            status={instance.status}
                            stopping={stopping}
                            className="size-4"
                          />
                          <span>{instance.name}</span>
                          <span className="sr-only">{instanceStatusLabel(instance.status, stopping)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
              {!loading && state.instances.length === 0 && (
                <SidebarMenuItem className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  Sin instancias todavía
                </SidebarMenuItem>
              )}
              {/* El title va en el <li>: un botón deshabilitado no recibe el puntero (AC-06: la razón sigue visible). */}
              <SidebarMenuItem title={!sourceFound ? NO_SOURCE_TITLE : undefined}>
                <SidebarMenuButton
                  onClick={() => setEditor("new")}
                  disabled={!canCreate}
                  tooltip="Nueva instancia"
                  className="text-primary-text hover:text-primary-text"
                >
                  <PlusIcon />
                  <span>Nueva instancia</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={scanManually} disabled={loading || busy !== null} tooltip="Escanear sistema">
              <RefreshCwIcon className={cn(busy === "scan" && "animate-spin")} />
              <span>Escanear sistema</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setAppearanceOpen(true)}
              tooltip="Apariencia"
              aria-label="Configurar apariencia"
            >
              <Settings2Icon />
              <span>Apariencia</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
