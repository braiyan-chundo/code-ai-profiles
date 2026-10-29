import { LayoutDashboardIcon, PlusIcon, RefreshCwIcon, SearchIcon, Settings2Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useMatch } from "react-router";
import { Button } from "../../components/ui/button";
import { Kbd } from "../../components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "../../components/ui/sidebar";
import {
  filterInstances,
  matchesOriginalApp,
  originalAppName as selectOriginalAppName,
  useDashboard,
} from "../../features/dashboard";
import { InstanceAvatar, instanceStatusLabel, managedIconSource } from "../../features/instances";
import { useScan } from "../../features/scan";
import { shortcutModifierLabel } from "../../lib/platform";
import { cn } from "../../lib/utils";
import { useDialogs } from "../providers/dialogs-context";

const NO_SOURCE_TITLE = "Instala una aplicación compatible o configura una ruta válida";
/** DESIGN.md: las cabeceras del sidebar, en mayúsculas y con algo de espaciado. */
const GROUP_LABEL = "text-(length:--fs-micro) font-bold tracking-[0.1em] text-muted-foreground uppercase";

/**
 * La navegación de la app (HU-0016, AC-01): Dashboard, la aplicación original y una entrada por instancia, con
 * «Nueva instancia», «Escanear sistema» y «Apariencia». Plegado a iconos, cada entrada lleva su tooltip.
 * Se pinta debajo de la titlebar (A-6): el contenedor `fixed` del catálogo empieza en `--titlebar-height`.
 *
 * La búsqueda (A-11) filtra las entradas con `filterInstances` y `matchesOriginalApp`. Ctrl/⌘ F la enfoca y, si el
 * sidebar está plegado, lo despliega antes. Plegado no filtra: la búsqueda no se ve.
 */
export function AppSidebar() {
  const { dashboard: state, loading, busy, iconPreviews } = useDashboard();
  const { requestManual: scanManually } = useScan();
  const { setAppearanceOpen, setEditor } = useDialogs();
  const onDashboard = useMatch({ path: "/", end: true });
  const onOriginal = useMatch("/original");
  const instanceMatch = useMatch("/instancias/:instanceId");
  const activeInstanceId = instanceMatch?.params.instanceId;
  const { state: sidebarState, setOpen } = useSidebar();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sourceFound = Boolean(state.system.sourcePath);
  const originalName = sourceFound ? selectOriginalAppName(state.system) : "Aplicación original";
  const term = sidebarState === "expanded" ? query : "";
  const instances = useMemo(() => filterInstances(state.instances, term), [state.instances, term]);
  const showOriginal = term === "" || matchesOriginalApp(state.system, selectOriginalAppName(state.system), term);
  const noMatches = term !== "" && !showOriginal && instances.length === 0;
  const originalLabel = `${originalName} · ${sourceFound ? instanceStatusLabel(state.system.originalStatus) : "No detectada"}`;
  const canCreate = sourceFound && busy === null;

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (sidebarState === "collapsed") setOpen(true);
        // Plegado, el campo no se ve hasta el siguiente pintado: se enfoca después de desplegar.
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [sidebarState, setOpen]);

  return (
    <Sidebar
      collapsible="icon"
      className="top-(--titlebar-height)! h-auto!"
      role="navigation"
      aria-label="Navegación principal"
    >
      <SidebarHeader className="px-2 pt-3 pb-0 group-data-[collapsible=icon]:hidden">
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <SidebarInput
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar perfiles…"
            aria-label="Buscar perfiles o sesiones"
            className="pr-12 pl-8 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
            >
              <XIcon />
            </Button>
          ) : (
            <Kbd className="absolute top-1/2 right-2 -translate-y-1/2 text-(length:--fs-micro)">{shortcutModifierLabel(navigator.platform)} F</Kbd>
          )}
        </div>
      </SidebarHeader>
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
              {showOriginal && (
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
              )}
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
                instances.map((instance) => {
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
              {noMatches && (
                <SidebarMenuItem className="grid gap-1 px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  <span role="status">Sin coincidencias</span>
                  <Button variant="link" size="xs" onClick={() => setQuery("")} className="h-auto justify-start p-0 text-xs">
                    Limpiar búsqueda
                  </Button>
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
