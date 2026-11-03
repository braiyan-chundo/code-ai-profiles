---
id: HU-0028
titulo: "Distintivo de la app original en el icono de instancia"
estado: en-proceso
fase: verificacion
area: instancias
entrega: 1
prioridad: media
creada: 2026-11-03
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [plataforma]
reglas: [RN-01, RN-02]
depende: []
---

# Distintivo de la app original en el icono de instancia

Como mantenedor con varias instancias con icono propio
quiero que cada icono lleve en su esquina inferior derecha el icono de la aplicación que clona
para saber de un vistazo, en el Dock y en la app, que esa ventana es una copia de Claude.

## Petición original

> «al momento de crear el icono o imagen de la instancia que se ve en la app y en el dock me gustaria que a cada imagen
> le agregues en la esquina inferior derecha el icono de claude, bueno en este caso del software que clona, en este
> caso es claude» — Braiyan Rodriguez (mantenedor), 2026-11-03

Va en la rama `ajustes-windows-y-sidebar`, en el mismo PR que los ajustes de Windows, el sidebar y la HU-0027.

## Problema

Una instancia con icono personalizado pierde en el Dock (macOS) y en la app cualquier pista de que es Claude: se ve
solo la imagen elegida (`branding/icon.png`, 512 px). El Dock la recibe con la plantilla de macOS
(`macos_icon::dock_icon_png`: cuerpo de 824 px con esquinas redondeadas y sombra en un lienzo de 1024 px). En la app
la pinta `InstanceAvatar` (16 px en el sidebar y en el diálogo de actualización, 32 en «Uso por instancia», 64 en la
página de la instancia), cuya esquina inferior derecha ya ocupa el punto de estado.

## Alcance

- El distintivo es el icono de la aplicación original instalada, leído de su instalación (solo el archivo del icono).
- En macOS, el icono del Dock de cada instancia con icono propio lleva el distintivo en la esquina inferior derecha.
- En la app, los avatares de 32 y 64 px y la vista previa del editor lo llevan en el mismo sitio. El punto de estado
  pasa a la esquina superior derecha en esos avatares.
- Las instancias que ya tienen icono lo reciben sin hacer nada: en la app al refrescar; en el Dock la próxima vez que
  se aplica el icono (al abrir la instancia, al sincronizar o al reintentar).

## Fuera de alcance

- Las instancias sin icono propio: ya se ven con el icono de Claude.
- La original: no lleva distintivo.
- La barra de tareas de Windows y el lanzador `.desktop` de Linux: el ejecutable conserva su icono firmado (Windows) y
  el lanzador opcional sigue con la imagen elegida (★ D-6).
- Elegir otro distintivo, moverlo o apagarlo.

## Decisiones por defecto (★)

- ★ **D-1 · El distintivo es el icono real de la original instalada.** En macOS, el `.icns` que declara su
  `Info.plist`; en Windows, el icono de `Claude.exe`; en Linux, el icono del paquete. Se guarda una copia PNG en los
  datos de la app y se renueva si la original cambia. *Por qué:* «del software que clona»; sigue al icono si Anthropic
  lo cambia y el repositorio no incluye la marca de nadie. *Alternativa:* una imagen fija dentro de la app.
- ★ **D-2 · La imagen guardada no cambia; el distintivo se añade al mostrarla.** *Por qué:* quitar o cambiar la imagen
  sigue funcionando como hoy, las instancias existentes lo reciben sin volver a elegir imagen y el distintivo no se
  recorta con las esquinas redondeadas del Dock. *Alternativa:* pegarlo en `branding/icon.png` al guardar.
- ★ **D-3 · Tamaño y sitio.** Un 36 % del lado del icono, en la esquina inferior derecha, montado sobre la esquina del
  cuerpo y con una sombra suave para separarlo. *Alternativa:* 28 % o 44 %.
- ★ **D-4 · En la app, el punto de estado sube a la esquina superior derecha** en los avatares con distintivo. *Por
  qué:* la esquina inferior derecha es la que pidió la persona. *Alternativa:* el punto encima del distintivo.
- ★ **D-5 · Sin distintivo en 16 px** (sidebar y diálogo de actualización): ahí mediría 6 px y taparía la imagen.
  *Alternativa:* llevarlo también ahí.
- ★ **D-6 · Windows y Linux solo dentro de la app.** *Por qué:* Windows no deja cambiar el icono de la barra de tareas
  sin tocar el ejecutable firmado, y en Linux el lanzador es opcional. *Alternativa:* generar también el `.desktop`
  con el distintivo.
- ★ **D-7 · Si el icono de la original no se puede leer, no hay distintivo** y nada falla.

## Criterios de aceptación

### AC-01 · Dock (macOS)

Con una instancia con icono propio, al abrirla, su icono en el Dock y en el Finder lleva el icono de Claude en la
esquina inferior derecha. La firma de Anthropic de la copia no cambia (como en la HU-0020).

### AC-02 · En la app

La página de la instancia (64 px), «Uso por instancia» (32 px) y la vista previa del editor muestran el distintivo en
la esquina inferior derecha y el punto de estado arriba a la derecha. El sidebar y el diálogo de actualización (16 px)
siguen como hoy.

### AC-03 · Instancias que ya tenían icono

Sin elegir imagen de nuevo, las instancias con icono muestran el distintivo en la app al abrirla y en el Dock tras
abrirlas o pulsar «Reintentar».

### AC-04 · Quitar y cambiar

«Quitar» el icono deja la instancia como la original, sin distintivo. Cambiar la imagen conserva el distintivo.

### AC-05 · Sin icono de la original

Si el icono de la original no se puede leer, la instancia se ve con su imagen sin distintivo y no aparece ningún
error.

## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| RN-01 | cambia | En macOS el icono del Dock de una instancia es su imagen con el distintivo de la original. |
| RN-02 | nace | Una instancia con icono propio lleva el icono de la aplicación original en la esquina inferior derecha, en el Dock y en la app. La imagen que eligió la persona no cambia. |

## Para la persona usuaria

1. ★ D-3: tamaño del distintivo.
2. ★ D-4: punto de estado arriba a la derecha.
3. ★ D-5: sin distintivo en 16 px.

**Pendiente humano:** cómo se ve en el Dock real, en claro y oscuro, y en la app en Windows y Linux.

## Definición de Preparado

- [ ] Petición literal, problema, alcance y fuera de alcance escritos
- [ ] Criterios numerados y observables desde la interfaz
- [ ] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0028`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
