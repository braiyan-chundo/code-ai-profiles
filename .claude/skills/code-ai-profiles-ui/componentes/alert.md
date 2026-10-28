# Alerta (`alert`)

## Para qué

Mensaje destacado dentro de la página.

## Cuándo sí / cuándo no

**Sí**
- Un mensaje destacado dentro de la página (información o error).
- En la app (HU-0016): `NoticeAlert` (avisos de actualización, sincronización, error, resultado y progreso del escaneo) y las notas de los diálogos (editor, transferir, sincronizar, original). El tono va en el `Alert` (`text-warning`, `text-success`, `text-primary-text`), no en el icono.

**No**
- Un aviso de la app con icono, título y acción: `NoticeAlert` (`src/components`), que ya lo compone. Mensajes que desaparecen: `sonner`, que la app no monta (A-13).

## Importación

```tsx
import { Alert, AlertTitle, AlertDescription, AlertAction } from "@/components/ui/alert"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

export function Ejemplo() {
  return (
    <Alert>
      <InfoIcon />
      <AlertTitle>Aviso</AlertTitle>
      <AlertDescription>Un texto de apoyo con más contexto.</AlertDescription>
    </Alert>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `destructive`. `AlertAction` para un botón arriba a la derecha.

## Estados

Con y sin icono.

## Accesibilidad

Trae `role="alert"`: úsalo solo para lo que debe anunciarse.

## Tokens que usa

- `--card-foreground`, `--card`, `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar `destructive` para advertencias: es para errores.
- No regenerar con `pnpm exec shadcn add alert --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#alert` (con `pnpm dev`).
