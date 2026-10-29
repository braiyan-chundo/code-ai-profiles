import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Block, Sample } from "../ShowcaseSection";

export default function CardSection() {
  return (
    <>
      <Block title="Variantes (size)">
        <Sample label="default">
          <Card className="w-72">
            <CardHeader>
              <CardTitle>Perfil de ejemplo</CardTitle>
              <CardDescription>Descripción de muestra.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Contenido inventado de la tarjeta.</CardContent>
          </Card>
        </Sample>
        <Sample label="sm">
          <Card size="sm" className="w-72">
            <CardHeader>
              <CardTitle>Perfil de ejemplo</CardTitle>
              <CardDescription>Descripción de muestra.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Contenido inventado de la tarjeta.</CardContent>
          </Card>
        </Sample>
      </Block>
      <Block title="Composición">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Con acción y pie</CardTitle>
            <CardDescription>Todas las piezas juntas.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="xs">
                Editar
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="tarjeta-nombre">Nombre</FieldLabel>
              <Input id="tarjeta-nombre" defaultValue="Perfil de ejemplo" />
            </Field>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button>Guardar</Button>
          </CardFooter>
        </Card>
      </Block>
    </>
  );
}
