import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Block } from "../ShowcaseSection";

export default function AlertSection() {
  return (
    <>
      <Block title="Variantes" className="flex-col items-stretch">
        <Alert className="max-w-xl">
          <InfoIcon />
          <AlertTitle>Aviso informativo de ejemplo</AlertTitle>
          <AlertDescription>Un texto de apoyo con más contexto.</AlertDescription>
        </Alert>
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangleIcon />
          <AlertTitle>No se pudo completar</AlertTitle>
          <AlertDescription>Ejemplo de error: indica qué hacer a continuación.</AlertDescription>
        </Alert>
      </Block>
      <Block title="Composición" className="flex-col items-stretch">
        <Alert className="max-w-xl">
          <InfoIcon />
          <AlertTitle>Con una acción</AlertTitle>
          <AlertDescription>La acción se coloca arriba a la derecha.</AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline">
              Deshacer
            </Button>
          </AlertAction>
        </Alert>
        <Alert className="max-w-xl">
          <AlertTitle>Sin icono</AlertTitle>
          <AlertDescription>Solo título y descripción.</AlertDescription>
        </Alert>
      </Block>
    </>
  );
}
