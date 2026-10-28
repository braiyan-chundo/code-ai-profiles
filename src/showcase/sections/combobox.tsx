import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxValue, useComboboxAnchor } from "@/components/ui/combobox";
import { Block, Sample } from "../ShowcaseSection";

const perfiles = ["Perfil de trabajo", "Perfil personal", "Perfil de pruebas", "Perfil de archivo"];

function Multiple() {
  const anchor = useComboboxAnchor();
  return (
    <Combobox multiple items={perfiles} defaultValue={[perfiles[0]]}>
      <ComboboxChips ref={anchor} className="w-72">
        <ComboboxValue>
          {(values: string[]) => (
            <>
              {values.map((value) => (
                <ComboboxChip key={value}>{value}</ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Añadir perfil" aria-label="Añadir perfil" />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export default function ComboboxSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="selección simple">
          <Combobox items={perfiles}>
            <ComboboxInput placeholder="Elige un perfil" className="w-64" aria-label="Perfil" />
            <ComboboxContent>
              <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Sample>
        <Sample label="selección múltiple con chips">
          <Multiple />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <Combobox items={perfiles} disabled>
            <ComboboxInput placeholder="Deshabilitado" className="w-64" aria-label="Perfil deshabilitado" />
            <ComboboxContent>
              <ComboboxList />
            </ComboboxContent>
          </Combobox>
        </Sample>
        <Sample label="con botón de borrar (showClear)">
          <Combobox items={perfiles} defaultValue={perfiles[1]}>
            <ComboboxInput showClear className="w-64" aria-label="Perfil con borrado" />
            <ComboboxContent>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Sample>
      </Block>
    </>
  );
}
