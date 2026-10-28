---
id: HU-0017
titulo: "Descargar e instalar la original en macOS"
estado: en-proceso
fase: requisitos
area: actualizaciones
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [permisos, estados]
reglas: []
depende: []
---

# Descargar e instalar la original en macOS

Como mantenedor que solo trabaja en las instancias
quiero que Code AI Profiles descargue e instale la versión oficial más reciente de la aplicación original
con un botón, sin abrirla, y que luego ponga al día mis instancias detenidas
para no tener que abrir la original solo para que se actualice.

## Petición original

> «la version original de claude yo no la uso, es decir mis sesiones estan solo en las instancias por ende la opcion de "actualizador oficial de la aplicacion original" no es muy util para mi, por ende necesito que verifiques si es posible que el sistema checkee contra la version oficial en internet y valide si es la ultima version la que tengo instalada en el original, de manera que el sistema baje la version y la actualice automaticamente. Si tienes preguntas dimelas» — Braiyan Rodriguez (mantenedor), 2026-10-28

Elecciones, en la misma conversación:

- Automatismo: «Un botón y listo»: un aviso de versión nueva y un clic en «Descargar e instalar» que hace todo
  sin abrir la original.
- Instancias: «Sincronizar las detenidas (Recomendado)»: las detenidas se actualizan solas desde la original
  nueva; las abiertas quedan marcadas y se sincronizan al detenerlas.
- Plataformas: «por ahora solo macos y luego que este implementado crea la hu para windows y linux».

Queda autorizado descargar el paquete oficial que indica el feed y reemplazar con él la aplicación original.

## Lo que ya se comprobó (orquestador, 2026-10-28)

- La app ya consulta el feed oficial `releases.claude.com/api/desktop/darwin/universal/squirrel/update`
  (HU-0009) y solo lee `currentRelease`. Ese mismo feed trae en `releases[].updateTo` la `version`, la `url`
  de un `.zip` en `downloads.claude.ai`, su `sha256` y su `size`.
- La original instalada (`/Applications/Claude.app`, 3.6556.2) pertenece al usuario, no a root, y está firmada
  por «Developer ID Application: Anthropic PBC» con TeamIdentifier `Q6L2SF6YDW`.
- Con eso, descargar, verificar y reemplazar sin privilegios es posible en macOS.

## Problema

«Actualizar original» hoy solo abre la aplicación original y pide usar «Claude > Check for Updates». El
actualizador propio de Claude Desktop solo actúa con la app abierta. Quien no usa la original nunca la abre,
así que se queda atrás, y con ella la fuente desde la que se sincronizan las instancias.

## Alcance

- En macOS, un botón «Descargar e instalar» cuando el feed oficial dice que hay una versión posterior a la
  instalada.
- Descarga del paquete del feed, verificación (tamaño, `sha256`, firma de Anthropic, versión), instalación
  sustituyendo la original con vuelta atrás si algo falla, y progreso visible.
- Al terminar, sincronización de las instancias detenidas desde la original nueva; las que estén abiertas
  quedan pendientes y se sincronizan cuando se detecten detenidas.
- Actualizar `docs/actualizaciones.document.md`, README y CHANGELOG, y el delta de reglas de negocio.

## Fuera de alcance

- Windows y Linux: siguen con el canal oficial actual. Al terminar esta historia se abre la suya.
- Actualizar sin que la persona pulse el botón.
- Cerrar la aplicación original o una instancia por su cuenta.
- Instalar en ubicaciones que exijan permisos de administrador.
- Elegir versión o volver a una anterior.

## Decisiones por defecto (★)

- ★ **D-1 · Verificación antes de tocar nada.** El paquete debe coincidir en tamaño y `sha256` con el feed; la
  app descomprimida debe pasar `codesign --verify --deep --strict` con el mismo TeamIdentifier que la
  instalada (`Q6L2SF6YDW`), ser aceptada por Gatekeeper (`spctl`) y declarar la versión del feed. Si algo no
  cuadra, se descarta y la original no se toca. *Alternativa:* fiarse solo del `sha256` del feed.
