# Tarjeta al pasar el ratón (`hover-card`)

## Para qué

Vista previa que aparece al apuntar o enfocar.

## Cuándo sí / cuándo no

**Sí**
- Una vista previa al pasar el ratón o al enfocar un enlace.

**No**
- En táctil no hay hover: no pongas nada imprescindible. Para pistas cortas: `Tooltip`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@perfil</Button>
      </HoverCardTrigger>
      <HoverCardContent>Vista previa de ejemplo.</HoverCardContent>
    </HoverCard>
  )
}
```

## Variantes y tamaños

`openDelay` y `closeDelay`; `side` y `align` en el contenido.

## Estados

Abierto o cerrado con ratón o foco.

## Accesibilidad

Se abre también con el foco del teclado; el contenido no debe ser lo único que lleve la información.

## Tokens que usa

- `--foreground`, `--popover-foreground`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No incluir controles pulsables críticos.
- No regenerar con `pnpm exec shadcn add hover-card --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#hover-card` (con `pnpm dev`).
