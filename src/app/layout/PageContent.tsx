import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/** El cuerpo de una página (fila 2 de `SidebarInset`): la zona que se desplaza, con los márgenes de la app. */
export function PageContent({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "relative min-h-0 overflow-x-hidden overflow-y-auto px-[38px] pt-2.5 pb-[34px] max-[1070px]:px-[25px]",
        "[scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin]",
        className,
      )}
      {...props}
    />
  );
}
