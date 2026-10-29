# Indicador de carga (`spinner`)

## Para qué

Rueda que indica que algo está en curso.

## Cuándo sí / cuándo no

**Sí**
- Indicar que algo está en curso, dentro de un botón o junto a un texto.
- En la app (HU-0016): los botones de confirmar de los diálogos mientras corre la operación, con `aria-hidden` (el texto del botón ya dice qué pasa).

**No**
- Carga de listas o páginas: `Skeleton` (`PageSkeleton`).

## Importación

```tsx
import { Spinner } from "@/components/ui/spinner"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Spinner } from "@/components/ui/spinner"

export function Ejemplo() {
  return (
    <Spinner aria-label="Cargando" />
  )
}
```

## Variantes y tamaños

El tamaño y el color salen de `className` (`size-6`, `text-primary-text`).

## Estados

Siempre girando; se apaga con `motion-reduce`.

## Accesibilidad

Trae `aria-label="Loading"` en inglés: pásalo en español.

## Tokens que usa

- Ninguno propio: hereda del contenedor.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No dejar el `aria-label` por defecto.
- No regenerar con `pnpm exec shadcn add spinner --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#spinner` (con `pnpm dev`).
