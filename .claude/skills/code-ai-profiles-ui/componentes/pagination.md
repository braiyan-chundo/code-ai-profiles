# Paginación (`pagination`)

## Para qué

Navega entre páginas de resultados.

## Cuándo sí / cuándo no

**Sí**
- Recorrer listas largas por páginas.

**No**
- Listas que caben o que cargan al hacer scroll.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export function Ejemplo() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#anterior" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#uno" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#siguiente" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
```

## Variantes y tamaños

`PaginationLink` `isActive`; `PaginationEllipsis` para saltos.

## Estados

Anterior o siguiente deshabilitado: `aria-disabled` y `pointer-events-none opacity-50` (no hay prop `disabled`).

## Accesibilidad

`aria-label` del `nav` y de anterior y siguiente vienen en inglés: pásalos en español.

## Tokens que usa

- Ninguno propio: hereda del contenedor.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No dejar los textos por defecto en inglés.
- No regenerar con `pnpm exec shadcn add pagination --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#pagination` (con `pnpm dev`).
