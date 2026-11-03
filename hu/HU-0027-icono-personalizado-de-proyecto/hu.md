---
id: HU-0027
titulo: "Icono personalizado de proyecto"
estado: terminada
fase: cierre
area: proyectos
entrega: 1
prioridad: media
creada: 2026-11-03
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [contrato]
reglas: [RN-04]
depende: []
---

# Icono personalizado de proyecto

Como mantenedor con varios proyectos anclados
quiero ponerle a cada proyecto una imagen propia
para reconocerlo de un vistazo en el sidebar, en la lista y en su página.

## Petición original

> «4) poder agregar icono a un proyecto, actualmente se muestra la primera letra del nombre, esta bien si no tiene
> una imagen o icono personalizado pero se debe dar la posibilidad» — Braiyan Rodriguez (mantenedor), 2026-11-03

Elección, en la misma conversación (2026-11-03): «Imagen que eliges (Recomendado)». Como en las instancias: eliges una
imagen con el selector del sistema, la app guarda una copia en sus propios datos y nunca escribe en el proyecto. Con
«Quitar» vuelve la inicial.

## Problema

Hoy cada proyecto se identifica con su inicial en un cuadrado neutro (`src/features/projects/ProjectInitial.tsx`: 16 px
en el sidebar, 40 en la tarjeta de «Todos los proyectos», 64 en la página). Dos proyectos con la misma inicial («Code AI
Profiles» y «Claude…») no se distinguen en el sidebar plegado. Las instancias ya permiten una imagen propia
(`InstanceEditor`, `instances/icons.rs`); los proyectos no.

## Alcance

- En la página del proyecto, el avatar de 64 px abre el diálogo «Icono del proyecto»: vista previa, «Seleccionar
  imagen» / «Reemplazar imagen», «Quitar», «Cancelar» y «Guardar».
- La imagen es PNG o JPEG, de hasta 5 MiB y 4096 × 4096, igual que en las instancias. La app la normaliza a un PNG
  cuadrado de 512 px y guarda solo esa copia en sus datos, junto al registro de proyectos.
- El icono sustituye a la inicial en el sidebar (desplegado y plegado), en la tarjeta de «Todos los proyectos» y en la
  página del proyecto.
- «Quitar» borra la copia y vuelve la inicial. Desanclar el proyecto también la borra.

## Fuera de alcance

- Elegir un icono de una lista o un color: la persona eligió solo la imagen.
- SVG, GIF o WebP: el formato es el de las instancias (★ D-2).
- Tomar el icono del propio proyecto (un `logo.png`, el favicon de un repo): RN-02 no permite leer esos archivos.
- Recortar o mover la imagen dentro del cuadrado: se recorta al centro, como en las instancias.

## Decisiones por defecto (★)

- ★ **D-1 · El avatar de la página es el botón.** Al pasar el ratón o con foco, el avatar de 64 px muestra un lápiz y el
  tooltip «Cambiar icono»; al pulsarlo se abre el diálogo. *Por qué:* es donde se mira el icono y no añade un cuarto
  botón a «Actualizar · Abrir carpeta · Desanclar». *Alternativa:* un botón «Icono» junto a los otros tres.
- ★ **D-2 · PNG y JPEG, como en las instancias.** *Por qué:* reutiliza `normalized_icon_png` y no suma dependencias; un
  SVG necesita un rasterizador nuevo y puede traer referencias externas. *Alternativa:* añadir SVG con su dependencia.
- ★ **D-3 · Un proyecto roto enseña su estado, no su icono.** Si la carpeta no está o dejó de ser un proyecto v4, se ve
  como hoy (inicial en rojo en 16 px, carpeta tachada en 40 y 64), aunque tenga icono. *Por qué:* el aviso importa más
  que la identidad. *Alternativa:* el icono con un anillo rojo.
- ★ **D-4 · En un proyecto roto el avatar no es botón.** *Por qué:* su página es la de «carpeta no encontrada» y lo útil ahí es reubicarlo o desanclarlo. *Alternativa:*
  permitirlo siempre.

## Criterios de aceptación

### AC-01 · Poner un icono

