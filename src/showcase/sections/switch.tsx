import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Block, Sample } from "../ShowcaseSection";

export default function SwitchSection() {
  const [on, setOn] = useState(true);
  return (
    <>
      <Block title="Variantes (size)">
        <Sample label="default">
          <Switch aria-label="Interruptor por defecto" />
        </Sample>
        <Sample label="sm">
          <Switch size="sm" aria-label="Interruptor pequeño" />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="controlado">
          <Switch checked={on} onCheckedChange={setOn} aria-label="Interruptor controlado" />
        </Sample>
        <Sample label="deshabilitado">
          <Switch disabled aria-label="Interruptor deshabilitado" />
        </Sample>
        <Sample label="deshabilitado y activo">
          <Switch disabled defaultChecked aria-label="Interruptor deshabilitado y activo" />
        </Sample>
        <Sample label="aria-invalid">
          <Switch aria-invalid aria-label="Interruptor con error" />
        </Sample>
      </Block>
      <Block title="Composición">
        <Field orientation="horizontal" className="w-80">
          <div className="flex flex-1 flex-col gap-1">
            <FieldLabel htmlFor="switch-campo">Avisos del sistema</FieldLabel>
            <FieldDescription>Texto de apoyo de ejemplo.</FieldDescription>
          </div>
          <Switch id="switch-campo" />
        </Field>
      </Block>
    </>
  );
}
