import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Block, Sample } from "../ShowcaseSection";

export default function CheckboxSection() {
  const [checked, setChecked] = useState<boolean | "indeterminate">("indeterminate");
  return (
    <>
      <Block title="Variantes">
        <Sample label="sin marcar">
          <Checkbox aria-label="Sin marcar" />
        </Sample>
        <Sample label="marcado">
          <Checkbox defaultChecked aria-label="Marcado" />
        </Sample>
        <Sample label="indeterminado (controlado)">
          <Checkbox checked={checked} onCheckedChange={setChecked} aria-label="Indeterminado" />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <Checkbox disabled aria-label="Deshabilitado" />
        </Sample>
        <Sample label="deshabilitado y marcado">
          <Checkbox disabled defaultChecked aria-label="Deshabilitado y marcado" />
        </Sample>
        <Sample label="aria-invalid">
          <Checkbox aria-invalid aria-label="Con error" />
        </Sample>
      </Block>
      <Block title="Composición">
        <Field orientation="horizontal" className="w-80">
          <Checkbox id="checkbox-campo" defaultChecked />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="checkbox-campo">Recordar la elección</FieldLabel>
            <FieldDescription>Texto de apoyo de ejemplo.</FieldDescription>
          </div>
        </Field>
      </Block>
    </>
  );
}