En la página de un proyecto, al pasar el ratón por el avatar aparece un lápiz. Al pulsarlo se abre «Icono del
proyecto» con la vista previa (la inicial si no tiene icono). «Seleccionar imagen» abre el selector del sistema; al
elegir un PNG o JPEG la vista previa cambia, y «Guardar» cierra el diálogo y pone la imagen en el avatar de la página,
en el sidebar (desplegado y plegado) y en la tarjeta de «Todos los proyectos».

### AC-02 · Quitarlo

Con un icono puesto, el diálogo ofrece «Reemplazar imagen» y «Quitar». «Quitar» y «Guardar» vuelven a la inicial en
los tres sitios. «Cancelar» no cambia nada.

### AC-03 · Imagen no válida

Un archivo que no es PNG ni JPEG, que pesa más de 5 MiB o mide más de 4096 × 4096 deja un error bajo los botones y no
cambia el icono. «Guardar» queda desactivado mientras no haya un cambio válido.

### AC-04 · Persiste y no toca el proyecto

El icono sigue al cerrar y abrir la app y al pulsar «Actualizar». `git status` del proyecto sigue limpio: la copia vive
en los datos de Code AI Profiles. Al desanclar el proyecto, su copia se borra; al volver a anclarlo sale la inicial.

### AC-05 · Proyecto roto

Si la carpeta de un proyecto con icono desaparece, el sidebar, la tarjeta y la página lo muestran roto como hoy, sin el
icono. Al volver la carpeta, vuelve el icono.

## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| RN-02 | no cambia | La imagen la elige la persona con el selector; no se lee nada nuevo del proyecto ni se escribe en él. |
| RN-04 | cambia | Junto a la ruta y el último nombre leído, la app guarda la copia normalizada del icono que la persona eligió. Desanclar la borra. |

## Para la persona usuaria

1. ★ D-1: el avatar como botón, sin un cuarto botón en la cabecera.
2. ★ D-3: un proyecto roto no enseña su icono.
3. ★ D-2: sin SVG.

**Pendiente humano:** cómo se ve una imagen real (logo con transparencia, foto) en 16 px del sidebar, en macOS,
Windows y Linux.

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
- [x] Commits en cada repo tocado con `HU: HU-0027`. **Sin push, sin publicar, sin desplegar**
- [x] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

2026-11-03 · cerró el orquestador sobre el veredicto de Braiyan Rodriguez (mantenedor): «Probado y bien», tras probar
el `.dmg` de `77b2677`. Revisión técnica PASS (`b55cfaf`), con R-1, R-2, O-2 y O-3 corregidas antes de entregar.

SHA por repositorio, con una línea de qué hace cada uno (code-ai-profiles, rama `ajustes-windows-y-sidebar`):

- `3b3092a` · contrato `ProjectSummary.icon` y mocks de navegador.
- `adf610e` · `set_project_icon` / `clear_project_icon`, copia en `project-icons/`, `icon_image.rs` compartido, scope
  del asset protocol.
- `66a318d` · avatar-botón, diálogo «Icono del proyecto» e icono en sidebar, tarjeta y página.
- `3e982eb` · R-2: la copia se borra dentro del candado al quitar y al desanclar.
- `75688d2` · R-1, O-2, O-3: una selección no válida deja «Guardar» desactivado; etiqueta accesible; gana el último
  archivo elegido.
- Gobierno: historia, maqueta, arquitectura, revisión, verificación, grafo y este cierre.

★ aceptadas tal como estaban: D-1 (el avatar es el botón), D-2 (PNG y JPEG), D-3 (roto sin icono), D-4 (roto sin
diálogo), y las de la maqueta (velo con lápiz centrado, aro fino, textos de error de las instancias, sin pista en
reposo).

Pendientes humanos (nadie los vio; no se dan por hechos): el icono en Windows y Linux reales; una imagen real a 16 px
en esas plataformas.

Deuda declarada: bajar de versión pierde el campo `icon` al primer guardado y deja el PNG huérfano (sin barrido de
huérfanos); una lista en vuelo puede traer el icono anterior durante milisegundos.
