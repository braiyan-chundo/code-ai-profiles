import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Block, Sample } from "../ShowcaseSection";

function Ejemplo({ variant, disabled }: { variant: "default" | "line"; disabled?: boolean }) {
  return (
    <Tabs defaultValue="uno" className="w-80">
      <TabsList variant={variant}>
        <TabsTrigger value="uno">Cuenta</TabsTrigger>
        <TabsTrigger value="dos">Sesiones</TabsTrigger>
        <TabsTrigger value="tres" disabled={disabled}>
          Avanzado
        </TabsTrigger>
      </TabsList>
      <TabsContent value="uno" className="pt-3 text-sm text-muted-foreground">
        Contenido de ejemplo de la primera pestaña.
      </TabsContent>
      <TabsContent value="dos" className="pt-3 text-sm text-muted-foreground">
        Contenido de ejemplo de la segunda pestaña.
      </TabsContent>
      <TabsContent value="tres" className="pt-3 text-sm text-muted-foreground">
        Contenido de ejemplo de la tercera pestaña.
      </TabsContent>
    </Tabs>
  );
}

export default function TabsSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="default">
          <Ejemplo variant="default" />
        </Sample>
        <Sample label="line">
          <Ejemplo variant="line" />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="una pestaña deshabilitada">
          <Ejemplo variant="default" disabled />
        </Sample>
        <Sample label="orientación vertical">
          <Tabs defaultValue="uno" orientation="vertical" className="w-80">
            <TabsList>
              <TabsTrigger value="uno">Uno</TabsTrigger>
              <TabsTrigger value="dos">Dos</TabsTrigger>
            </TabsList>
            <TabsContent value="uno" className="text-sm text-muted-foreground">
              Contenido uno.
            </TabsContent>
            <TabsContent value="dos" className="text-sm text-muted-foreground">
              Contenido dos.
            </TabsContent>
          </Tabs>
        </Sample>
      </Block>
    </>
  );
}
