import { ShieldCheckIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../components/ui/empty";
import { bridge } from "../../lib/bridge";
import { useDashboard, useRuntimePlatform } from "../dashboard";
import { selectProtectedProjects, useProjects } from "../projects";
import { PermissionCard } from "./PermissionCard";
import {
  EMPTY_PLATFORM_TEXT,
  EMPTY_PLATFORM_TITLE,
  MAC_FOOTNOTE,
  MAC_INTRO_LEAD,
  MAC_INTRO_STRONG,
  permissionCards,
  type AdminState,
} from "./permission-cards";

/** Archivos y carpetas depende de Proyectos: desde HU-0023 existe `#/proyectos` y la tarjeta se muestra (A-3.4). */
const PROJECTS_AVAILABLE = true;

/** ¿Alguna instancia necesita un permiso? Lo usa la pestaña Permisos para su punto. No depende de la cuenta. */
export function usePermissionsAttention(): boolean {
  const { dashboard } = useDashboard();
  const { projects } = useProjects();
  const platform = useRuntimePlatform();
  return useMemo(
    () => permissionCards({
      platform,
      instances: dashboard.instances,
      admin: null,
      projectsAvailable: PROJECTS_AVAILABLE,
      protectedProjects: selectProtectedProjects(projects),
    }).attention,
    [dashboard.instances, platform, projects],
  );
}

/**
 * Configuración › Permisos (HU-0022, A-3). macOS: las tarjetas, todas opcionales. Windows y Linux: un estado vacío.
 * Entrar aquí no pide nada al sistema (AC-05): solo `accountFacts()` (un `id -Gn`), una vez y solo en macOS.
 */
export function PermissionsSettings() {
  const { dashboard } = useDashboard();
  const { projects } = useProjects();
  const platform = useRuntimePlatform();
  const [admin, setAdmin] = useState<AdminState>("loading");

  useEffect(() => {
    if (platform !== "macos") return;
    let current = true;
    bridge.accountFacts().then(
      (facts) => { if (current) setAdmin(facts.admin); },
      () => { if (current) setAdmin(null); },
    );
    return () => { current = false; };
  }, [platform]);

  const { cards } = useMemo(
    () => permissionCards({
      platform,
      instances: dashboard.instances,
      admin,
      projectsAvailable: PROJECTS_AVAILABLE,
      protectedProjects: selectProtectedProjects(projects),
    }),
    [admin, dashboard.instances, platform, projects],
  );

  if (platform !== "macos") {
    return (
      <Empty aria-label="Permisos" className="gap-3 rounded-lg px-6 py-12 outline-1 -outline-offset-1 outline-dashed outline-(color:--line-strong)">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="rounded-md text-success ring-1 ring-(--line) ring-inset">
            <ShieldCheckIcon aria-hidden="true" className="size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">{EMPTY_PLATFORM_TITLE}</EmptyTitle>
          <EmptyDescription className="text-(length:--fs-small)/(--lh-prose)">{EMPTY_PLATFORM_TEXT}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-(length:--fs-small)/(--lh-prose) text-muted-foreground">
        {MAC_INTRO_LEAD} <b className="font-medium text-foreground">{MAC_INTRO_STRONG}</b>
      </p>
      <div className="grid gap-4">
        {cards.map((card) => <PermissionCard key={card.id} card={card} />)}
      </div>
      <p className="flex items-center gap-2 px-4 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
        <ShieldCheckIcon aria-hidden="true" className="size-4 shrink-0" />
        {MAC_FOOTNOTE}
      </p>
    </div>
  );
}
