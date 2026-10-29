import { ArrowRightIcon, MailIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Block, Sample } from "../ShowcaseSection";

const variants = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;
const sizes = ["xs", "sm", "default", "lg"] as const;
const iconSizes = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const;

export default function ButtonSection() {
  return (
    <>
      <Block title="Variantes">
        {variants.map((variant) => (
          <Sample key={variant} label={variant}>
            <Button variant={variant}>Acción</Button>
          </Sample>
        ))}
      </Block>
      <Block title="Tamaños">
        {sizes.map((size) => (
          <Sample key={size} label={size}>
            <Button size={size}>Acción</Button>
          </Sample>
        ))}
        {iconSizes.map((size) => (
          <Sample key={size} label={size}>
            <Button size={size} variant="outline" aria-label="Añadir perfil de ejemplo">
              <PlusIcon />
            </Button>
          </Sample>
        ))}
      </Block>
      <Block title="Estados">
        <Sample label="disabled">
          <Button disabled>Deshabilitado</Button>
        </Sample>
        <Sample label="aria-invalid">
          <Button variant="outline" aria-invalid>
            Con error
          </Button>
        </Sample>
        <Sample label="cargando">
          <Button disabled>
            <Spinner aria-label="Cargando" data-icon="inline-start" />
            Guardando
          </Button>
        </Sample>
        <Sample label="foco (tabulador)">
          <Button variant="secondary">Pulsa Tab hasta aquí</Button>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="icono al inicio">
          <Button>
            <MailIcon data-icon="inline-start" />
            Enviar
          </Button>
        </Sample>
        <Sample label="icono al final">
          <Button variant="outline">
            Siguiente
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </Sample>
        <Sample label="asChild (enlace)">
          <Button asChild variant="link">
            <a href="#button">Un enlace con aspecto de botón</a>
          </Button>
        </Sample>
      </Block>
    </>
  );
}
