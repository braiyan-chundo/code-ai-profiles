# Plegable (`collapsible`)

## Para qué

Muestra u oculta un bloque de contenido.

## Cuándo sí / cuándo no

**Sí**
- Mostrar u ocultar un único bloque.

**No**
- Varias secciones: `Accordion`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost">Mostrar sesiones</Button>
      </CollapsibleTrigger>
      <CollapsibleContent>Sesión uno</CollapsibleContent>
    </Collapsible>
  )
}
```

## Variantes y tamaños

Controlado con `open` y `onOpenChange`.

## Estados

`disabled`.

## Accesibilidad

El trigger lleva texto o `aria-label`.

## Tokens que usa

- Ninguno propio: hereda del contenedor.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar un `div` como trigger.
- No regenerar con `pnpm exec shadcn add collapsible --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#collapsible` (con `pnpm dev`).
