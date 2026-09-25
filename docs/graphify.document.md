# Grafo de conocimiento con Graphify

## Propósito

Graphify mantiene un mapa local de símbolos, dependencias y relaciones entre archivos. El arquitecto lo consulta antes de diseñar una HU y lo actualiza después de implementar cualquier feature o fix.

## Artefactos versionados

- `graphify-out/graph.json`: grafo consultable.
- `graphify-out/GRAPH_REPORT.md`: resumen de arquitectura, comunidades y nodos centrales.
- `graphify-out/manifest.json`: hashes relativos necesarios para actualizaciones incrementales reproducibles.

El HTML interactivo, cachés, intérprete local y archivos temporales no se versionan.

`.graphifyignore` excluye dependencias, builds, iconos, schemas generados y las copias de la propia skill. Las definiciones de agentes, HU y documentación del producto sí permanecen en el corpus para que el arquitecto pueda relacionarlas con el código.

El wrapper normaliza el título del reporte a `Code AI Profiles` para que el artefacto público no dependa del nombre de la carpeta local donde se clonó el repositorio.

## Instalación

Graphify está fijado en `.graphify-version`; el wrapper rechaza instalaciones con otra versión para evitar diferencias de formato. Instalar la versión indicada:

```bash
uv tool install graphifyy==0.9.32
```

También puede ejecutarse mediante `uvx`; el wrapper lo usa como fallback.

## Comandos

```bash
npm run graph:build   # reconstrucción completa local, solo código/AST
npm run graph:update  # actualización incremental después de una implementación
npm run graph:check   # actualiza y falla si los artefactos versionados cambiaron
```

Consultas útiles:

```bash
graphify query "¿Qué componentes intervienen en la transferencia de sesiones?"
graphify explain "transfer_session"
graphify affected "transfer_session"
graphify path "App" "transfer_session"
```

## Privacidad

La construcción usa `--code-only`, que extrae estructura mediante AST local y no necesita API ni modelo externo. No añadir perfiles, sesiones reales, credenciales o archivos de usuario al corpus.

## Regla de cierre

El agente `architect`, nunca `document`, ejecuta la actualización tras el código y revisa una consulta de impacto. CI ejecuta la misma actualización incremental y falla si `graph.json`, `GRAPH_REPORT.md` o los hashes del manifiesto no coinciden con el código del commit. Graphify registra también el `mtime` local; `graph:check` ignora únicamente ese campo al comparar clones y conserva la validación de todos los hashes. El clustering completo se reserva para `graph:build`, porque reasignar comunidades en una comprobación sin cambios produciría diferencias innecesarias.

Si una refactorización elimina muchos símbolos y Graphify activa su protección contra reducción accidental, ejecutar `npm run graph:build`, inspeccionar el resultado y versionarlo solo si la reducción era intencional.
