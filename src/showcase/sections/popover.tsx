import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Block, Sample } from "../ShowcaseSection";

export default function PopoverSection() {
  return (
    <>
      <Block title="Variantes (align y side)" className="min-h-48">
        {(["start", "center", "end"] as const).map((align) => (
          <Sample key={align} label={`align="${align}"`}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Abrir {align}</Button>
              </PopoverTrigger>
              <PopoverContent align={align}>
                <PopoverHeader>
                  <PopoverTitle>Detalle de ejemplo</PopoverTitle>
                  <PopoverDescription>Contenido inventado.</PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          </Sample>
        ))}
        <Sample label="side=&quot;right&quot;">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Abrir a la derecha</Button>
            </PopoverTrigger>
            <PopoverContent side="right">
              <PopoverHeader>
                <PopoverTitle>A la derecha</PopoverTitle>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </Sample>
      </Block>
      <Block title="Composición">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Con formulario</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <Field>
              <FieldLabel htmlFor="popover-nombre">Nombre</FieldLabel>
              <Input id="popover-nombre" defaultValue="Perfil de ejemplo" />
            </Field>
          </PopoverContent>
        </Popover>
      </Block>
    </>
  );
}
