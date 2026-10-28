import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Block } from "../ShowcaseSection";

const filas = [
  { nombre: "Perfil de trabajo", estado: "Detenido", sesiones: 12 },
  { nombre: "Perfil personal", estado: "En ejecución", sesiones: 5 },
  { nombre: "Perfil de pruebas", estado: "Detenido", sesiones: 0 },
];

export default function TableSection() {
  return (
    <>
      <Block title="Variantes" className="flex-col items-stretch">
        <Table className="max-w-xl">
          <TableCaption>Datos inventados para el ejemplo.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Sesiones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila, index) => (
              <TableRow key={fila.nombre} data-state={index === 1 ? "selected" : undefined}>
                <TableCell className="font-medium">{fila.nombre}</TableCell>
                <TableCell>
                  <Badge variant={fila.estado === "Detenido" ? "outline" : "secondary"}>{fila.estado}</Badge>
                </TableCell>
                <TableCell className="text-right">{fila.sesiones}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">{filas.reduce((suma, fila) => suma + fila.sesiones, 0)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Block>
      <Block title="Estados" className="flex-col items-stretch">
        <Table className="max-w-xl">
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                Sin resultados de ejemplo.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Block>
    </>
  );
}
