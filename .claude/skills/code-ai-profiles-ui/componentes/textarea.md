# Área de texto (`textarea`)

## Para qué

Entrada de varias líneas.

## Cuándo sí / cuándo no

**Sí**
- Texto de varias líneas: notas, descripciones.

**No**
- Una línea: `Input`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Textarea } from "@/components/ui/textarea"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Textarea } from "@/components/ui/textarea"

export function Ejemplo() {
  return (
    <Textarea placeholder="Escribe una nota" aria-label="Nota" />
  )
}
```

## Variantes y tamaños

Sin variantes: el tamaño sale de `rows` y `className`.

## Estados

`disabled`, `aria-invalid`, foco con anillo.

## Accesibilidad

Etiqueta con `Field` o `aria-label`.

## Tokens que usa

- `--destructive`, `--input`, `--muted` (`text-muted-foreground`), `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No fijar la altura con `style`: usa `rows` o clases.
- No regenerar con `pnpm exec shadcn add textarea --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#textarea` (con `pnpm dev`).
