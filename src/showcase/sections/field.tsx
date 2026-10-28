import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Block } from "../ShowcaseSection";

export default function FieldSection() {
  return (
    <>
      <Block title="Variantes (orientation)" className="flex-col">
        <Field className="w-72">
          <FieldLabel htmlFor="campo-vertical">Nombre del perfil</FieldLabel>
          <Input id="campo-vertical" placeholder="Perfil de ejemplo" />
          <FieldDescription>Orientación vertical, la de siempre.</FieldDescription>
        </Field>
        <Field orientation="horizontal" className="w-72">
          <Checkbox id="campo-horizontal" />
          <FieldLabel htmlFor="campo-horizontal">Orientación horizontal</FieldLabel>
        </Field>
        <Field orientation="responsive" className="w-96">
          <FieldContent>
            <FieldLabel htmlFor="campo-responsive">Responsive</FieldLabel>
            <FieldDescription>Se apila en un contenedor estrecho.</FieldDescription>
          </FieldContent>
          <Input id="campo-responsive" placeholder="Valor" />
        </Field>
      </Block>
      <Block title="Estados" className="items-stretch">
        <Field data-invalid className="w-72">
          <FieldLabel htmlFor="campo-error">Correo de ejemplo</FieldLabel>
          <Input id="campo-error" aria-invalid defaultValue="no-es-un-correo" />
          <FieldError>Escribe un correo válido.</FieldError>
        </Field>
        <Field data-disabled className="w-72">
          <FieldLabel htmlFor="campo-off">Deshabilitado</FieldLabel>
          <Input id="campo-off" disabled placeholder="No editable" />
        </Field>
      </Block>
      <Block title="Composición" className="items-stretch">
        <FieldSet className="w-96">
          <FieldLegend>Ajustes de ejemplo</FieldLegend>
          <FieldDescription>Un conjunto de campos agrupados.</FieldDescription>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Notificaciones</FieldTitle>
                <FieldDescription>Avisos dentro de la app.</FieldDescription>
              </FieldContent>
              <Switch aria-label="Notificaciones" />
            </Field>
            <FieldSeparator>o</FieldSeparator>
            <RadioGroup defaultValue="a">
              <Field orientation="horizontal">
                <RadioGroupItem value="a" id="campo-r1" />
                <FieldLabel htmlFor="campo-r1">Opción A</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem value="b" id="campo-r2" />
                <FieldLabel htmlFor="campo-r2">Opción B</FieldLabel>
              </Field>
            </RadioGroup>
          </FieldGroup>
        </FieldSet>
      </Block>
    </>
  );
}
