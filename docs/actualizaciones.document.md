# Actualizaciones de la aplicación original y las instancias

Documento funcional relacionado con [HU-0002](hu/HU-0002-actualizar-aplicacion-original-y-metadatos-por-modelo-y-proveedor.md), [HU-0003](hu/HU-0003-transferencias-conscientes-de-artefactos-actualizacion-disponible-y-uso-en-vivo.md), [HU-0004](hu/HU-0004-sincronizacion-desde-la-instancia-mas-reciente-cierre-robusto-artefactos-locales-e-identidad-visual.md) y [HU-0009](hu/HU-0009-estado-oficial-de-actualizacion-y-refresco-de-versiones.md).

## Dos operaciones independientes

Code AI Profiles distingue deliberadamente la aplicación original de las instancias administradas:

| Operación | Origen | Resultado | Qué permanece intacto |
| --- | --- | --- | --- |
| Actualizar original | Canal oficial de Claude Desktop | En macOS abre la aplicación original validada y guía al actualizador nativo; en Windows y Linux conserva el canal oficial correspondiente | Perfiles, sesiones e instancias administradas |
| Sincronizar instancias | La instalación local válida más reciente: original o una instancia administrada | Sincroniza cada copia administrada detenida que esté detrás de esa fuente | Perfil y sesiones de cada instancia, y siempre la original |

«Actualizar original» no encadena una sincronización de instancias. La comprobación de disponibilidad y el handoff manual son independientes: la primera solo determina si existe una versión posterior; la segunda entrega el proceso al canal oficial para que el usuario complete la instalación. Cuando el usuario vuelve a Code AI Profiles, se solicita una actualización dirigida de versiones y topología, sin iniciar el escaneo completo, sin modal de progreso y sin releer sesiones, uso o almacenamiento. Ese retorno puede omitir una vez el cooldown general y se deduplica si llegan juntos los eventos de foco y visibilidad. Si una instancia quedó atrás, el flujo separado «Sincronizar instancias» la ofrece como candidata.

También puede suceder la situación inversa: una instancia gestionada tiene una versión local mayor que la original. El dashboard calcula una topología local para elegir la mayor versión válida instalada, pero esa diferencia no prueba por sí sola una actualización oficial, un canal ni un rollout. Solo metadata oficial fresca puede afirmar que existe una actualización o que la original está al día; de otro modo se muestra incertidumbre o una diferencia local de manera neutral. La original conserva su único CTA oficial y nunca recibe una copia de una instancia. La instancia más reciente solo puede ser fuente para otras instancias administradas que estén detenidas.

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
3. La confirmación vuelve a validar la instalación fuente. En macOS abre únicamente el bundle original validado con `/usr/bin/open -n -a <ruta>` y muestra la guía «Claude > Check for Updates». No abre una instancia administrada, no descarga un DMG fijo y no automatiza menús nativos. Windows y Linux conservan el handler oficial apropiado; el comando no acepta URL ni parámetros proporcionados por el usuario.
4. La aplicación original, navegador o gestor del sistema toma el control según la plataforma. Code AI Profiles muestra el mensaje devuelto por el backend o un error claro si el handoff no se puede completar.
5. Desde el inicio del handoff se registra un posible blur, focus o cambio de visibilidad. Al volver después de un éxito confirmado, una actualización dirigida relee versión y topología local y luego realiza una sola comprobación oficial asíncrona ligada a la versión detectada. Un fallo de esa comprobación oficial no revierte la versión local. Si corresponde, el flujo separado ofrece la sincronización de instancias.

El modal puede cerrarse con Escape cuando no está procesando el handoff. Mientras abre el canal oficial, los controles de cierre y confirmación permanecen deshabilitados para evitar acciones duplicadas.

La existencia del perfil original no es una precondición de actualización. `sourcePath` identifica la instalación fuente; el estado `Missing` también puede significar que falta el perfil, por lo que no se usa para deshabilitar el botón. Como defensa ante llamadas IPC directas o un estado de UI desactualizado, el backend ejecuta primero un guard de fuente: si ya no detecta la instalación, devuelve «No se encontró la instalación original de la aplicación compatible.» antes de resolver la plataforma, elegir el destino o abrir el handler.

## Sincronizar instancias desde la versión instalada más reciente

El escaneo construye una topología que incluye versión local máxima, su fuente, instancias desactualizadas, si la original está detrás y una razón segura si no hay fuente utilizable. Antes de copiar bytes, el backend vuelve a validar la fuente y cada destino.

