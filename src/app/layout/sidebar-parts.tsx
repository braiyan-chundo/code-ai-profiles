import { SidebarMenuBadge } from "../../components/ui/sidebar";
import { cn } from "../../lib/utils";

/** DESIGN.md: las cabeceras del sidebar, en mayúsculas y con algo de espaciado. */
export const GROUP_LABEL = "h-auto px-2 pt-3 pb-1 text-(length:--fs-micro)/(--lh-micro) font-bold tracking-[0.1em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden";

/**
 * El número a la derecha de una entrada (A-2): las sesiones de un perfil o las historias en curso de un proyecto. El
 * mismo dato que enseña su página: no sale ningún título. Plegado, el catálogo lo oculta.
 *
 * Con `yieldToAction` (HU-0026, A-3) cede su caja al botón «Abrir»/«Detener» de la fila: se oculta al pasar el ratón o
 * con el foco dentro de la fila, y siempre con `pending` (la operación de esa instancia en curso).
 */
export function MenuCount({
  count,
  active,
  singular,
  plural,
  yieldToAction = false,
  pending = false,
}: {
  count: number;
  active: boolean;
  singular: string;
  plural: string;
  yieldToAction?: boolean;
  pending?: boolean;
}) {
  return (
    <SidebarMenuBadge
      className={cn(
        "top-1/2! -translate-y-1/2 rounded-full bg-(--surface-soft) px-2 font-mono text-(length:--fs-micro)/(--lh-small) font-semibold text-muted-foreground",
        active && "bg-(--line-strong) text-foreground",
        yieldToAction && "group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-0",
        yieldToAction && pending && "opacity-0",
      )}
    >
      {count}
      <span className="sr-only"> {count === 1 ? singular : plural}</span>
    </SidebarMenuBadge>
  );
}
