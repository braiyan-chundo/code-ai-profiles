import { SidebarMenuBadge } from "../../components/ui/sidebar";
import { cn } from "../../lib/utils";

/** DESIGN.md: las cabeceras del sidebar, en mayúsculas y con algo de espaciado. */
export const GROUP_LABEL = "h-auto px-2 pt-3 pb-1 text-(length:--fs-micro)/(--lh-micro) font-bold tracking-[0.1em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden";

/**
 * El número a la derecha de una entrada (A-2): las sesiones de un perfil o las historias en curso de un proyecto. El
 * mismo dato que enseña su página: no sale ningún título. Plegado, el catálogo lo oculta.
 */
export function MenuCount({ count, active, singular, plural }: { count: number; active: boolean; singular: string; plural: string }) {
  return (
    <SidebarMenuBadge
      className={cn(
        "top-1/2! -translate-y-1/2 rounded-full bg-(--surface-soft) px-2 font-mono text-(length:--fs-micro)/(--lh-small) font-semibold text-muted-foreground",
        active && "bg-(--line-strong) text-foreground",
      )}
    >
      {count}
      <span className="sr-only"> {count === 1 ? singular : plural}</span>
    </SidebarMenuBadge>
  );
}
