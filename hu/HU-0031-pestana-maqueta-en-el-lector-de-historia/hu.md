---
id: HU-0031
titulo: "Pestaña Maqueta en el lector de historias"
estado: en-proceso
fase: implementacion
area: proyectos
entrega: 1
prioridad: media
creada: 2026-11-05
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [contrato, permisos]
reglas: [RN-09]
depende: []
---

# Pestaña Maqueta en el lector de historias

Como mantenedor que revisa las historias de sus proyectos
quiero una pestaña «Maqueta» en el lector de la historia cuando la historia tiene maqueta
para ver la maqueta aprobada sin salir de la app.

## Petición original

> «Las hu pueden tener una maqueta, podrias agregar en el modal de la hu en el tab agregar maqueta y al darle alli poder
> ver la maqueta? ojo solo si tiene maqueta» — Braiyan Rodriguez (mantenedor), 2026-11-05

Va en la rama `fix-ventanas-consola-windows`, en el mismo PR.

## Problema

El lector de historias (`src/features/projects/HistoryReaderDialog.tsx`, HU-0025) muestra en pestañas `hu.md`,
`arquitectura.md`, `verificacion.md` y `seguimiento.md`, que lee Rust (`src-tauri/src/projects/reader.rs`, solo
Markdown, 512 KiB). Las historias con maqueta la guardan en `hu/<carpeta>/diseno/maqueta.html` y hoy no se puede ver
desde la app.

## Alcance

- Una pestaña «Maqueta», la última, solo si existe `diseno/maqueta.html` en la carpeta de la historia.
- Al abrirla, la maqueta se ve dentro del lector, estática y aislada de la app, con un botón «Abrir en el navegador»
  que la abre completa (con sus scripts) en el navegador del sistema.

## Fuera de alcance

- Otras maquetas o imágenes de `diseno/` (capturas, PNG sueltos), y los archivos que la maqueta enlaza a su lado: no se
  cargan.
- Editar la maqueta.

## Decisiones por defecto (★)

- ★ **D-1 · Solo `diseno/maqueta.html`.** Es el nombre que usa el método. *Alternativa:* cualquier `.html` de `diseno/`.
- ★ **D-2 · Estática dentro de la app y completa en el navegador.** Dentro del lector la maqueta se pinta en un marco
  aislado y sin scripts: no puede hablar con la app ni cargar nada de internet. Un botón «Abrir en el navegador» abre ese
  mismo `maqueta.html` (ya validado) en el navegador del sistema, donde funcionan sus botones de estado y tema. La app no
  gana permisos: lo abre Rust. *Por qué:* permitir sus scripts dentro de la app la abriría a ataques (revisión del
  arquitecto). Elección del mantenedor: «Estática + abrir en navegador».
- ★ **D-3 · Tope de 1 MiB para la maqueta.** Hasta 1 MiB se muestra; si pasa de 1 MiB no se pinta y la pestaña ofrece
  solo «Abrir en el navegador». Los `.md` siguen en 512 KiB. Mismas protecciones: no se siguen enlaces simbólicos fuera de
  la carpeta de la historia; si no se puede leer por otro motivo, el aviso de ilegible con «Reintentar». Elección del
  mantenedor: «subir a 1mb y si pasa de eso que no se muestre sino que salga el link de abrir en navegador».
- ★ **D-4 · La maqueta ocupa todo el cuerpo del lector**, sin el ancho de lectura de los `.md`.

## Criterios de aceptación

### AC-01 · Solo si tiene maqueta

En una historia con `diseno/maqueta.html`, el lector muestra la pestaña «Maqueta» al final. En una sin maqueta no
aparece.

### AC-02 · Ver la maqueta

Al pulsar «Maqueta», la maqueta se ve dentro del lector, a todo el ancho, con su propio estilo y sin scripts. «Abrir
en el navegador» la abre en el navegador del sistema, con sus botones funcionando.

### AC-03 · Aislada

La maqueta no puede abrir ventanas, cargar recursos de internet ni acceder a la app. Una maqueta que lo intenta se ve
igual, sin esos recursos.

### AC-04 · Ilegible

Una maqueta de más de 1 MiB no se pinta: la pestaña dice que es demasiado grande para verla aquí y ofrece «Abrir en el
navegador». Un enlace simbólico que sale de la historia muestra el aviso de archivo ilegible con «Reintentar» y no se
puede abrir en el navegador.

## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| RN-09 | nace | El lector de una historia muestra `diseno/maqueta.html` en una pestaña «Maqueta» si existe, aislada de la app y sin red. |

## Para la persona usuaria

1. ★ D-2: estática en la app y completa en el navegador.
2. ★ D-1: solo `maqueta.html`.

**Pendiente humano:** ver una maqueta real de un proyecto en macOS, Windows y Linux.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0031`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
