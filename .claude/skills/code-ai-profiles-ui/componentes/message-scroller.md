# Desplazador de mensajes (`message-scroller`)

## Para qué

Lista de mensajes que se ancla al final.

## Cuándo sí / cuándo no

**Sí**
- Una lista de mensajes que se ancla al final y pasa a un botón de ir al final.

**No**
- Listas normales: `ScrollArea`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@/components/ui/message-scroller"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller"

export function Ejemplo() {
  return (
    <MessageScrollerProvider>
      <MessageScroller className="h-64 w-80 rounded-xl border">
        <MessageScrollerViewport aria-label="Mensajes">
          <MessageScrollerContent>
            <MessageScrollerItem messageId="m1">Mensaje de ejemplo</MessageScrollerItem>
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
```

## Variantes y tamaños

`MessageScrollerProvider`: `autoScroll`, `defaultScrollPosition`. `MessageScrollerButton` `direction`: `start`, `end`.

## Estados

El botón aparece cuando no estás al final.

## Accesibilidad

`aria-label` en el `Viewport`; el botón trae "Scroll to end" en inglés (`sr-only`).

## Tokens que usa

- `--background`, `--border`, `--foreground`, `--surface-soft` (`bg-muted`)

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No olvidar el `MessageScrollerProvider`.
- No regenerar con `pnpm exec shadcn add message-scroller --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#message-scroller` (con `pnpm dev`).
