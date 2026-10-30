import { Badge } from "../../components/ui/badge";

/** «Sin tiempo» o «Sin métricas»: lo que falta, con borde discontinuo y texto gris (falta, pero no es un error). */
export function GapTag({ children }: { children: string }) {
  return (
    <Badge variant="outline" className="rounded-full border-dashed font-normal text-muted-foreground">{children}</Badge>
  );
}
