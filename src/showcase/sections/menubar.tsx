import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/components/ui/menubar";
import { Block, Sample } from "../ShowcaseSection";

export default function MenubarSection() {
  return (
    <>
      <Block title="Variantes" className="min-h-64">
        <Sample label="barra de menús">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Archivo</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  Nuevo perfil <MenubarShortcut>⌘N</MenubarShortcut>
                </MenubarItem>
                <MenubarItem disabled>Importar (no disponible)</MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>Exportar</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>Metadatos</MenubarItem>
                    <MenubarItem>Resumen</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Ver</MenubarTrigger>
              <MenubarContent>
                <MenubarCheckboxItem checked>Mostrar barra de estado</MenubarCheckboxItem>
                <MenubarSeparator />
                <MenubarRadioGroup value="claro">
                  <MenubarRadioItem value="claro">Tema claro</MenubarRadioItem>
                  <MenubarRadioItem value="oscuro">Tema oscuro</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </Sample>
      </Block>
    </>
  );
}
