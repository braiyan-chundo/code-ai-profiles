import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Block, Sample } from "../ShowcaseSection";

export default function LabelSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="con input">
          <Label htmlFor="etiqueta-1">Nombre del perfil</Label>
          <Input id="etiqueta-1" className="w-64" placeholder="Perfil de ejemplo" />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="grupo deshabilitado (group/field)">
          <div className="flex items-center gap-2" data-disabled="true">
            <Checkbox id="etiqueta-2" disabled />
            <Label htmlFor="etiqueta-2">Opción deshabilitada</Label>
          </div>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="con checkbox">
          <div className="flex items-center gap-2">
            <Checkbox id="etiqueta-3" />
            <Label htmlFor="etiqueta-3">Acepto los términos de ejemplo</Label>
          </div>
        </Sample>
      </Block>
    </>
  );
}
