import { Skeleton } from "../../components/ui/skeleton";

/** El marcador de una página que aún no tiene datos (primera carga o ruta con un id por resolver). */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="grid gap-4">
      <Skeleton className="h-[108px] rounded-xl" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" style={{ opacity: 1 - index * 0.2 }} />
      ))}
    </div>
  );
}
