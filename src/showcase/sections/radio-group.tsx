import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Block, Sample } from "../ShowcaseSection";

export default function RadioGroupSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="vertical">
          <RadioGroup defaultValue="uno" aria-label="Opciones verticales">
            {["uno", "dos", "tres"].map((value) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`radio-v-${value}`} />
                <Label htmlFor={`radio-v-${value}`}>Opción {value}</Label>
              </div>
            ))}
          </RadioGroup>
        </Sample>
        <Sample label="horizontal (className)">
          <RadioGroup defaultValue="a" className="flex gap-4" aria-label="Opciones horizontales">
            {["a", "b"].map((value) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`radio-h-${value}`} />
                <Label htmlFor={`radio-h-${value}`}>Opción {value}</Label>
              </div>
            ))}
          </RadioGroup>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <RadioGroup defaultValue="a" disabled aria-label="Opciones deshabilitadas">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="radio-d-a" />
              <Label htmlFor="radio-d-a">Seleccionada y deshabilitada</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="radio-d-b" />
              <Label htmlFor="radio-d-b">Deshabilitada</Label>
            </div>
          </RadioGroup>
        </Sample>
        <Sample label="aria-invalid">
          <RadioGroup aria-label="Opciones con error">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="radio-e-a" aria-invalid />
              <Label htmlFor="radio-e-a">Con error</Label>
            </div>
          </RadioGroup>
        </Sample>
      </Block>
      <Block title="Composición">
        <RadioGroup defaultValue="a" className="w-72">
          <Field orientation="horizontal">
            <RadioGroupItem value="a" id="radio-f-a" />
            <FieldLabel htmlFor="radio-f-a">Dentro de un Field</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="b" id="radio-f-b" />
            <FieldLabel htmlFor="radio-f-b">Otra opción</FieldLabel>
          </Field>
        </RadioGroup>
      </Block>
    </>
  );
}
