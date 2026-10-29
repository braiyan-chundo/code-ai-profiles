import { Button } from "@/components/ui/button";
import { DirectionProvider } from "@/components/ui/direction";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Block, Sample } from "../ShowcaseSection";

function Ejemplo({ texto }: { texto: string }) {
  return (
    <div className="flex w-72 flex-col gap-3 rounded-xl border border-border p-4">
      <p className="text-sm">{texto}</p>
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Uno</TabsTrigger>
          <TabsTrigger value="b">Dos</TabsTrigger>
        </TabsList>
      </Tabs>
      <Button variant="outline" className="self-start">
        Acción
      </Button>
    </div>
  );
}

/* La app está en español (de izquierda a derecha): esta sección solo enseña el proveedor. */
export default function DirectionSection() {
  return (
    <>
      <Block title="Variantes (dir)">
        <Sample label='dir="ltr"'>
          <DirectionProvider dir="ltr">
            <div dir="ltr">
              <Ejemplo texto="Texto de ejemplo, de izquierda a derecha." />
            </div>
          </DirectionProvider>
        </Sample>
        <Sample label='dir="rtl"'>
          <DirectionProvider dir="rtl">
            <div dir="rtl">
              <Ejemplo texto="Texto de ejemplo, de derecha a izquierda." />
            </div>
          </DirectionProvider>
        </Sample>
      </Block>
    </>
  );
}
