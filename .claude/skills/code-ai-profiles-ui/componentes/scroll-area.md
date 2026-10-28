# Área con scroll (`scroll-area`)

## Para qué

Zona desplazable con barras propias.

## Cuándo sí / cuándo no

**Sí**
- Una zona con scroll con barras que combinan con el tema.

**No**
- En las pantallas actuales, `.content` ya hace scroll.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { ScrollArea } from "@/components/ui/scroll-area"

export function Ejemplo() {
  return (
    <ScrollArea className="h-48 w-56 rounded-xl border">
      <div className="p-3">Contenido largo</div>
    </ScrollArea>
  )
}
```

## Variantes y tamaños

`ScrollBar` `orientation`: vertical u horizontal.

## Estados

Barras visibles al pasar o al desplazar.

## Accesibilidad

El área enfocable se ve con el anillo de foco.

## Tokens que usa

- `--border`, `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No anidar áreas con scroll.
- No regenerar con `pnpm exec shadcn add scroll-area --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#scroll-area` (con `pnpm dev`).
