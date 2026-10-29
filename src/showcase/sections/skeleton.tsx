import { Skeleton } from "@/components/ui/skeleton";
import { Block, Sample } from "../ShowcaseSection";

export default function SkeletonSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="línea">
          <Skeleton className="h-4 w-56" />
        </Sample>
        <Sample label="círculo">
          <Skeleton className="size-12 rounded-full" />
        </Sample>
        <Sample label="bloque">
          <Skeleton className="h-24 w-56 rounded-xl" />
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="tarjeta cargando">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </Sample>
      </Block>
    </>
  );
}
