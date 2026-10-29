import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Block, Sample } from "../ShowcaseSection";

export default function TextareaSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="por defecto">
          <Textarea className="w-72" placeholder="Escribe una nota de ejemplo" aria-label="Nota" />
        </Sample>
        <Sample label="con valor y filas">
          <Textarea className="w-72" rows={5} defaultValue={"Primera línea de ejemplo\nSegunda línea de ejemplo"} aria-label="Nota con valor" />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <Textarea className="w-72" disabled placeholder="No editable" aria-label="Nota deshabilitada" />
        </Sample>
        <Sample label="aria-invalid">
          <Textarea className="w-72" aria-invalid defaultValue="Contenido con error" aria-label="Nota con error" />
        </Sample>
      </Block>
      <Block title="Composición">
        <Field className="w-72">
          <FieldLabel htmlFor="textarea-campo">Descripción</FieldLabel>
          <Textarea id="textarea-campo" placeholder="Describe el perfil de ejemplo" />
          <FieldDescription>Máximo 200 caracteres.</FieldDescription>
        </Field>
      </Block>
    </>
  );
}
