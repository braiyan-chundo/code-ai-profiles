import type { ReactNode } from "react";

/** La barra de una página (fila 1 de `SidebarInset`): un antetítulo y el título. Las páginas de E2 la rehacen. */
export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex min-w-0 items-end justify-between gap-4 px-[38px] pt-6 pb-3 max-[1070px]:px-[25px]">
      <div className="min-w-0">
        <p className="m-0 text-[9px] font-bold tracking-[0.1em] text-(--quiet) uppercase">{eyebrow}</p>
        <h1 className="m-0 mt-1.5 truncate text-[22px] font-semibold tracking-[-0.035em] text-foreground">{title}</h1>
      </div>
      {children}
    </header>
  );
}
