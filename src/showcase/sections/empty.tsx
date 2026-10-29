import { FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Block, Sample } from "../ShowcaseSection";

export default function EmptySection() {
  return (
    <>
      <Block title="Variantes (EmptyMedia)" className="items-stretch">
        <Sample label="icono">
          <Empty className="w-80 border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderIcon />
              </EmptyMedia>
              <EmptyTitle>Sin perfiles de ejemplo</EmptyTitle>
              <EmptyDescription>Aquí aparecerán cuando existan.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Sample>
        <Sample label="sin icono">
          <Empty className="w-80 border border-dashed border-border">
            <EmptyHeader>
              <EmptyTitle>Nada que mostrar</EmptyTitle>
              <EmptyDescription>Texto de apoyo de ejemplo.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Sample>
      </Block>
      <Block title="Composición" className="items-stretch">
        <Empty className="w-96 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderIcon />
            </EmptyMedia>
            <EmptyTitle>Sin sesiones de ejemplo</EmptyTitle>
            <EmptyDescription>Con una acción para continuar.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>Crear perfil</Button>
          </EmptyContent>
        </Empty>
      </Block>
    </>
  );
}
