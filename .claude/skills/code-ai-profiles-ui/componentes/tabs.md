# Pestañas (`tabs`)

## Para qué

Cambia entre vistas de un mismo contenido.

## Cuándo sí / cuándo no

**Sí**
- Cambiar entre vistas de un mismo contenido sin salir de la pantalla.

**No**
- Para navegar entre pantallas: rutas y `Link`. Para elegir un filtro corto: `ToggleGroup`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from "@/components/ui/tabs"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function Ejemplo() {
  return (
    <Tabs defaultValue="uno">
      <TabsList>
        <TabsTrigger value="uno">Cuenta</TabsTrigger>
        <TabsTrigger value="dos">Sesiones</TabsTrigger>
      </TabsList>
      <TabsContent value="uno">Contenido uno</TabsContent>
      <TabsContent value="dos">Contenido dos</TabsContent>
    </Tabs>
  )
}
```

## Variantes y tamaños

`TabsList` `variant`: `default`, `line`. `orientation`: horizontal o vertical.

## Estados

`disabled` en un `TabsTrigger`; pestaña activa con `data-state="active"`.

## Accesibilidad

Radix pone los roles `tablist`, `tab` y `tabpanel` y las flechas del teclado.

## Tokens que usa

- `--background`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--ring`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No esconder contenido crítico en una pestaña no activa.
- No regenerar con `pnpm exec shadcn add tabs --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#tabs` (con `pnpm dev`).
