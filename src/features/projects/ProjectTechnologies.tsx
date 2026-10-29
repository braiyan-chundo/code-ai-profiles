import { FileSearchIcon, LayersIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import type { ProjectInfo } from "../../types";
import { EYEBROW } from "./projects-styles";
import { technologyGroups, technologySources } from "./projects-selectors";

/** Tecnologías del proyecto agrupadas (D-2), con la frase que dice de qué archivos salen. */
export function ProjectTechnologies({ info, className }: { info: ProjectInfo; className?: string }) {
  const groups = technologyGroups(info.technologies);
  return (
    <Card aria-label="Tecnologías" className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-(length:--fs-heading)/(--lh-heading) font-semibold">
          <LayersIcon aria-hidden="true" className="size-5 text-muted-foreground" /> Tecnologías
        </CardTitle>
      </CardHeader>
      <CardContent className="gap-4">
        {groups.length === 0 ? (
          <p className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">No se detectaron tecnologías en los manifiestos ni en la config.</p>
        ) : (
          <dl className="m-0 grid gap-3">
            {groups.map((group) => (
              <div key={group.id} className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-2">
                <dt className={cn(EYEBROW, "pt-1")}>{group.label}</dt>
                <dd className="m-0 flex flex-wrap gap-2">
                  {group.items.map((chip) => (
                    <Badge
                      key={chip.label}
                      variant="outline"
                      className={cn(
                        "bg-(--surface-soft)",
                        chip.pack
                          ? "font-mono text-(length:--fs-micro)/(--lh-micro) text-muted-foreground"
                          : "text-(length:--fs-small)/(--lh-small)",
                      )}
                    >
                      {chip.label}
                    </Badge>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="flex items-center gap-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
          <FileSearchIcon aria-hidden="true" className="size-4 shrink-0" />
          {technologySources(info)}
        </p>
      </CardContent>
    </Card>
  );
}
