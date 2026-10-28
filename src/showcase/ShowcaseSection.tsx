import type { ReactNode } from "react";
import { cn } from "cn";

type ShowcaseSectionProps = {
  id: string;
  name: string;
  description: string;
  children: ReactNode;
};

/** El marco común de una sección: nombre, para qué sirve, ruta de la ficha y sus bloques. */
export function ShowcaseSection({ id, name, description, children }: ShowcaseSectionProps) {
  return (
    <section id={id} className="scroll-mt-6 border-b border-border py-8 first:pt-0">
      <header className="mb-5 flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{name}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="font-mono text-xs text-muted-foreground/80">
          Ficha: .claude/skills/code-ai-profiles-ui/componentes/{id}.md
        </p>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

/** Un bloque de la sección: Variantes, Estados o Composición. */
export function Block({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className={cn("flex flex-wrap items-start gap-3", className)}>{children}</div>
    </div>
  );
}

/** Una pieza con su etiqueta, para listar variantes y estados. */
export function Sample({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      {children}
      {label ? <span className="font-mono text-[11px] text-muted-foreground">{label}</span> : null}
    </div>
  );
}
