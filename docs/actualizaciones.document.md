# Actualizaciones de la aplicación original y las instancias

Documento funcional relacionado con [HU-0002](hu/HU-0002-actualizar-aplicacion-original-y-metadatos-por-modelo-y-proveedor.md), [HU-0003](hu/HU-0003-transferencias-conscientes-de-artefactos-actualizacion-disponible-y-uso-en-vivo.md), [HU-0004](hu/HU-0004-sincronizacion-desde-la-instancia-mas-reciente-cierre-robusto-artefactos-locales-e-identidad-visual.md) y [HU-0009](hu/HU-0009-estado-oficial-de-actualizacion-y-refresco-de-versiones.md), y con [HU-0017](hu/HU-0017-descargar-e-instalar-la-original-en-maco/hu.md) para la instalación directa en macOS.

## Dos operaciones independientes

Code AI Profiles distingue deliberadamente la aplicación original de las instancias administradas:

| Operación | Origen | Resultado | Qué permanece intacto |
| --- | --- | --- | --- |
| Descargar e instalar (macOS) | Paquete oficial que publica el feed | Descarga, verifica y reemplaza la original sin abrirla; después sincroniza las instancias detenidas | Perfiles y sesiones de la original y de las instancias |
| Actualizar original (handoff) | Canal oficial de Claude Desktop | En macOS abre la aplicación original validada y guía al actualizador nativo; en Windows y Linux conserva el canal oficial correspondiente | Perfiles, sesiones e instancias administradas |
| Sincronizar instancias | La instalación local válida más reciente: original o una instancia administrada | Sincroniza cada copia administrada detenida que esté detrás de esa fuente | Perfil y sesiones de cada instancia, y siempre la original |

El handoff «Actualizar original» no encadena una sincronización de instancias; «Descargar e instalar» en macOS sí (ver más abajo). La comprobación de disponibilidad y el handoff manual son independientes: la primera solo determina si existe una versión posterior; la segunda entrega el proceso al canal oficial para que el usuario complete la instalación. Cuando el usuario vuelve a Code AI Profiles, se solicita una actualización dirigida de versiones y topología, sin iniciar el escaneo completo, sin modal de progreso y sin releer sesiones, uso o almacenamiento. Ese retorno puede omitir una vez el cooldown general y se deduplica si llegan juntos los eventos de foco y visibilidad. Si una instancia quedó atrás, el flujo separado «Sincronizar instancias» la ofrece como candidata.

También puede suceder la situación inversa: una instancia gestionada tiene una versión local mayor que la original. El dashboard calcula una topología local para elegir la mayor versión válida instalada, pero esa diferencia no prueba por sí sola una actualización oficial, un canal ni un rollout. Solo metadata oficial fresca puede afirmar que existe una actualización o que la original está al día; de otro modo se muestra incertidumbre o una diferencia local de manera neutral. La original nunca recibe una copia de una instancia: solo se actualiza por su canal oficial o, en macOS, con el paquete oficial del feed. La instancia más reciente solo puede ser fuente para otras instancias administradas que estén detenidas.

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

## Descargar e instalar la original en macOS

Desde HU-0017, cuando el feed oficial anuncia una versión posterior a la instalada, el dashboard y la página de la original muestran «Descargar e instalar» como acción principal; «Abrir Claude» (el handoff) queda como secundaria. Es un solo clic, sin diálogo de confirmación, y la original no se abre.

1. **Preparar.** Se vuelve a leer el feed y se comprueba que la versión anunciada es la que vio la persona, que la original detectada pertenece al usuario, está firmada con un requisito designado (no ad hoc) y no está en marcha.
2. **Descargar.** Solo `https` al host permitido por la configuración (`CAP_UPDATE_DOWNLOAD_HOSTS`), con hasta 3 redirecciones a hosts permitidos, el `size` del feed como tope, corte tras 60 s sin bytes y 30 min en total, sin cookies y con el identificador nulo. El `sha256` se calcula mientras llega. Se puede cancelar.
3. **Verificar.** Tamaño y `sha256` del feed; índice del zip sin rutas que salgan del staging, sin entradas bajo un symlink, sin symlinks hacia fuera y con límites de entradas y bytes; extracción con `ditto`; `codesign --verify --deep --strict` y el requisito designado de la instalada (`codesign -R`); Gatekeeper (`spctl --assess`); versión e identificador del bundle.
4. **Instalar.** La app nueva se prepara en `/Applications/.code-ai-profiles-original-<uuid>/`, en el mismo volumen, y se intercambia con la original de forma atómica (`RENAME_SWAP`; si el volumen no lo admite, dos `rename` con vuelta atrás). Justo antes se comprueba otra vez que la original no esté en marcha. La anterior se conserva hasta validar la nueva; si la validación falla, se restaura.
5. **Sincronizar.** Las instancias detenidas que estén por detrás se sincronizan desde la original nueva. Las que estén abiertas quedan como «Sincronización pendiente» (en memoria) y se sincronizan cuando un refresco las ve detenidas y hay una fuente válida; si se cierra Code AI Profiles, siguen apareciendo en «Sincronizar instancias».

Los errores antes del intercambio terminan en «La original no cambió.» y los que tuvieron vuelta atrás en «Se restauró la versión anterior.». Si el intercambio de dos `rename` falla en los dos sentidos, el mensaje indica dónde quedó la versión anterior para moverla a mano. Con la original abierta el botón se deshabilita con «Cierra Claude Desktop para actualizarla.». No se piden privilegios: `/Applications` es `root:admin 775`, así que hace falta una cuenta de administrador; sin ella, la instalación falla con un error claro.

