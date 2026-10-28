# Para Claude, en esta carpeta

Es la metodología v4. Sus documentos son para personas: **no los leas enteros**, porque lo que lees se
vuelve a pagar en cada turno.

- **Si el proyecto aún no arrancó** (no hay `AGENTS.md` ni `.metodo/config.json` en la raíz): sigue solo
  `arranque.md` (o `adopcion.md` / `migracion-v3.md` si ya hay código).
- **Si ya arrancó**: manda `AGENTS.md` de la raíz. Aquí no hay nada que seguir.
- **Si necesitas un detalle**, saca solo su sección. `metodo.mjs` está en `plantillas/scripts/` de esta
  carpeta (o en `.metodo/scripts/` si el proyecto ya arrancó):
  `node <ruta>/metodo.mjs leer <documento>` lista sus secciones, y
  `node <ruta>/metodo.mjs leer <documento> "<sección>"` imprime una.

Si lo que se está haciendo es editar la metodología misma (esta carpeta no está dentro de un proyecto),
nada de lo anterior aplica.
