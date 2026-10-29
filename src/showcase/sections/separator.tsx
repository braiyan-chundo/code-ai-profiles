import { Separator } from "@/components/ui/separator";
import { Block, Sample } from "../ShowcaseSection";

export default function SeparatorSection() {
  return (
    <>
      <Block title="Variantes (orientation)">
        <Sample label="horizontal">
          <div className="w-64">
            <p className="text-sm">Perfil de ejemplo</p>
            <Separator className="my-3" />
            <p className="text-sm text-muted-foreground">Texto de muestra bajo la línea.</p>
          </div>
        </Sample>
        <Sample label="vertical">
          <div className="flex h-6 items-center gap-3 text-sm">
            <span>Uno</span>
            <Separator orientation="vertical" />
            <span>Dos</span>
            <Separator orientation="vertical" />
            <span>Tres</span>
          </div>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="decorativo (por defecto) frente a semántico">
          <div className="w-64">
            <Separator decorative={false} aria-label="Separador semántico" />
          </div>
        </Sample>
      </Block>
    </>
  );
}
