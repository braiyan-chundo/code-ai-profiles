# Actualizaciones de la aplicación original y las instancias

Documento funcional relacionado con [HU-0002](hu/HU-0002-actualizar-aplicacion-original-y-metadatos-por-modelo-y-proveedor.md) y [HU-0003](hu/HU-0003-transferencias-conscientes-de-artefactos-actualizacion-disponible-y-uso-en-vivo.md).

## Dos operaciones independientes

Code AI Profiles distingue deliberadamente la aplicación original de las instancias administradas:

| Operación | Origen | Resultado | Qué permanece intacto |
| --- | --- | --- | --- |
| Actualizar original | Canal oficial de Claude Desktop | Abre la descarga oficial o las instrucciones de instalación para que el usuario complete el proceso | Perfiles, sesiones e instancias administradas |
| Actualizar instancias | Versión de la aplicación original ya instalada | Sincroniza cada copia administrada que esté desactualizada | Perfil y sesiones de cada instancia |

«Actualizar original» no encadena una actualización de instancias. La comprobación de disponibilidad y el handoff manual son independientes: la primera solo determina si existe una versión posterior; la segunda abre el canal oficial para que el usuario complete la instalación. Cuando el usuario termina esa instalación y vuelve a Code AI Profiles, el escaneo al recuperar el foco detecta la versión local. Si una instancia quedó atrás, el flujo separado «Actualizar instancias» la ofrece como candidata.

En Linux las instancias apuntan al binario administrado por el sistema, por lo que siguen la actualización del paquete en lugar de copiar una aplicación nueva.

## Nombre y estado de la aplicación original

El dashboard usa el nombre real detectado desde metadatos locales y muestra «Aplicación compatible» solo si no puede obtenerlo. El mismo nombre se conserva en la tarjeta original, búsqueda, perfiles de transferencia y estado visible.

- macOS: `CFBundleDisplayName`, después `CFBundleName` y finalmente el nombre legible del bundle.
- Windows: `ProductName` consultado mediante PowerShell y después el nombre legible del ejecutable.
- Linux: `Name` de un desktop entry en ubicaciones estándar y después el nombre legible del binario.

La detección se limita a metadatos de la instalación. No abre perfiles ni lee credenciales, prompts, respuestas o transcripts para obtener el nombre.

## Flujo de actualización original

1. El botón «Actualizar original» aparece únicamente dentro de la tarjeta de una instalación fuente detectada. Dentro de esa tarjeta se deshabilita solo mientras existe una operación en curso; la ausencia del perfil original y su estado `Missing` no bloquean la actualización si la fuente existe.
2. El modal muestra el nombre, la versión local conocida y la plataforma. También explica que Code AI Profiles entregará el proceso al canal oficial y que la instalación debe completarse manualmente.
3. La confirmación invoca un comando que vuelve a validar la instalación fuente y después abre una URL constante seleccionada internamente. El comando no acepta URL ni parámetros proporcionados por el usuario.
4. El navegador, descargador o gestor del sistema toma el control. Code AI Profiles muestra el mensaje devuelto por el backend o un error claro si el handler no se puede abrir.
5. Al volver a la ventana, el escaneo existente actualiza la versión local y, si corresponde, ofrece por separado la actualización de instancias.

El modal puede cerrarse con Escape cuando no está procesando el handoff. Mientras abre el canal oficial, los controles de cierre y confirmación permanecen deshabilitados para evitar acciones duplicadas.

La existencia del perfil original no es una precondición de actualización. `sourcePath` identifica la instalación fuente; el estado `Missing` también puede significar que falta el perfil, por lo que no se usa para deshabilitar el botón. Como defensa ante llamadas IPC directas o un estado de UI desactualizado, el backend ejecuta primero un guard de fuente: si ya no detecta la instalación, devuelve «No se encontró la instalación original de la aplicación compatible.» antes de resolver la plataforma, elegir el destino o abrir el handler.

## Detección de versión disponible

El dashboard mantiene `sourceVersion` como la versión instalada y expone por separado el estado de actualización: `current`, `available` o `unavailable`, junto con la versión más reciente, fecha de comprobación, indicador `stale` y origen cuando existan. Solo `available` muestra un aviso sutil; su acción reutiliza el handoff manual «Actualizar original» y no descarga ni instala nada.

| Plataforma | Fuente de metadata | Límites |
| --- | --- | --- |
| macOS y Windows | Feed oficial de escritorio de `releases.claude.com` para plataforma y arquitectura | UUID nulo fijo, timeout total de 5 s, redirects deshabilitados, máximo 256 KiB y validación de versión. La app no sigue ni descarga `updateTo.url`. |
| Linux | `apt-cache policy claude-desktop` local y `dpkg --compare-versions` | Sin `sudo`, `apt update`, descarga ni modificación del repositorio. Sin candidato, el estado es `unavailable`. |

