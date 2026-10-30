---
id: HU-0025
titulo: "Proyectos: datos incompletos y lector de historias"
estado: terminada
fase: cierre
area: proyectos
entrega: 1
prioridad: alta
creada: 2026-10-30
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [contrato]
reglas: [RN-02]
depende: []
---

# Proyectos: datos incompletos y lector de historias

Como mantenedor que sigue sus proyectos v4 desde Code AI Profiles
quiero ver los datos incompletos sin que tapen el resumen y leer cada historia sin salir de la app
para entender el estado de un proyecto de un vistazo y consultar sus historias al momento.

## Petición original

> «2) los avisos ocupan espacio quizas lo mejor es dejarlos en un modal para ver, igual analiza si hay una manera de
> resolverlos o si son historias incompatibles marcarlas como tal
> 3) al darle click en una hu pueda leerla en un modal compatible con .md
> […] recuerda que debes hacer una maqueta simple de cada vista para aprobarlas
> usar los componentes y skills del showcase» — Braiyan Rodriguez (mantenedor), 2026-10-30

Contexto: en `happy-office` la página del proyecto abre con «18 avisos al leer el proyecto», una lista que ocupa
media pantalla. El análisis del orquestador sobre ese proyecto:

- 13 historias tienen `metricas.json` con `minutosTotales: null` y `fases: []`. Se cerraron sin transiciones de fase
  y el método no pudo medir su tiempo. Los tokens sí están. El dato no se puede recuperar.
- 5 historias terminadas no tienen `metricas.json` (HU-0001, 0002, 0017, 0018, 0023). Se pueden generar en el
  proyecto con `node .metodo/scripts/metricas.mjs hu <HU>`. La app no lo ejecuta (RN-02).

Elecciones, en la misma conversación (2026-10-30):

- Datos incompletos: «Etiqueta y modal (Recomendado)».
- Lector: «hu.md y sus .md (Recomendado)». Cambia RN-02.
- Markdown: «react-markdown + remark-gfm (Recomendado)», dependencias autorizadas, respetando `minimumReleaseAge`.

## Alcance

- **Datos incompletos.**
  - No salen como avisos. Cada historia afectada lleva en su fila una etiqueta discreta: «Sin tiempo»
    (`minutosTotales` nulo) o «Sin métricas» (terminada y sin `metricas.json`).
  - Un chip en la cabecera del proyecto, «N historias con datos incompletos · Ver», abre un modal agrupado por tipo.
    Cada grupo explica la causa y, si se puede completar, da el comando para hacerlo en el proyecto, con un botón de
    copiar (la app no lo ejecuta).
- **Avisos de verdad** (archivos ilegibles, encabezados rotos, permisos, nube): también van al modal, en su propio
  grupo. Si los hay, el chip lo indica.
- **Lector de historias.** Al pulsar una historia de la lista se abre un modal con sus `.md`: `hu.md`,
  `arquitectura.md`, `verificacion.md` y `seguimiento.md`, uno por pestaña y solo los que existan, renderizados como
  Markdown. Se leen en el momento de abrir, con los mismos límites y protecciones de RN-02.
- Delta de RN-02, documento `docs/proyectos.document.md`, README y CHANGELOG.

## Fuera de alcance

- Generar o reparar métricas desde la app (sería ejecutar o escribir en el proyecto).
- Editar historias, enlaces entre historias y otros `.md` fuera de la carpeta de la historia.
- Imágenes incrustadas en el Markdown que apunten fuera de la carpeta de la historia o a la red.

## Decisiones por defecto (★)

- ★ **D-1 · Chip en la cabecera, no banner.** *Alternativa:* una tarjeta plegada bajo la cabecera.
- ★ **D-2 · El Markdown no ejecuta HTML embebido ni carga nada de red.** Los enlaces externos se abren en el navegador
  del sistema; las imágenes no se cargan. *Alternativa:* permitir imágenes locales de la carpeta de la historia.
- ★ **D-3 · Pestañas en orden** hu → arquitectura → verificación → seguimiento. *Alternativa:* un solo documento
  concatenado.

## Criterios de aceptación

### AC-01 · Maqueta aprobada antes de construir

`diseno/maqueta.html` con la página del proyecto (chip, filas con etiqueta), el modal de datos incompletos y el
lector, en oscuro y claro, a 1440×920 y 980×680, con componentes del catálogo; la persona la aprueba.

### AC-02 · Sin lista de avisos en la página

Con `happy-office`, la página ya no muestra la lista de 18 avisos: muestra el chip «18 historias con datos
incompletos · Ver» y las etiquetas en las filas.

### AC-03 · Modal de datos incompletos

El modal agrupa «Sin tiempo» (13) y «Sin métricas» (5), explica cada grupo y, para «Sin métricas», da el comando de
cada historia con un botón de copiar.

### AC-04 · Lector

Al pulsar una historia se abre su `hu.md` renderizado (títulos, listas, tablas, código, citas), con pestañas para los
otros `.md` que existan. Un `.md` que falte no tiene pestaña; uno ilegible lo dice dentro de su pestaña.

### AC-05 · Solo lectura y sin red

Abrir el lector no escribe en el proyecto, no ejecuta nada, no carga nada de red y no lee fuera de la carpeta de la
historia.

## Reglas de negocio afectadas

- **RN-02 cambia:** además del encabezado de `hu.md`, al abrir el lector se leen completos los `.md` de la carpeta de
  esa historia (`hu.md`, `arquitectura.md`, `verificacion.md`, `seguimiento.md`), con los mismos límites.

## Para la persona usuaria

**Pendiente humano:** aprobar la maqueta (aprobada el 2026-10-30).

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [x] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [x] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [x] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [x] Revisión técnica pasada, si la historia es riesgosa
- [x] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [x] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [x] Commits en cada repo tocado con `HU: HU-0025`. **Sin push, sin publicar, sin desplegar**
- [x] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

2026-10-30, cerrada por el orquestador sobre el veredicto del mantenedor («Probadas y bien»), tras probar el `.dmg` de
`75b6387`.

SHA por repositorio (code-ai-profiles, rama `ajustes-proyectos-e-instancias`):
- `afd6fc7`: backend (`dataGaps`, `minutes` nulo, `timedHistories`, `read_project_history`, `open_external_link`).
- `6a617c5`, `91c553b`: frontend (chip, etiquetas, modal, lector Markdown) y capturas.
- `088a36c`, `5e62f11`: correcciones de la revisión (R-1 a R-3 y O-1).
- `c5935a6`, `2c81cff`, `d4dd758`, `e55fd4d`, `1e4b37a`, `b9ae666`, `75b6387`, `ee34018` y el de cierre: historia,
  maqueta, arquitectura, briefs, grafo, verificación, regla y documentación (`docs/proyectos.document.md`,
  `docs/arquitectura/frontend.md`, README, CHANGELOG).

En la misma rama, sin historia: `a41cdb9`, el fix de «Actualizar» con respuesta visible.

★ aceptadas tal como estaban: D-1, D-2 y D-3. Desviación aceptada en la revisión: `code-block` y `scroll-area` del
catálogo, ajustados a la escala armónica.

Reglas de negocio: RN-02 cambia (lector de historias y enlaces externos) en `docs/producto/reglas/proyectos.md`.

Pendientes humanos (nadie los vio; no se dan por hechos):
- Windows y Linux reales (solo CI), en especial el menú contextual del webview y `open_external_link`.

Deuda declarada:
- Si `hu/` entero es un enlace simbólico dentro del proyecto, la lista muestra sus historias pero el lector no las abre.
