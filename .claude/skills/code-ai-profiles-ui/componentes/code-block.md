# Bloque de código (`code-block`)

## Para qué

Código con cabecera, numeración y botón de copiar.

## Cuándo sí / cuándo no

**Sí**
- Mostrar código o texto monoespaciado con numeración y botón de copiar.

**No**
- No se usa `shiki` aquí salvo `useHighlightedCode` (en `hooks`).
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
  CodeBlockFooter,
} from "@/components/ui/code-block"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "@/components/ui/code-block"

export function Ejemplo() {
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>ejemplo.js</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value="const a = 1" />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>{"const a = 1"}</CodeBlockContent>
    </CodeBlock>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `destructive`. `size`: `default`, `sm`. `CodeBlockLine` `variant`: `default`, `added`, `removed`, `highlighted`.

## Estados

`wrap`, `lineNumbers`; el botón de copiar cambia a "copiado" 2 s.

## Accesibilidad

El botón de copiar trae `aria-label` en inglés ("Copy"): pásalo en español.

## Tokens que usa

- `--background`, `--destructive`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--ring`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`, `--font-mono`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 5 (A-7): `highlighter.tsx` pasó de `src/lib/` a `src/hooks/`, y `use-highlighted-code.ts` lo importa de `@/hooks/highlighter` (`lib/` no puede importar React).

## Qué no hacer

- Nunca mostrar transcripts ni contenido real de un perfil.
- No regenerar con `pnpm exec shadcn add code-block --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#code-block` (con `pnpm dev`).
