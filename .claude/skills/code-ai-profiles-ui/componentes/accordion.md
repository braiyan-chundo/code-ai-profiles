# Acordeón (`accordion`)

## Para qué

Secciones que se despliegan una a una o varias.

## Cuándo sí / cuándo no

**Sí**
- Secciones de contenido que se despliegan para no saturar la pantalla.

**No**
- Un solo bloque que se oculta: `Collapsible`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

export function Ejemplo() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="uno">
        <AccordionTrigger>¿Qué es un perfil?</AccordionTrigger>
        <AccordionContent>Una copia aislada de la aplicación.</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
```

## Variantes y tamaños

`type`: `single` (con `collapsible`) o `multiple`.

## Estados

`disabled` en un `AccordionTrigger`; abierto con `defaultValue`.

## Accesibilidad

Radix: `aria-expanded`, teclado con flechas.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No olvidar `type`.
- No regenerar con `pnpm exec shadcn add accordion --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#accordion` (con `pnpm dev`).
