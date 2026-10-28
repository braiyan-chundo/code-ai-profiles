import { BoldIcon, ItalicIcon } from "lucide-react";
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Block, Sample } from "../ShowcaseSection";

export default function ToggleSection() {
  const [pressed, setPressed] = useState(true);
  return (
    <>
      <Block title="Variantes">
        <Sample label="default">
          <Toggle aria-label="Negrita">
            <BoldIcon />
          </Toggle>
        </Sample>
        <Sample label="outline">
          <Toggle variant="outline" aria-label="Cursiva">
            <ItalicIcon />
          </Toggle>
        </Sample>
      </Block>
      <Block title="Tamaños">
        {(["sm", "default", "lg"] as const).map((size) => (
          <Sample key={size} label={size}>
            <Toggle variant="outline" size={size}>
              Etiqueta
            </Toggle>
          </Sample>
        ))}
      </Block>
      <Block title="Estados">
        <Sample label="controlado (pulsado)">
          <Toggle variant="outline" pressed={pressed} onPressedChange={setPressed}>
            {pressed ? "Activado" : "Desactivado"}
          </Toggle>
        </Sample>
        <Sample label="deshabilitado">
          <Toggle variant="outline" disabled>
            Deshabilitado
          </Toggle>
        </Sample>
        <Sample label="aria-invalid">
          <Toggle variant="outline" aria-invalid>
            Con error
          </Toggle>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="icono y texto">
          <Toggle variant="outline">
            <BoldIcon data-icon="inline-start" />
            Negrita
          </Toggle>
        </Sample>
      </Block>
    </>
  );
}
