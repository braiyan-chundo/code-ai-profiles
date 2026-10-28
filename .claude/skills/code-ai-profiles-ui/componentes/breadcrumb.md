# Migas de pan (`breadcrumb`)

## Para qué

Muestra la ruta hasta la página actual.

## Cuándo sí / cuándo no

**Sí**
- Mostrar dónde está la persona dentro de una jerarquía.

**No**
- Si hay un solo nivel.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function Ejemplo() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#inicio">Inicio</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Perfil de ejemplo</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

## Variantes y tamaños

`BreadcrumbSeparator` acepta un icono propio; `BreadcrumbEllipsis` para niveles ocultos.

## Estados

`BreadcrumbPage` es el nivel actual (`aria-current="page"`).

## Accesibilidad

Es un `nav` con `aria-label="breadcrumb"`: cámbialo a español si lo necesitas.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`)

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No poner nombres de perfil ni rutas de disco en la URL de un enlace.
- No regenerar con `pnpm exec shadcn add breadcrumb --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#breadcrumb` (con `pnpm dev`).