- ★ **D-2 · Reemplazo con vuelta atrás.** Se prepara la app nueva en el mismo volumen, se intercambia con la
  original y se conserva la anterior hasta validar la nueva; si la validación final falla, se restaura.
  *Por qué:* es el patrón que ya usa «Sincronizar instancias». *Alternativa:* mover a la papelera la anterior.
- ★ **D-3 · Con la original abierta no se instala.** El botón se deshabilita con «Cierra Claude para
  actualizarla». *Por qué:* reemplazar una app en ejecución puede romperla. *Alternativa:* ofrecer cerrarla.
- ★ **D-4 · Red acotada.** Solo `https` al host de descarga que publica el feed (`downloads.claude.ai`), sin
  seguir redirecciones a otros hosts, con el tamaño del feed como límite, sin cookies ni identificadores (el
  UUID nulo de siempre). La descarga se puede cancelar. *Alternativa:* aceptar cualquier host del feed.
- ★ **D-5 · Sincronización después.** Al terminar bien, se sincronizan las instancias detenidas que estén por
  detrás; las abiertas quedan como «pendiente» y se sincronizan solas cuando un refresco las ve detenidas, con
  un aviso de resultado. *Alternativa:* dejar la sincronización al botón actual.
- ★ **D-6 · El handoff actual se conserva como alternativa.** En macOS «Descargar e instalar» pasa a ser la
  acción principal y «Abrir Claude» queda como secundaria. *Alternativa:* retirarlo.

## Criterios de aceptación

### AC-01 · El botón aparece cuando hay versión nueva

En macOS, cuando el feed oficial dice que hay una versión posterior a la instalada, el dashboard y la página
de la original muestran la versión instalada, la disponible y el botón «Descargar e instalar». Con la original
al día, el botón no aparece.

### AC-02 · Instala sin abrir la original

Al pulsar «Descargar e instalar» con la original cerrada, se ven el progreso de la descarga, la verificación y
la instalación. Al terminar, la original muestra la versión nueva sin haberse abierto y conserva su perfil.

### AC-03 · Si algo falla, la original queda intacta

Sin red, con un paquete que no cuadra (tamaño, `sha256`, firma o versión), sin espacio, sin permiso de
escritura o al cancelar la descarga, la original sigue funcionando con su versión anterior y se ve un mensaje
claro de qué pasó.

### AC-04 · Con la original abierta no se puede

Si la aplicación original está en marcha, el botón está deshabilitado y explica que hay que cerrarla.

### AC-05 · Las instancias se ponen al día

Tras una instalación correcta, las instancias detenidas que estaban por detrás quedan con la versión nueva y
conservan sus perfiles. Las que estaban abiertas aparecen como pendientes y se sincronizan cuando se detectan
detenidas, con un aviso del resultado.

### AC-06 · Nada sale salvo la descarga oficial

La app solo contacta el feed oficial y el host de descarga que indica, sin cookies ni identificadores, y no lee
perfiles, sesiones ni credenciales. En Windows y Linux nada cambia.

## Reglas de negocio afectadas

- Cambia la regla de `docs/actualizaciones.document.md` «el handoff manual no descarga, instala ni reemplaza
  la aplicación original»: en macOS, la persona puede pedir que se descargue y se reemplace. Al cerrar se deja
  su delta en `docs/producto/reglas/`.
- Se mantiene: la original nunca recibe una copia de una instancia.

## Para la persona usuaria

1. **D-3**: con la original abierta no se instala, en lugar de ofrecer cerrarla.
2. **D-5**: las instancias abiertas se sincronizan solas al detectarse detenidas.
3. **D-6**: el handoff «Abrir Claude» se conserva como alternativa.

**Pendiente humano:** una actualización real en macOS, que solo se puede probar cuando el feed publique una
versión posterior a la instalada (o con una original más antigua instalada a propósito).

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
- [ ] Commits en cada repo tocado con `HU: HU-0017`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
