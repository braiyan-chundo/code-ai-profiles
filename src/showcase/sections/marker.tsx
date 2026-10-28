import { CalendarIcon } from "lucide-react";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Block, Sample } from "../ShowcaseSection";

export default function MarkerSection() {
  return (
    <>
      <Block title="Variantes" className="flex-col items-stretch">
        {(["default", "separator", "border"] as const).map((variant) => (
          <Sample key={variant} label={variant} className="items-stretch">
            <Marker variant={variant} className="max-w-md">
              <MarkerIcon>
                <CalendarIcon />
              </MarkerIcon>
              <MarkerContent>Hoy, 28 de octubre</MarkerContent>
            </Marker>
          </Sample>
        ))}
      </Block>
      <Block title="Composición" className="flex-col items-stretch">
        <Marker variant="separator" className="max-w-md">
          <MarkerContent>Mensajes nuevos</MarkerContent>
        </Marker>
      </Block>
    </>
  );
}
