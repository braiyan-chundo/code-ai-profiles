import { PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { BrandMark } from "./BrandMark";

/** Lo que se ve cuando no hay nada que mostrar: sin coincidencias, sin aplicación compatible o sin instancias. */
export function EmptyState({
  searching,
  sourceFound,
  onCreate,
  onClear,
  onScan,
}: {
  searching: boolean;
  sourceFound: boolean;
  onCreate: () => void;
  onClear: () => void;
  onScan: () => void;
}) {
  if (searching) {
    return (
      <Empty className="rounded-xl border border-dashed bg-(--surface-soft)">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SearchIcon /></EmptyMedia>
          <EmptyTitle>Sin coincidencias</EmptyTitle>
          <EmptyDescription>No hay perfiles que coincidan con la búsqueda actual.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClear}>Limpiar búsqueda</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="rounded-xl border border-dashed bg-(--surface-soft)">
      <EmptyHeader>
        <EmptyMedia variant="icon"><BrandMark /></EmptyMedia>
        <EmptyTitle>{sourceFound ? "Crea tu primer perfil aislado" : "No se detectó una aplicación compatible"}</EmptyTitle>
        <EmptyDescription>
          {sourceFound
            ? "Code AI Profiles creará una copia administrada y un directorio de datos independiente. Cada perfil podrá iniciar sesión con una cuenta distinta."
            : "Instala una aplicación compatible y vuelve a escanear el sistema."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {sourceFound ? (
          <Button size="lg" onClick={onCreate} className="px-4"><PlusIcon /> Nueva instancia</Button>
        ) : (
          <Button variant="outline" size="lg" onClick={onScan} className="px-4"><RefreshCwIcon /> Escanear de nuevo</Button>
        )}
      </EmptyContent>
    </Empty>
  );
}
