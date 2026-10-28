import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Block, Sample } from "../ShowcaseSection";

const variants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

export default function BadgeSection() {
  return (
    <>
      <Block title="Variantes">
        {variants.map((variant) => (
          <Sample key={variant} label={variant}>
            <Badge variant={variant}>Etiqueta</Badge>
          </Sample>
        ))}
      </Block>
      <Block title="Estados">
        <Sample label="aria-invalid">
          <Badge aria-invalid variant="outline">
            Con error
          </Badge>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="con icono">
          <Badge variant="secondary">
            <CheckIcon data-icon="inline-start" />
            Activo
          </Badge>
        </Sample>
        <Sample label="asChild (enlace)">
          <Badge asChild>
            <a href="#badge">Enlace</a>
          </Badge>
        </Sample>
      </Block>
    </>
  );
}
