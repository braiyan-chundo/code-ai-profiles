# Brief · HU-0015 · frontend

<!-- Extraído de arquitectura.md § Brief · frontend (architect, 2026-10-28). Manda arquitectura.md. -->

Criterios: AC-01, AC-02, AC-03, AC-04, AC-05 (skill y reglas). **Modelo: opus**, porque mueve efectos con
concurrencia (orden de listeners, `generation`, ciclo del listener de Tauri) y una regresión ahí no se ve al abrir la app.
Contrato: este documento, § Estado compartido, § Router y § Reparto de `styles.css`. Sin versión (0.x, interno).

**Archivos.** Crear los de § Estructura de carpetas final. Modificar `src/main.tsx`, `package.json` (dependencia
`react-router` y 4 scripts) y `.github/workflows/validate.yml` (4 pasos). Borrar `src/App.tsx` y
`src/styles.css` al final de sus pasos. Rutas de partida comprobadas: `src/App.tsx`, `src/main.tsx`,
`src/styles.css`, `src/components/Icons.tsx`, `src/lib/{bridge,scan-controller,source-update-controller}.ts`,
`tests/{scan-controller,source-update-controller}.test.ts`, `.github/workflows/validate.yml`,
`.metodo/reglas/frontend.md`, `.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md`.

**Pasos.** Los de § Secuencia, del 0 al 10, en orden y un commit por paso. Reglas al mover código:

1. Se mueve, no se reescribe. Mismos textos, clases, atributos `aria-*`, `title`, `key` y condiciones.
2. Ningún elemento envoltorio nuevo; solo fragmentos. Los diálogos, en `DialogHost`, en el orden actual:
   apariencia, editor, borrar, transferir, desvincular, sincronizar, original.
3. Orden de efectos de R-1 en `DashboardRuntime`, con un comentario que lo diga.
4. Ningún `.tsx` importa CSS; solo `src/styles/index.css`.
5. Entre features, solo por `index.ts`; `features/dashboard` no importa features; `app/` puede importarlo todo.
6. Contexto y hook en `*-context.ts`; el proveedor, en su `.tsx`.
7. Si algo no se puede mover sin cambiar comportamiento, para y lo devuelves.

**Variables de entorno nuevas.** Ninguna. No se lee `import.meta.env`.

**Pruebas.** Las 4 de § Pruebas nuevas, con sus scripts y pasos de CI. Relacionadas:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`; además, `npm run build`,
`test:scan` y `test:update` en cada paso. La suite la corre el orquestador.

**Entrega.** Las salidas de: `cmp` del CSS, hash del CSS antes y después, comparación del DOM de los cinco
estados, `rg -n "invoke\(" src`, `wc -l src/**/*.tsx` y la lista manual de AC-01 marcada (lo que no pudiste
ver, declarado como no visto).

**Si dudas.** `graphify explain "App()"`, `graphify explain "createScanController()"`,
`graphify explain "createSourceUpdateController()"`; `docs/arquitectura/frontend.md`; la skill
`code-ai-profiles-frontend-react-vite` (Datos y estado, Pruebas).

**No toques.** `src/types.ts`, `src/lib/bridge.ts`, `src/lib/*-controller.ts` y sus pruebas, `src-tauri/`,
`src/components/Icons.tsx` (solo se importa), `vite.config.ts` y `tsconfig*.json` (sin alias: A-5),
`DESIGN.md`, los valores del CSS, `docs/arquitectura/` (si la realidad difiere, avisas y lo actualiza
architect), `.metodo/config.json` (orquestador). No instales shadcn, Tailwind ni nada más.

**Skills.** `code-ai-profiles-frontend-react-vite`, `code-ai-profiles-pruebas`, `code-ai-profiles-configuracion`.

### Verificación manual de AC-01

En `npm run dev` (mock) y en `npm run tauri dev`, en **oscuro**, **claro** y **sistema**, a **1440×900** y
a la mínima, **980×680** (pasa los cortes de 1260 y 1070 px):

- [ ] Titlebar: marca, BETA, «Escanear sistema», apariencia, «Nueva instancia» (deshabilitada sin fuente).
      Windows: los tres controles propios funcionan; macOS: los semáforos no tapan la marca; Linux: sin controles propios.
- [ ] Toolbar: «N EN EJECUCIÓN», Perfiles, Sesiones Code y Aplicación (a 980 px se oculta Sesiones Code);
      ⌘F/Ctrl F enfoca el buscador; la ✕ lo limpia; el `kbd` dice ⌘ o Ctrl según la plataforma.
- [ ] Búsqueda: filtra por nombre, ruta, estado y título de sesión; despliega las sesiones; sin resultados
      muestra «Sin coincidencias» y «Limpiar búsqueda».
- [ ] Aplicación original: estado, versión, contador, desplegar y plegar sesiones, transferir y desvincular.
- [ ] Tarjeta de instancia: abrir («Abriendo…»), detener («Deteniendo…» y su borde), carpeta, editar,
      borrar (solo detenida), medidores de uso con «Última captura», insignias de actualización e icono.
- [ ] Contexto de sesión: niveles normal, elevado, crítico y sin datos, con sus colores y tooltips.
- [ ] Escaneo manual: panel con porcentaje, éxito que se cierra solo, error con «Ocultar»; tarjetas atenuadas
      mientras escanea; el botón gira.
- [ ] Banners: actualización oficial (disponible e incierta), sincronización (una y varias), error y aviso con su ✕.
- [ ] Diálogos: apariencia (tema y tamaño aplican al instante y persisten al recargar), nueva y editar
      instancia (icono válido e inválido, quitar, opciones avanzadas), borrar, transferir (mover y copiar,
      destino detenido o en ejecución), desvincular y devolver, sincronizar, actualizar la original.
      Escape cierra cada uno salvo durante su operación; clic en el fondo cierra.
- [ ] Estados: carga (esqueletos), vacío sin fuente («Escanear de nuevo») y con fuente («Crea tu primer perfil»).
- [ ] Footer: salud, libres, administrados, `BUILD x.y.z`, plataforma.
- [ ] `#/cualquier-cosa` en la barra del navegador vuelve al panel.
- [ ] Escritorio: tras «Actualizar original» y volver a la ventana, solo se refrescan las versiones (no
      aparece el panel de escaneo).

## Ajuste del orquestador (2026-10-28)

- **DOM de los pasos 0 y 8: lo hace el orquestador**, que tiene navegador. La línea base ya está tomada
  sobre `5995e50` (hashes en `seguimiento.md`). Tú haces la parte de CSS del paso 0 (`npm run build` y
  `shasum -a 256 dist/assets/*.css`) y, en el paso 8, avisas en la entrega de que el DOM queda para el
  orquestador. La lista manual de AC-01 la marcas solo con lo que puedas ver; el resto, «no visto».
- No hagas `git push`. Los commits van en la rama `hu-0015-frontend-escalable`.
