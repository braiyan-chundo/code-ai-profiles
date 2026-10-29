import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Block, Sample } from "../ShowcaseSection";

export default function ToggleGroupSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="single · default">
          <ToggleGroup type="single" defaultValue="izquierda" aria-label="Alineación de ejemplo">
            <ToggleGroupItem value="izquierda" aria-label="Izquierda">
              <AlignLeftIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="centro" aria-label="Centro">
              <AlignCenterIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="derecha" aria-label="Derecha">
              <AlignRightIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </Sample>
        <Sample label="multiple · outline">
          <ToggleGroup type="multiple" variant="outline" defaultValue={["a"]} aria-label="Opciones de ejemplo">
            <ToggleGroupItem value="a">Uno</ToggleGroupItem>
            <ToggleGroupItem value="b">Dos</ToggleGroupItem>
            <ToggleGroupItem value="c">Tres</ToggleGroupItem>
          </ToggleGroup>
        </Sample>
      </Block>
      <Block title="Tamaños y separación">
        {(["sm", "default", "lg"] as const).map((size) => (
          <Sample key={size} label={size}>
            <ToggleGroup type="single" variant="outline" size={size} defaultValue="a">
              <ToggleGroupItem value="a">Uno</ToggleGroupItem>
              <ToggleGroupItem value="b">Dos</ToggleGroupItem>
            </ToggleGroup>
          </Sample>
        ))}
        <Sample label="spacing={2}">
          <ToggleGroup type="single" variant="outline" spacing={2} defaultValue="a">
            <ToggleGroupItem value="a">Uno</ToggleGroupItem>
            <ToggleGroupItem value="b">Dos</ToggleGroupItem>
          </ToggleGroup>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <ToggleGroup type="single" variant="outline" disabled defaultValue="a">
            <ToggleGroupItem value="a">Uno</ToggleGroupItem>
            <ToggleGroupItem value="b">Dos</ToggleGroupItem>
          </ToggleGroup>
        </Sample>
      </Block>
    </>
  );
}
