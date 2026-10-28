import { useEffect, useMemo, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipProvider } from "@/components/ui/tooltip";
import { catalog, groups } from "./catalog";
import { ShowcaseSection } from "./ShowcaseSection";

type Theme = "dark" | "light";

/** Disposición del showcase: barra lateral fija con tema, buscador e índice, y un <main> con scroll. */
export default function Showcase() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [query, setQuery] = useState("");

  // A-9: la clase va en <html> para que los portales de Radix (que cuelgan de <body>) hereden el tema.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog.filter((entry) => `${entry.name} ${entry.id}`.toLowerCase().includes(needle));
  }, [query]);

  return (
    <TooltipProvider>
      <div className="grid h-full grid-cols-[240px_1fr] bg-background text-foreground">
        <aside className="flex min-h-0 flex-col gap-4 border-r border-border p-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-semibold tracking-tight">Showcase</h1>
            <p className="text-xs text-muted-foreground">Code AI Profiles · {catalog.length} componentes</p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={theme}
            onValueChange={(value) => {
              if (value === "dark" || value === "light") setTheme(value);
            }}
            aria-label="Tema del showcase"
            className="w-full"
          >
            <ToggleGroupItem value="dark" className="flex-1">
              <MoonIcon data-icon="inline-start" />
              Oscuro
            </ToggleGroupItem>
            <ToggleGroupItem value="light" className="flex-1">
              <SunIcon data-icon="inline-start" />
              Claro
            </ToggleGroupItem>
          </ToggleGroup>
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar componente" aria-label="Buscar componente" />
          <ScrollArea className="min-h-0 flex-1">
            <nav aria-label="Índice de componentes" className="flex flex-col gap-4 pr-3">
              {groups.map((group) => {
                const entries = visible.filter((entry) => entry.group === group);
                if (entries.length === 0) return null;
                return (
                  <div key={group} className="flex flex-col gap-1">
                    <h2 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group}</h2>
                    {entries.map((entry) => (
                      <a
                        key={entry.id}
                        href={`#${entry.id}`}
                        className="rounded-md px-2 py-1 text-sm text-foreground outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {entry.name}
                      </a>
                    ))}
                  </div>
                );
              })}
              {visible.length === 0 ? <p className="text-sm text-muted-foreground">Ningún componente coincide.</p> : null}
            </nav>
          </ScrollArea>
        </aside>
        <main className="min-h-0 overflow-y-auto scroll-smooth px-10 py-8">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <h2 className="mb-6 text-xs font-medium tracking-widest text-primary-text uppercase">{group}</h2>
              {catalog
                .filter((entry) => entry.group === group)
                .map(({ id, name, description, Section }) => (
                  <ShowcaseSection key={id} id={id} name={name} description={description}>
                    <Section />
                  </ShowcaseSection>
                ))}
            </div>
          ))}
        </main>
      </div>
      <Toaster theme={theme} />
    </TooltipProvider>
  );
}
