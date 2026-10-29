import { LayoutDashboardIcon, PlusIcon, RefreshCwIcon, SearchIcon, Settings2Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useMatch } from "react-router";
import { BrandMark } from "../../components/BrandMark";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
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
const GROUP_LABEL = "h-auto px-2 pt-3 pb-1.5 text-(length:--fs-micro) font-bold tracking-[0.1em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden";

/**
 * La navegación de la app (HU-0016, AC-01): Dashboard, la aplicación original y una entrada por instancia, con
 * «Nueva instancia», «Escanear sistema» y «Apariencia». Plegado a iconos, cada entrada lleva su tooltip.
 * Es un panel flotante (HU-0019, A-2): `variant="floating"`, con la marca en su cabecera y, junto a cada perfil, el
 * número de sesiones. Se pinta debajo de la barra: el contenedor `fixed` del catálogo empieza en `--titlebar-height`.
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
  const originalSessions = sourceFound ? state.system.originalCodeSessions.length : 0;

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
      variant="floating"
      className="top-(--titlebar-height)! h-auto! *:data-[slot=sidebar-inner]:ring-foreground/10"
      role="navigation"
      aria-label="Navegación principal"
    >
      <SidebarHeader className="gap-2.5 px-2 pt-3.5 pb-0">
        <div className="flex items-center gap-2 px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandMark size={20} className="shrink-0 text-(--primary-soft) in-[.theme-light]:text-primary-text" />
          <span className="truncate text-(length:--fs-title) font-bold tracking-[-0.04em] text-foreground group-data-[collapsible=icon]:hidden">
            Code AI Profiles
          </span>
          <span className="rounded-[5px] border border-(--line-strong) px-1.5 py-0.5 font-mono text-(length:--fs-micro) leading-none font-semibold tracking-[0.12em] text-muted-foreground group-data-[collapsible=icon]:hidden">
            BETA
          </span>
        </div>
        <div className="relative group-data-[collapsible=icon]:hidden">
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
      <SidebarContent className="gap-0 pt-1">
        <SidebarGroup className="px-2 py-0">
          <SidebarGroupLabel className={GROUP_LABEL}>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
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
                  <SidebarMenuButton asChild isActive={Boolean(onOriginal)} tooltip={originalLabel} className={originalSessions > 0 ? "pr-10" : undefined}>
                    <Link to="/original" aria-current={onOriginal ? "page" : undefined}>
                      <InstanceAvatar
                        iconSrc={null}
                        status={sourceFound ? state.system.originalStatus : "missing"}
                        className="size-4"
                      />
                      <span className="min-w-0 flex-1 truncate">{originalName}</span>
                      <span className="sr-only">{sourceFound ? instanceStatusLabel(state.system.originalStatus) : "No detectada"}</span>
                    </Link>
                  </SidebarMenuButton>
                  {originalSessions > 0 && <SessionCount count={originalSessions} active={Boolean(onOriginal)} />}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-auto my-2.5 hidden w-5! bg-(--line-strong) group-data-[collapsible=icon]:block" />
        <SidebarGroup className="px-2 py-0">
          <SidebarGroupLabel className={GROUP_LABEL}>Instancias</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Instancias clonadas" className="gap-0.5">
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
                  const sessions = instance.codeSessions.length;
                  return (
                    <SidebarMenuItem key={instance.id}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label} className={sessions > 0 ? "pr-10" : undefined}>
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
                          <span className="min-w-0 flex-1 truncate">{instance.name}</span>
                          <span className="sr-only">{instanceStatusLabel(instance.status, stopping)}</span>
                        </Link>
                      </SidebarMenuButton>
                      {sessions > 0 && <SessionCount count={sessions} active={active} />}
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

      <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:border-t-0">
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

/**
 * El número de sesiones de un perfil (A-2), a la derecha de su entrada. El mismo dato que ya enseña la página («3 sesiones»):
 * no sale ningún título. Plegado, el catálogo lo oculta.
 */
function SessionCount({ count, active }: { count: number; active: boolean }) {
  return (
    <SidebarMenuBadge
      className={cn(
        "top-1/2! -translate-y-1/2 rounded-full bg-(--surface-soft) px-1.5 font-mono text-(length:--fs-micro) leading-none font-semibold text-muted-foreground",
        active && "bg-(--line-strong) text-foreground",
      )}
    >
      {count}
      <span className="sr-only"> {count === 1 ? "sesión" : "sesiones"}</span>
    </SidebarMenuBadge>
  );
}
