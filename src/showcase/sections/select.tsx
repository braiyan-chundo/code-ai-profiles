import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Block, Sample } from "../ShowcaseSection";

function Opciones() {
  return (
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Perfiles de ejemplo</SelectLabel>
        <SelectItem value="uno">Perfil uno</SelectItem>
        <SelectItem value="dos">Perfil dos</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Otros</SelectLabel>
        <SelectItem value="tres">Perfil tres</SelectItem>
        <SelectItem value="cuatro" disabled>
          Perfil cuatro (no disponible)
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  );
}

export default function SelectSection() {
  return (
    <>
      <Block title="Variantes (size del trigger)">
        <Sample label="default">
          <Select defaultValue="uno">
            <SelectTrigger className="w-56" aria-label="Perfil">
              <SelectValue placeholder="Elige un perfil" />
            </SelectTrigger>
            <Opciones />
          </Select>
        </Sample>
        <Sample label="sm">
          <Select>
            <SelectTrigger size="sm" className="w-56" aria-label="Perfil pequeño">
              <SelectValue placeholder="Elige un perfil" />
            </SelectTrigger>
            <Opciones />
          </Select>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <Select disabled>
            <SelectTrigger className="w-56" aria-label="Perfil deshabilitado">
              <SelectValue placeholder="Deshabilitado" />
            </SelectTrigger>
            <Opciones />
          </Select>
        </Sample>
        <Sample label="aria-invalid">
          <Select>
            <SelectTrigger className="w-56" aria-invalid aria-label="Perfil con error">
              <SelectValue placeholder="Con error" />
            </SelectTrigger>
            <Opciones />
          </Select>
        </Sample>
      </Block>
      <Block title="Composición">
        <Field className="w-64">
          <FieldLabel htmlFor="select-campo">Perfil de destino</FieldLabel>
          <Select>
            <SelectTrigger id="select-campo" className="w-full">
              <SelectValue placeholder="Elige un perfil" />
            </SelectTrigger>
            <Opciones />
          </Select>
        </Field>
      </Block>
    </>
  );
}
