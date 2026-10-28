# Mensaje (`message`)

## Para qué

Una intervención de una conversación, con avatar y pie.

## Cuándo sí / cuándo no

**Sí**
- Una intervención dentro de una conversación, con avatar, cabecera y pie.

**No**
- En esta app no hay chat: es del catálogo completo (autorizado) y hoy solo se ve en el showcase.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Message, MessageContent, MessageFooter, MessageHeader } from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"

export function Ejemplo() {
  return (
    <Message align="start">
      <MessageContent>
        <MessageHeader>Perfil de ejemplo</MessageHeader>
        <Bubble variant="secondary">
          <BubbleContent>Mensaje de muestra</BubbleContent>
        </Bubble>
        <MessageFooter>10:30</MessageFooter>
      </MessageContent>
    </Message>
  )
}
```

## Variantes y tamaños

`align`: `start`, `end`. `MessageGroup` agrupa.

## Estados

Con y sin avatar.

## Accesibilidad

Texto en español; la burbuja es el contenido.

## Tokens que usa

- `--muted` (`text-muted-foreground`), `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- Nunca mostrar contenido real de un perfil (prompts, respuestas): es la promesa central del producto.
- No regenerar con `pnpm exec shadcn add message --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#message` (con `pnpm dev`).
