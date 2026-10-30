# Área con scroll (`scroll-area`)

## Para qué

Zona desplazable con barras propias.

## Cuándo sí / cuándo no

**Sí**
- Una zona con scroll con barras que combinan con el tema.

**No**
- El cuerpo de una página: `PageContent` ya hace scroll.
- En la app (HU-0025): el cuerpo del modal «Datos incompletos» y del lector de historias, con `type="always"` y el viewport en `block` (`[&>[data-slot=scroll-area-viewport]>div]:block!`, porque Radix lo envuelve en un `display: table` que ensancha el contenido).

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

Ajuste 1 (HU-0025, escala armónica): al adoptarlo la app, `test:ui` (prueba 15) lo revisa. `p-px` pasa a `p-0` en la barra y el anillo de foco del área, de `ring-[3px] ring-ring/50` a `ring-2 ring-ring`.

## Qué no hacer

- No anidar áreas con scroll.
- No regenerar con `pnpm exec shadcn add scroll-area --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#scroll-area` (con `pnpm dev`).
