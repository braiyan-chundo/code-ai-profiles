import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Block, Sample } from "../ShowcaseSection";

export default function KbdSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="una tecla">
          <Kbd>K</Kbd>
        </Sample>
        <Sample label="grupo">
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>P</Kbd>
          </KbdGroup>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="dentro de un botón">
          <Button variant="outline">
            Buscar
            <Kbd>⌘K</Kbd>
          </Button>
        </Sample>
      </Block>
    </>
  );
}
