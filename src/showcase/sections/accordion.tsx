import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Block, Sample } from "../ShowcaseSection";

const items = [
  { valor: "uno", titulo: "¿Qué es un perfil de ejemplo?", texto: "Texto de muestra para el acordeón." },
  { valor: "dos", titulo: "¿Cómo se usa?", texto: "Otro texto de muestra, sin datos reales." },
  { valor: "tres", titulo: "Sección deshabilitada", texto: "No se puede abrir.", deshabilitado: true },
];

export default function AccordionSection() {
  return (
    <>
      <Block title="Variantes (type)">
        <Sample label="single, collapsible">
          <Accordion type="single" collapsible defaultValue="uno" className="w-80">
            {items.map((item) => (
              <AccordionItem key={item.valor} value={item.valor}>
                <AccordionTrigger disabled={item.deshabilitado}>{item.titulo}</AccordionTrigger>
                <AccordionContent>{item.texto}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Sample>
        <Sample label="multiple">
          <Accordion type="multiple" defaultValue={["uno", "dos"]} className="w-80">
            {items.slice(0, 2).map((item) => (
              <AccordionItem key={item.valor} value={item.valor}>
                <AccordionTrigger>{item.titulo}</AccordionTrigger>
                <AccordionContent>{item.texto}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Sample>
      </Block>
    </>
  );
}
