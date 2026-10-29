import { CopyIcon, SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
import { Block, Sample } from "../ShowcaseSection";

export default function InputGroupSection() {
  return (
    <>
      <Block title="Variantes (align del addon)">
        <Sample label="inline-start">
          <InputGroup className="w-64">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Buscar" aria-label="Buscar" />
          </InputGroup>
        </Sample>
        <Sample label="inline-end">
          <InputGroup className="w-64">
            <InputGroupInput placeholder="Dirección de ejemplo" aria-label="Dirección" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>.ejemplo</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
        <Sample label="block-start">
          <InputGroup className="w-64">
            <InputGroupTextarea placeholder="Escribe una nota" aria-label="Nota" />
            <InputGroupAddon align="block-start">
              <InputGroupText>Nota</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
        <Sample label="block-end">
          <InputGroup className="w-64">
            <InputGroupTextarea placeholder="Escribe una nota" aria-label="Nota con pie" />
            <InputGroupAddon align="block-end">
              <InputGroupText>0 / 200</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <InputGroup className="w-64" data-disabled="true">
            <InputGroupInput disabled placeholder="No editable" aria-label="Deshabilitado" />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </Sample>
        <Sample label="aria-invalid">
          <InputGroup className="w-64">
            <InputGroupInput aria-invalid defaultValue="Inválido" aria-label="Con error" />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="con botón">
          <InputGroup className="w-72">
            <InputGroupInput readOnly defaultValue="Valor de ejemplo" aria-label="Valor" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Copiar valor">
                <CopyIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
      </Block>
    </>
  );
}
