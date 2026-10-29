import { CheckIcon, LoaderIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { Block, Sample } from "../ShowcaseSection";

export default function TraceSection() {
  return (
    <>
      <Block title="Variantes (status)" className="flex-col items-stretch">
        <Sample label="sin estado" className="items-stretch">
          <Trace>
            <TraceLine>
              <TraceIcon>
                <CheckIcon />
              </TraceIcon>
              <TraceTitle>Paso completado</TraceTitle>
              <TraceDescription>1,2 s</TraceDescription>
            </TraceLine>
          </Trace>
        </Sample>
        <Sample label="running" className="items-stretch">
          <Trace>
            <TraceLine status="running">
              <TraceIcon>
                <LoaderIcon className="animate-spin" />
              </TraceIcon>
              <TraceTitle>Paso en curso</TraceTitle>
            </TraceLine>
          </Trace>
        </Sample>
        <Sample label="pending" className="items-stretch">
          <Trace>
            <TraceLine status="pending">
              <TraceIcon>
                <SearchIcon />
              </TraceIcon>
              <TraceTitle>Paso pendiente</TraceTitle>
            </TraceLine>
          </Trace>
        </Sample>
        <Sample label="error" className="items-stretch">
          <Trace>
            <TraceLine status="error">
              <TraceIcon>
                <TriangleAlertIcon />
              </TraceIcon>
              <TraceTitle>Paso con error</TraceTitle>
            </TraceLine>
          </Trace>
        </Sample>
      </Block>
      <Block title="Composición" className="flex-col items-stretch">
        <Trace className="max-w-md">
          <TraceCollapsible>
            <TraceCollapsibleTrigger>
              <TraceLine>
                <TraceIcon>
                  <SearchIcon />
                </TraceIcon>
                <TraceTitle>Detalle desplegable</TraceTitle>
                <TraceDescription>3 pasos</TraceDescription>
              </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
              <p className="text-sm text-muted-foreground">Texto de muestra del detalle, sin datos reales.</p>
            </TraceCollapsibleContent>
          </TraceCollapsible>
        </Trace>
      </Block>
    </>
  );
}
