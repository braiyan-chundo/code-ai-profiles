# Ciclo de vida e identidad visual de instancias

Documento funcional relacionado con [HU-0004](hu/HU-0004-sincronizacion-desde-la-instancia-mas-reciente-cierre-robusto-artefactos-locales-e-identidad-visual.md) y [HU-0005](hu/HU-0005-recuperar-respuesta-de-la-interfaz-y-versionado-semver.md); abrir y detener desde el sidebar y el dashboard, de [HU-0026](../hu/HU-0026-arrancar-y-detener-instancias-desde-el-s/hu.md).

## Dónde está la original en Windows

Claude para Windows se instala de dos formas, y la app busca las dos. Primero, el instalador clásico en
`%LOCALAPPDATA%\AnthropicClaude\Claude.exe` (o su carpeta `app-<versión>`). Si no está, el paquete MSIX, que se
encuentra con `Get-AppxPackage` y vive en `C:\Program Files\WindowsApps\Claude_<versión>_x64__<editor>\`. La consulta
lee solo los metadatos del paquete y de su manifiesto, y su resultado se guarda unos minutos para no lanzar PowerShell
en cada refresco. En la versión MSIX, Windows guarda el perfil de la original en
`%LOCALAPPDATA%\Packages\<familia>\LocalCache\Roaming\Claude`, no en `%APPDATA%\Claude`. La app nunca escribe en
`WindowsApps`: una instancia copia la aplicación a sus propios datos y se abre con su perfil.

## Inicio, detección y cierre

Al iniciar una instancia, Code AI Profiles guarda una identidad local del proceso: PID raíz, tiempo de inicio cuando el sistema lo proporciona, grupo de procesos en Unix, huella de la aplicación administrada y el argumento exacto de perfil. La identidad no persiste una línea de comandos completa ni contenido de perfiles.

Al detener, primero vuelve a comprobar que el proceso encontrado corresponde a esa aplicación y a ese directorio de perfil. Envía una petición de cierre normal y espera hasta cinco segundos. Solo si continúa verificado, escala al cierre forzado del grupo o árbol correspondiente y espera hasta dos segundos más.

- En Unix, cada lanzamiento crea su propio grupo de procesos; el cierre se dirige a ese grupo solo tras verificar la identidad.
- En Windows, el cierre usa el árbol de procesos verificado como alternativa de plataforma.
- Un watcher espera la salida del proceso. La generación de lanzamiento evita que un watcher viejo cambie el estado de un reinicio posterior.
- Si la identidad no se puede comprobar o aún quedan procesos después del cierre forzado, la instancia continúa como ejecutándose y la interfaz devuelve un error accionable. No se informa un éxito falso ni se cierra por nombre, bundle ID o un PID viejo.

La verificación local reduce el riesgo de reutilización de PID, pero la integración no puede asegurar el comportamiento de un updater o helper que escape de la identidad verificada. En ese caso la persona debe cerrar la ventana restante desde el sistema y volver a escanear.

### Abrir y detener sin entrar en la instancia

Desde HU-0026, cada instancia se abre o se detiene también desde el sidebar y desde «Uso por instancia» del dashboard,
sin cambiar de página. En el sidebar el botón (▶ o ■) aparece al pasar el ratón o con el foco del teclado; en el
dashboard está en cada fila. Usan los mismos comandos y la misma verificación de identidad que la página de la
instancia, sin confirmación al detener. Mientras una operación corre, los botones de Abrir y Detener quedan
desactivados y la fila dice «Abriendo…» o «Deteniendo…»; si falla, el aviso de siempre se titula «No se pudo
abrir/detener {nombre}». La Claude original y las instancias sin copia no llevan botón.

## Perfiles detenidos

Un perfil detenido (instancia u original, sin operación en curso) lleva el icono «zᶻ» después de su nombre en el sidebar
y en «Uso por instancia» del dashboard (HU-0030, RN-08). Es decorativo (`aria-hidden`): el estado lo siguen leyendo el
texto oculto y el tooltip. Con el sidebar plegado no se ve.

## Iconos por instancia

Desde el editor de una instancia se puede seleccionar una imagen PNG o JPEG de hasta 5 MiB. La aplicación valida y normaliza el archivo a PNG cuadrado administrado fuera del bundle del proveedor. El icono aparece en la tarjeta y el editor, sobrevive a una sincronización de aplicación y se puede reemplazar o quitar sin modificar la aplicación original.

No se cambian archivos sellados del bundle (`app.asar`, ejecutables, `Info.plist` ni recursos): la firma de Anthropic, su CDHash, Team ID y requisito designado no cambian. Desde [HU-0020](hu/HU-0020-icono-personalizado-de-la-instancia-en-e/hu.md), en macOS el icono se aplica con `NSWorkspace.setIcon` sobre la copia administrada, con la instancia detenida, y **se queda puesto**: escribe el archivo `Icon\r` y el atributo FinderInfo en la raíz del bundle. Antes se retiraba porque `codesign --verify --deep --strict` falla con esa metadata; el mantenedor cambió esa regla el 2026-10-28.

| Plataforma | Resultado del icono de sistema |
| --- | --- |
| macOS | El icono personalizado se ve en el Dock, también con varias instancias abiertas, cada una con el suyo. Se genera con la plantilla de macOS (lienzo de 1024 px, cuerpo de 824 px con esquinas redondeadas y sombra); la imagen guardada no cambia. |
| Windows | El ejecutable firmado conserva su icono. El personalizado se muestra dentro de Code AI Profiles. |
| Linux | Se crea un launcher opcional por instancia con el icono. Debe abrirse desde ese launcher y Wayland o el compositor pueden conservar el icono oficial. |

**Comprobación de las copias con icono.** Para ellas, `--strict` se sustituye por una comprobación equivalente: `codesign --verify --deep --strict=symlinks` con el requisito designado de la original, el CDHash registrado en la provenance (que solo se registra tras un `--strict -R` en verde sobre la copia limpia), el mismo bundle id y Team ID, la raíz del bundle con solo `Contents` e `Icon\r`, y ningún FinderInfo ni resource fork fuera de la raíz. Cualquier otro cambio hace que la copia no se abra y pida sincronizarla. La original y la descarga de HU-0017 siguen con `--strict`. Sin la original instalada, una copia con icono no se abre, porque no hay contra qué comprobarla.

**Ciclo de vida.** El icono se aplica con la instancia detenida, se reaplica al lanzar si Claude se actualizó sola dentro de la copia (solo si la versión es igual o mayor que la registrada) y tras sincronizar, y se quita con «Quitar». Si el actualizador de Claude cambió `Contents/` dentro de una copia que conserva el icono (deja `Icon\r` en la raíz), la copia se acepta y se vuelve a registrar al lanzar, y sirve de fuente de sincronización, solo si su firma sigue cumpliendo el requisito de la original y su versión es estrictamente mayor que la registrada; con la misma versión u otra menor se rechaza. Tras cada cambio se avisa a LaunchServices (`LSRegisterURL` y `noteFileSystemChanged`) para que el Dock no use un icono en caché.

**Distintivo de la original.** Desde [HU-0028](hu/HU-0028-distintivo-de-la-app-original-en-el-icon/hu.md), una instancia con icono propio lleva el icono de la aplicación que clona en la esquina inferior derecha: en el Dock (macOS) y, en todas las plataformas, dentro de la app en los avatares de 32 y 64 px y en la vista previa del editor (en esos avatares el punto de estado pasa arriba a la derecha; en 16 px no hay distintivo). La imagen guardada no cambia: el distintivo se añade al mostrarla, así que «Quitar» deja la instancia como la original y cambiar la imagen lo conserva.

- **De dónde sale.** Del icono de la original instalada, leído en Rust sin ejecutar nada nuevo: en macOS el `.icns` que declara `CFBundleIconFile`; en Windows los recursos de icono de `Claude.exe`; en Linux el `Icon=` de su `.desktop` en `hicolor` o `pixmaps`. Se recorta a su contenido visible y se guarda una copia PNG en `<datos de la app>/provider-badge/`, con una clave que cambia si cambia el archivo de la original; las copias viejas se borran. Si el icono no se puede leer, no hay distintivo y no aparece ningún error.
- **Dock.** En el lienzo de 1024 px el distintivo mide 368 px, a 36 px del borde inferior derecho, con una sombra suave. El registro guarda un testigo de qué distintivo lleva el Dock: las instancias que ya tenían icono lo reciben **una vez** al abrirlas, y no se reaplica mientras el testigo coincida. También se aplica al sincronizar y al «Reintentar».
- **Webview.** El protocolo de assets solo puede leer `provider-badge/*.png` de los datos de la app, además de los iconos de instancia.

**Permiso «Gestión de apps».** macOS protege las copias que el actualizador de Claude ha modificado: para cambiarles el icono, Code AI Profiles necesita el permiso «Gestión de apps» (Ajustes del Sistema › Privacidad y seguridad). No se pide por adelantado: si macOS rechaza el cambio, el editor lo explica y ofrece «Reintentar». Desde [HU-0022](configuracion.document.md), el permiso también se explica en Configuración › Permisos, con su estado y un acceso directo al panel. Como Code AI Profiles no se firma con un certificado de desarrollador, macOS puede volver a pedirlo tras instalar una versión nueva.

La transacción se limita al icono y a la metadata administrada: no toca perfiles, sesiones, credenciales, autenticación ni transcripts, ni la instalación original.

## Privacidad y límites

El selector solo procesa la imagen elegida explícitamente. Los iconos se guardan en el espacio administrado de la instancia y no se envían por red. La información usada para ciclo de vida se limita a lo necesario para verificar la identidad del proceso; no registra credenciales, cookies, prompts, respuestas ni transcripts.