- La fuente administrada debe estar detenida, dentro de su root gestionado y superar la validación de instalación e identidad del proveedor.
- Cada destino debe estar detenido, existir dentro de su root, ser compatible y tener una versión inferior. La fuente y los destinos que ya tienen igual o mayor versión se omiten.
- Cada destino recibe un resultado independiente: actualizado, omitido o fallido. La operación usa staging/swap/rollback por destino y conserva su perfil.
- La aplicación original nunca es un destino. Aunque una instancia tenga una versión mayor, la original se actualiza exclusivamente mediante su canal oficial.
- Linux conserva el paquete o binario compartido de la instalación del sistema; no duplica bytes para este flujo.

La fuente puede dejar de ser válida entre el escaneo y la confirmación. En ese caso la operación se rechaza y la interfaz pide volver a escanear, en vez de sincronizar desde una ruta obsoleta.

## Detección de versión disponible

El dashboard mantiene `sourceVersion` como la versión instalada y expone por separado el estado de actualización oficial, junto con la versión más reciente, fecha de comprobación, indicador `stale` y origen cuando existan. Solo metadata oficial fresca puede afirmar `available` o `current`: `available` conserva un aviso y su acción reutiliza el handoff manual «Actualizar original»; `current` con una instancia local mayor comunica esa diferencia sin declarar que la original esté atrasada; metadata `stale`, indisponible, errónea o desconocida comunica incertidumbre. Ninguno de estos estados descarga ni instala nada.

| Plataforma | Fuente de metadata | Límites |
| --- | --- | --- |
| macOS y Windows | Feed oficial de escritorio de `releases.claude.com` para plataforma y arquitectura | UUID nulo fijo, timeout total de 5 s, redirects deshabilitados, máximo 256 KiB y validación de versión. La app no sigue ni descarga `updateTo.url`. |
| Linux | `apt-cache policy claude-desktop` local y `dpkg --compare-versions` | Sin `sudo`, `apt update`, descarga ni modificación del repositorio. Sin candidato, el estado es `unavailable`. |

El resultado exitoso se guarda localmente por seis horas y queda ligado a la versión instalada con la que se obtuvo. Puede conservarse como último resultado `stale` durante hasta siete días si la fuente deja de responder, pero no afirma un estado actual. La caché contiene solo versión, fecha, plataforma y origen; no guarda IDs, cookies, tokens ni credenciales. Un timeout, feed inválido, caché corrupta o caché de otra versión instalada no bloquea el dashboard ni inventa un aviso de disponibilidad.

## Comportamiento por plataforma

| Plataforma | Acción | Canal |
| --- | --- | --- |
| macOS x64 o Apple Silicon | «Abrir Claude Desktop» | Bundle original detectado y validado; el usuario selecciona `Claude > Check for Updates` |
| Windows x64 | «Abrir descarga oficial» | Instalador x64 mediante el redirect oficial de Claude |
| Windows ARM64 | «Abrir descarga oficial» | Instalador ARM64 mediante el redirect oficial de Claude |
| Linux | «Ver instrucciones oficiales» | Guía oficial de instalación y repositorio apt |

macOS usa `/usr/bin/open -n -a` con la ruta de la instalación original validada; Windows usa el handler de URL de `rundll32.exe` y Linux `xdg-open`. Una plataforma o arquitectura no contemplada devuelve «actualización oficial no soportada» en vez de elegir un destino aproximado.

La selección de destinos tiene pruebas unitarias, pero las ramas nativas Windows y Linux no fueron compiladas durante la revisión de HU-0002 realizada en macOS.

## Límites de seguridad

El handoff manual:

- no descarga, instala ni reemplaza la aplicación original por sí mismo;
- no automatiza el menú de actualización nativo, accesibilidad ni AppleScript;
- no cierra la aplicación original ni las instancias;
- no eleva permisos ni ejecuta comandos de instalación;
- no modifica perfiles, sesiones o credenciales;
- no omite las políticas de actualización administradas por una organización.

La detección de disponibilidad consulta únicamente metadata de versión. Para macOS y Windows emplea un UUID nulo fijo, no almacena cookies y no envía credenciales, tokens, telemetría o analítica. La versión más reciente no ejecuta ninguna acción por sí misma: el usuario conserva el control del handoff oficial.

Las URLs usadas por Windows y Linux son constantes del backend. En macOS el resultado IPC devuelve instrucciones después de abrir la aplicación original validada. El guard de fuente solo conserva una ruta detectada o devuelve un error: no lee ni escribe perfiles.

## Errores y limitaciones

- Si la aplicación fuente no está detectada, la tarjeta no se muestra y una invocación IPC directa falla antes de abrir el handler.
- Si la fuente está detectada pero falta el perfil original, el estado puede ser `Missing`; aun así, «Actualizar original» permanece disponible mientras no exista otra operación en curso.
- Si falta el handler del sistema, la ruta original no valida, el proceso no arranca o termina con un estado fallido, se muestra un error y no se intenta un canal alternativo no oficial.
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