El resultado exitoso se guarda localmente por seis horas. Puede conservarse como último resultado `stale` durante hasta siete días si la fuente deja de responder. La caché contiene solo versión, fecha, plataforma y origen; no guarda IDs, cookies, tokens ni credenciales. Un timeout, feed inválido o caché corrupta no bloquea el dashboard ni inventa un aviso de disponibilidad.

## Comportamiento por plataforma

| Plataforma | Acción | Canal |
| --- | --- | --- |
| macOS x64 o Apple Silicon | «Abrir descarga oficial» | DMG universal mediante el redirect oficial de Claude |
| Windows x64 | «Abrir descarga oficial» | Instalador x64 mediante el redirect oficial de Claude |
| Windows ARM64 | «Abrir descarga oficial» | Instalador ARM64 mediante el redirect oficial de Claude |
| Linux | «Ver instrucciones oficiales» | Guía oficial de instalación y repositorio apt |

macOS usa `/usr/bin/open`, Windows el handler de URL de `rundll32.exe` y Linux `xdg-open`. Una plataforma o arquitectura no contemplada devuelve «actualización oficial no soportada» en vez de elegir un destino aproximado.

La selección de destinos tiene pruebas unitarias, pero las ramas nativas Windows y Linux no fueron compiladas durante la revisión de HU-0002 realizada en macOS.

## Límites de seguridad

El handoff manual:

- no vuelve a consultar ni depende de que exista una versión remota más nueva;
- no descarga ni ejecuta binarios dentro de Code AI Profiles;
- no reemplaza el bundle o ejecutable original;
- no cierra la aplicación original ni las instancias;
- no eleva permisos ni ejecuta comandos de instalación;
- no modifica perfiles, sesiones o credenciales;
- no omite las políticas de actualización administradas por una organización.

La detección de disponibilidad consulta únicamente metadata de versión. Para macOS y Windows emplea un UUID nulo fijo, no almacena cookies y no envía credenciales, tokens, telemetría o analítica. La versión más reciente no ejecuta ninguna acción por sí misma: el usuario conserva el control del handoff oficial.

Las URLs son constantes del backend. El resultado IPC solamente distingue `download` de `instructions` y contiene un mensaje adecuado para la interfaz. El guard de fuente solo conserva una ruta detectada o devuelve un error: no lee ni escribe perfiles.

## Errores y limitaciones

- Si la aplicación fuente no está detectada, la tarjeta no se muestra y una invocación IPC directa falla antes de abrir el handler.
- Si la fuente está detectada pero falta el perfil original, el estado puede ser `Missing`; aun así, «Actualizar original» permanece disponible mientras no exista otra operación en curso.
- Si falta el handler del sistema, el proceso no arranca o termina con un estado fallido, se muestra un error y no se intenta un canal alternativo no oficial.
- En Linux sin repositorio apt configurado se abren las instrucciones; Code AI Profiles no configura el sistema.
- Una política enterprise puede impedir o condicionar la actualización en el instalador oficial.
- Los metadatos dependen de herramientas y ubicaciones estándar: PowerShell y `ProductName` en Windows, desktop entries conocidos en Linux y el plist del bundle en macOS.
- Los endpoints de descarga pueden evolucionar; deben revisarse contra fuentes oficiales cuando cambie el proveedor.
- El feed de metadata de disponibilidad es un servicio externo: puede cambiar o no responder. La caché puede mostrar un resultado anterior como `stale`, y un fallo sin caché válida se representa como `unavailable` sin bloquear la aplicación.

## Referencias oficiales

- [Descargar Claude Desktop](https://claude.com/download)
- [Instalar Claude Desktop](https://support.claude.com/en/articles/10065433-install-claude-desktop)
- [Desplegar Claude Desktop para macOS](https://support.claude.com/en/articles/12611117-deploy-claude-desktop-for-macos)
- [Redirect oficial de macOS universal](https://claude.ai/api/desktop/darwin/universal/dmg/latest/redirect)
- [Redirect oficial de Windows x64](https://claude.ai/api/desktop/win32/x64/setup/latest/redirect)
- [Redirect oficial de Windows ARM64](https://claude.ai/api/desktop/win32/arm64/setup/latest/redirect)
- Feed de metadata de escritorio: `https://releases.claude.com/api/desktop/{platform}/{arch}/squirrel/update`
