import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Block, Sample } from "../ShowcaseSection";

export default function SpinnerSection() {
  return (
    <>
      <Block title="Variantes (tamaño por className)">
        <Sample label="size-4 (por defecto)">
          <Spinner aria-label="Cargando" />
        </Sample>
        <Sample label="size-6">
          <Spinner className="size-6" aria-label="Cargando" />
        </Sample>
        <Sample label="size-8">
          <Spinner className="size-8" aria-label="Cargando" />
        </Sample>
        <Sample label="color de texto">
          <Spinner className="size-6 text-primary-text" aria-label="Cargando" />
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="dentro de un botón">
          <Button disabled>
            <Spinner data-icon="inline-start" aria-label="Cargando" />
            Analizando
          </Button>
        </Sample>
      </Block>
    </>
  );
}
