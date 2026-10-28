import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Block, Sample } from "../ShowcaseSection";

export default function NativeSelectSection() {
  return (
    <>
      <Block title="Variantes (size)">
        <Sample label="default">
          <NativeSelect aria-label="Perfil" className="w-56">
            <NativeSelectOption value="">Elige un perfil</NativeSelectOption>
            <NativeSelectOption value="uno">Perfil uno</NativeSelectOption>
            <NativeSelectOption value="dos">Perfil dos</NativeSelectOption>
          </NativeSelect>
        </Sample>
        <Sample label="sm">
          <NativeSelect size="sm" aria-label="Perfil pequeño" className="w-56">
            <NativeSelectOption value="uno">Perfil uno</NativeSelectOption>
            <NativeSelectOption value="dos">Perfil dos</NativeSelectOption>
          </NativeSelect>
        </Sample>
        <Sample label="con grupos">
          <NativeSelect aria-label="Perfil agrupado" className="w-56">
            <NativeSelectOptGroup label="Estables">
              <NativeSelectOption value="a">Perfil A</NativeSelectOption>
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="Pruebas">
              <NativeSelectOption value="b">Perfil B</NativeSelectOption>
            </NativeSelectOptGroup>
          </NativeSelect>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <NativeSelect disabled aria-label="Perfil deshabilitado" className="w-56">
            <NativeSelectOption>Deshabilitado</NativeSelectOption>
          </NativeSelect>
        </Sample>
        <Sample label="aria-invalid">
          <NativeSelect aria-invalid aria-label="Perfil con error" className="w-56">
            <NativeSelectOption>Con error</NativeSelectOption>
          </NativeSelect>
        </Sample>
      </Block>
      <Block title="Composición">
        <Field className="w-64">
          <FieldLabel htmlFor="native-select-campo">Perfil de destino</FieldLabel>
          <NativeSelect id="native-select-campo">
            <NativeSelectOption value="uno">Perfil uno</NativeSelectOption>
            <NativeSelectOption value="dos">Perfil dos</NativeSelectOption>
          </NativeSelect>
        </Field>
      </Block>
    </>
  );
}
