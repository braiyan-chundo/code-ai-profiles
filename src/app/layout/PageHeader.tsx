import type { ReactNode } from "react";

/**
 * La barra de una página (fila 1 de `SidebarInset`; la 2 es `FeedbackArea`): un antetítulo, el título y, a la derecha, sus acciones. Cada ruta
 * pinta esta barra y su `PageContent` sin envoltorio.
 */
export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="row-start-1 flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-3 px-[38px] pt-6 pb-3 max-[1070px]:px-[25px]">
      <div className="min-w-0">
        <p className="m-0 text-[9px] font-bold tracking-[0.1em] text-(--quiet) uppercase">{eyebrow}</p>
        <h1 className="m-0 mt-1.5 truncate text-[22px] font-semibold tracking-[-0.035em] text-foreground">{title}</h1>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
