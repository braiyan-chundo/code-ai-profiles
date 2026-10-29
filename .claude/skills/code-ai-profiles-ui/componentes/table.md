# Tabla (`table`)

## Para qué

Datos en filas y columnas.

## Cuándo sí / cuándo no

**Sí**
- Datos en filas y columnas que se comparan.

**No**
- Listas de elementos con acciones: `Item`.
- La usa la tabla de historias de Proyectos (HU-0023); el showcase también. Con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

export function Ejemplo() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Perfil</TableHead>
          <TableHead className="text-right">Sesiones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Perfil de ejemplo</TableCell>
          <TableCell className="text-right">12</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
```

## Variantes y tamaños

`TableCaption`, `TableFooter`; fila seleccionada con `data-state="selected"`.

## Estados

Vacío: una fila con `colSpan` y el texto.

## Accesibilidad

Cabeceras con `TableHead` y un `TableCaption` si hace falta.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--surface-soft` (`bg-muted`)

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

- `Table` acepta `containerClassName` para el `div` que la envuelve (HU-0023): la tabla de historias se ensancha 12 px a cada
  lado con `-mx-3 w-[calc(100%+24px)]` y cada celda lleva `px-3`, así que sus columnas caen en la retícula de 12 columnas
  del cuerpo. El resto es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar tablas para maquetar.
- No regenerar con `pnpm exec shadcn add table --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#table` (con `pnpm dev`).
