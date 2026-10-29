---
name: {{SLUG}}-ui-<id>
description: <Nombre> (`<id>`): <para qué, en una línea>. Cárgala antes de usarlo.
---

# <Nombre> · `<id>`

<!-- Plantilla de la skill de UN componente: se copia a .claude/skills/{{SLUG}}-ui-<id>/SKILL.md.
     La descripción, corta (hasta 200 caracteres): va en cada turno de cada agente.
     Lo común está en la forma del índice ({{SLUG}}-componentes/forma.md); aquí, solo lo propio.
     Las seis secciones con ## son obligatorias: hu.mjs check avisa si falta alguna. -->

`<cómo se importa>` · origen: shadcn/ui <versión> · otra librería · propio · Construido en HU-####.

Showcase: `<ruta>?c=<id>` · <enlace de Claude Design>.

## Para qué

Una o dos frases.

## Cuándo sí / cuándo no

- Sí: …
- No: … → usa `{{SLUG}}-ui-<otro>`.

## Variantes

`variante`: `principal` · `secundario` · … — con sus tokens. `tamano`: … Si hay densidades, sus medidas.

## Estados

Lo que cambia respecto a la forma común: pasar, foco, pulsado, deshabilitado, error, cargando.

## Accesibilidad

Rol, etiqueta, orden de foco, área táctil, contraste.

## Ejemplo

```tsx
<Componente variante="principal">Guardar</Componente>
```
