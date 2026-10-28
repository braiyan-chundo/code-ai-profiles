---
id: HU-0018
titulo: "Descargar e instalar la original en Windows y Linux"
estado: en-espera
fase: requisitos
area: actualizaciones
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [permisos, estados]
reglas: []
depende: [HU-0017]
---

# Descargar e instalar la original en Windows y Linux

Como mantenedor que solo trabaja en las instancias
quiero el mismo «Descargar e instalar» de macOS en Windows y Linux
para que la original y las instancias se pongan al día sin abrir la original en ninguna plataforma.

## Petición original

> «por ahora solo macos y luego que este implementado crea la hu para windows y linux» — Braiyan Rodriguez (mantenedor), 2026-10-28

> «acepto lo de crear las de windows y linux cuando la de mac este implementada» — Braiyan Rodriguez (mantenedor), 2026-10-28

Se abre al terminar la implementación de la HU-0017 (macOS), que queda pendiente de su prueba real.

## Problema

Desde la HU-0017, en macOS la app descarga, verifica e instala la versión oficial con un clic y sincroniza las
instancias detenidas. En Windows y Linux, «Actualizar original» sigue siendo un handoff: abre la descarga
oficial (Windows) o las instrucciones apt (Linux), y la persona tiene que completar la instalación.

## Lo que se sabe de partida

- **Windows.** El feed oficial (`releases.claude.com/api/desktop/win32/{x64,arm64}/squirrel/update`) es de
  Squirrel. La original vive en `%LocalAppData%\AnthropicClaude` con su `Update.exe`, en carpetas versionadas
  (`app-<versión>`), sin permisos de administrador. Las instancias de Windows son copias administradas, como en
  macOS. Hay que comprobar qué paquete anuncia el feed (nupkg completo o delta), su hash y la firma
  Authenticode de Anthropic.
- **Linux.** La original es el paquete `claude-desktop` de apt. Hoy se consulta `apt-cache policy` sin `sudo`.
  Instalar exige privilegios de root. Las instancias de Linux apuntan al binario del sistema, así que se
  actualizan con el paquete y no hay nada que sincronizar.

## Alcance

- Windows: «Descargar e instalar» con descarga del paquete del feed, verificación (tamaño, hash, firma
  Authenticode de Anthropic) e instalación sin abrir la original; después, sincronización de las instancias
  detenidas, igual que en macOS.
- Linux: «Instalar actualización» que actualiza el paquete `claude-desktop` por apt.
- Reutilizar el contrato, la interfaz y la sincronización pendiente de la HU-0017.
- Actualizar `docs/actualizaciones.document.md`, README y CHANGELOG.

## Fuera de alcance

- Cambiar el flujo de macOS.
- Configurar el repositorio apt de Anthropic en un Linux que no lo tenga.
- Otras distribuciones de Linux sin apt.

## Decisiones por defecto (★)

- ★ **D-1 · Windows con el actualizador de Squirrel.** Se descarga y verifica el paquete del feed y se aplica con
  el `Update.exe` de la original instalada, que ya sabe instalarlo en su carpeta de usuario sin
  administrador. *Alternativa:* el instalador oficial completo en modo silencioso.
- ★ **D-2 · Linux con la contraseña del sistema.** Se ejecuta `pkexec apt-get install --only-upgrade
  claude-desktop` y el sistema pide la contraseña en su propio diálogo; Code AI Profiles nunca la ve.
  *Alternativa:* no instalar en Linux y mostrar el comando para copiarlo.
- ★ **D-3 · Misma interfaz que macOS.** El mismo botón, el mismo panel de progreso y los mismos mensajes; en Linux
  no hay fase de descarga propia (la hace apt).

## Criterios de aceptación

### AC-01 · Windows instala sin abrir la original

En Windows x64 y ARM64, con una versión nueva en el feed y la original cerrada, «Descargar e instalar» descarga,
verifica e instala; la original muestra la versión nueva sin haberse abierto y conserva su perfil.

### AC-02 · Windows deja la original intacta si algo falla

Sin red, con un paquete que no cuadra (tamaño, hash o firma), al cancelar o con un fallo del actualizador, la
original sigue con su versión anterior y se ve qué pasó.

### AC-03 · Windows sincroniza las instancias

Tras instalar, las instancias detenidas quedan con la versión nueva y las abiertas como pendientes, igual que
en macOS.

### AC-04 · Linux actualiza el paquete con la contraseña del sistema

En Linux con el repositorio apt de Anthropic configurado y un candidato más nuevo, «Instalar actualización» pide
la contraseña en el diálogo del sistema y, al aceptarla, la original y las instancias quedan con la versión
nueva. Si se cancela el diálogo o apt falla, nada cambia y se ve el motivo.

### AC-05 · Con la original abierta no se puede

En las dos plataformas, si la original está en marcha, el botón está deshabilitado y lo explica.

## Reglas de negocio afectadas

- **Regla modificada (confirmado por el mantenedor, 2026-10-28, «Pedir contraseña»):** la HU-0017 fija «no se
  piden privilegios» y la documentación dice que en Linux Code AI Profiles «no ejecuta `sudo` ni modifica el
  sistema». En Linux, para instalar la actualización de la original, la app pide privilegios a través del
  diálogo del sistema (`pkexec`), sin ver nunca la contraseña. Se deja su delta al cerrar.
- La regla de macOS de la HU-0017 se extiende a Windows.

## Para la persona usuaria

1. **D-1**: en Windows, el `Update.exe` de Squirrel o el instalador oficial en silencio.

**Pendiente humano:** probar en una máquina Windows y en una Linux reales, con una versión nueva publicada.

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
- [ ] Commits en cada repo tocado con `HU: HU-0018`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
