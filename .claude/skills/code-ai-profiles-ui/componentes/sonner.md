# Avisos emergentes (`sonner`)

## Para qué

Notificaciones temporales (toast).

## Cuándo sí / cuándo no

**Sí**
- Avisos temporales que no bloquean (guardado, copiado, error corto).

**No**
- Errores que exigen acción: `Alert`. En la app, el aviso actual (`notice`) del dashboard.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Toaster } from "@/components/ui/sonner"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Button onClick={() => toast.success("Guardado")}>Guardar</Button>
  )
}
```

## Variantes y tamaños

`toast`, `toast.success`, `.info`, `.warning`, `.error`, `.loading` y `{ id }` para actualizar.

## Estados

Cargando y luego resuelto con el mismo `id`.

## Accesibilidad

Sonner usa una región `aria-live`; el texto en español, corto.

## Tokens que usa

- Ninguno propio: hereda del contenedor.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 4 (A-6): sin `next-themes`. `theme` llega por props, con `"dark"` por defecto.

## Qué no hacer

- No montar más de un `<Toaster>`.
- `theme` llega por props (no hay `next-themes`): pásalo desde el tema de la app.
- No regenerar con `pnpm exec shadcn add sonner --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#sonner` (con `pnpm dev`).