Si Code AI Profiles se cierra a mitad, al arrancar recupera los restos: devuelve la original a su sitio si hace falta y borra las carpetas temporales. Cada carpeta lleva un cerrojo para no tocar una operación viva y una marca de intercambio en curso; mientras la original está en su sitio y la marca sigue, la carpeta no se borra. En el caso raro de un cierre justo entre el intercambio y su validación, puede quedar `/Applications/.code-ai-profiles-original-<uuid>/` con la versión anterior (unos 900 MB), que se borra a mano.

`codesign` y `spctl` son herramientas de Apple: pueden consultar por su cuenta a los servicios de Apple (revocación de certificados, notarización). Code AI Profiles no les pasa nada más que la ruta de la app.

Windows y Linux no tienen todavía esta acción: el comando responde «La instalación directa solo está disponible en macOS.» sin tocar la red, y siguen con el handoff de siempre.

## Sincronizar instancias desde la versión instalada más reciente

El escaneo construye una topología que incluye versión local máxima, su fuente, instancias desactualizadas, si la original está detrás y una razón segura si no hay fuente utilizable. Antes de copiar bytes, el backend vuelve a validar la fuente y cada destino.

- La fuente administrada debe estar detenida, dentro de su root gestionado y superar la validación de instalación e identidad del proveedor.
- Cada destino debe estar detenido, existir dentro de su root, ser compatible y tener una versión inferior. La fuente y los destinos que ya tienen igual o mayor versión se omiten.
- Cada destino recibe un resultado independiente: actualizado, omitido o fallido. La operación usa staging/swap/rollback por destino y conserva su perfil.
- La aplicación original nunca es un destino. Aunque una instancia tenga una versión mayor, la original se actualiza exclusivamente mediante su canal oficial.
- Linux conserva el paquete o binario compartido de la instalación del sistema; no duplica bytes para este flujo.

La fuente puede dejar de ser válida entre el escaneo y la confirmación. En ese caso la operación se rechaza y la interfaz pide volver a escanear, en vez de sincronizar desde una ruta obsoleta.

## Detección de versión disponible

El dashboard mantiene `sourceVersion` como la versión instalada y expone por separado el estado de actualización oficial, junto con la versión más reciente, fecha de comprobación, indicador `stale` y origen cuando existan. Solo metadata oficial fresca puede afirmar `available` o `current`: `available` conserva un aviso y su acción reutiliza el handoff manual «Actualizar original»; `current` con una instancia local mayor comunica esa diferencia sin declarar que la original esté atrasada; metadata `stale`, indisponible, errónea o desconocida comunica incertidumbre. Ninguno de estos estados descarga ni instala nada por sí mismo; en macOS, `available` habilita «Descargar e instalar».

| Plataforma | Fuente de metadata | Límites |
| --- | --- | --- |
| macOS | Desde HU-0024, la publicación oficial `downloads.claude.ai/releases/darwin/universal/RELEASES.json` y el feed oficial de `releases.claude.com` | Sin parámetros ni identificadores para `RELEASES.json`; el feed con UUID nulo. Timeout de 5 s, redirects deshabilitados y máximo 256 KiB por consulta, como mucho 3 consultas por comprobación |
| Windows | Feed oficial de escritorio de `releases.claude.com` para plataforma y arquitectura | UUID nulo fijo, timeout total de 5 s, redirects deshabilitados, máximo 256 KiB y validación de versión. La app no sigue ni descarga `updateTo.url`. |
| Linux | `apt-cache policy claude-desktop` local y `dpkg --compare-versions` | Sin `sudo`, `apt update`, descarga ni modificación del repositorio. Sin candidato, el estado es `unavailable`. |

**Versiones en despliegue escalonado (HU-0024, macOS).** El feed con UUID nulo solo anuncia la versión del despliegue general: una versión escalonada no aparecía aunque una instancia ya se hubiera actualizado sola. Por eso la versión objetivo sale de `RELEASES.json` (`currentRelease`), y su paquete se pide al feed con esa versión: solo se acepta si trae la misma versión y la misma dirección de descarga, con `sha256` y tamaño. Si el feed va por delante, manda el feed. Si la publicación no se puede confirmar o no responde, se usa el feed y el aviso lo dice; ese resultado se vuelve a comprobar a los 30 minutos. Al pulsar «Instalar» se resuelve otra vez: si la versión cambió entre medias, no se descarga nada y se vuelve a comprobar. El aviso es «Hay una nueva versión de Claude (X). ¿Deseas instalarla?» cuando se puede instalar desde la app; «Actualizar instancias obsoletas» sincroniza las que quedaron detrás, y cada instancia por detrás muestra «Actualizar» sin dejar de poder abrirse.

El resultado exitoso se guarda localmente por seis horas y queda ligado a la versión instalada con la que se obtuvo. Puede conservarse como último resultado `stale` durante hasta siete días si la fuente deja de responder, pero no afirma un estado actual. La caché (`schema` 2 desde HU-0024) contiene solo versión, fecha, plataforma, origen y el aviso, si lo hay; no guarda IDs, cookies, tokens ni credenciales. Un timeout, feed inválido, caché corrupta o caché de otra versión instalada no bloquea el dashboard ni inventa un aviso de disponibilidad.

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

El handoff manual (la instalación directa de macOS tiene sus propios límites, descritos arriba):

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
