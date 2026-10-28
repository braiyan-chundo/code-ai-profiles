import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Block, Sample } from "../ShowcaseSection";

export default function InputSection() {
  return (
    <>
      <Block title="Variantes">
        {(["text", "email", "password", "number", "search", "file"] as const).map((type) => (
          <Sample key={type} label={`type="${type}"`}>
            <Input type={type} className="w-56" placeholder={type === "file" ? undefined : "Valor de ejemplo"} aria-label={`Campo ${type}`} />
          </Sample>
        ))}
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <Input disabled className="w-56" placeholder="No editable" aria-label="Campo deshabilitado" />
        </Sample>
        <Sample label="aria-invalid">
          <Input aria-invalid className="w-56" defaultValue="Valor inválido" aria-label="Campo con error" />
        </Sample>
        <Sample label="solo lectura">
          <Input readOnly className="w-56" defaultValue="Solo lectura" aria-label="Campo de solo lectura" />
        </Sample>
        <Sample label="foco (tabulador)">
          <Input className="w-56" placeholder="Pulsa Tab hasta aquí" aria-label="Campo para probar el foco" />
        </Sample>
      </Block>
      <Block title="Composición">
        <Field className="w-64">
          <FieldLabel htmlFor="input-compuesto">Etiqueta</FieldLabel>
          <Input id="input-compuesto" placeholder="Dentro de un Field" />
        </Field>
      </Block>
    </>
  );
}
