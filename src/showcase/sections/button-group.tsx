import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Block, Sample } from "../ShowcaseSection";

export default function ButtonGroupSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="horizontal">
          <ButtonGroup>
            <Button variant="outline">Anterior</Button>
            <Button variant="outline">Actual</Button>
            <Button variant="outline">Siguiente</Button>
          </ButtonGroup>
        </Sample>
        <Sample label="vertical">
          <ButtonGroup orientation="vertical" aria-label="Acciones de ejemplo">
            <Button variant="outline">Arriba</Button>
            <Button variant="outline">Centro</Button>
            <Button variant="outline">Abajo</Button>
          </ButtonGroup>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <ButtonGroup>
            <Button variant="outline" disabled>
              Uno
            </Button>
            <Button variant="outline" disabled>
              Dos
            </Button>
          </ButtonGroup>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="con texto y separador">
          <ButtonGroup>
            <ButtonGroupText>Perfil de ejemplo</ButtonGroupText>
            <Button variant="secondary">Abrir</Button>
            <ButtonGroupSeparator />
            <Button variant="secondary">Copiar</Button>
          </ButtonGroup>
        </Sample>
        <Sample label="con menú">
          <ButtonGroup>
            <Button variant="outline">Mover sesión</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Más opciones">
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Copiar</DropdownMenuItem>
                <DropdownMenuItem>Devolver</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </Sample>
      </Block>
    </>
  );
}
