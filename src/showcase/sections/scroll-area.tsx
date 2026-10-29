import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Block, Sample } from "../ShowcaseSection";

const etiquetas = Array.from({ length: 20 }, (_, index) => `Sesión de ejemplo ${index + 1}`);

export default function ScrollAreaSection() {
  return (
    <>
      <Block title="Variantes (orientation)">
        <Sample label="vertical">
          <ScrollArea className="h-48 w-56 rounded-xl border border-border">
            <div className="p-3">
              {etiquetas.map((etiqueta) => (
                <div key={etiqueta}>
                  <div className="text-sm">{etiqueta}</div>
                  <Separator className="my-2" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </Sample>
        <Sample label="horizontal">
          <ScrollArea className="w-72 rounded-xl border border-border whitespace-nowrap">
            <div className="flex w-max gap-3 p-3">
              {etiquetas.slice(0, 10).map((etiqueta) => (
                <div key={etiqueta} className="rounded-lg bg-muted px-3 py-2 text-sm">
                  {etiqueta}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Sample>
      </Block>
    </>
  );
}
