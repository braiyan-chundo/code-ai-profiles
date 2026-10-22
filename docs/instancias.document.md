# Ciclo de vida e identidad visual de instancias

Documento funcional relacionado con [HU-0004](hu/HU-0004-sincronizacion-desde-la-instancia-mas-reciente-cierre-robusto-artefactos-locales-e-identidad-visual.md) y [HU-0005](hu/HU-0005-recuperar-respuesta-de-la-interfaz-y-versionado-semver.md).

## Inicio, detección y cierre

Al iniciar una instancia, Code AI Profiles guarda una identidad local del proceso: PID raíz, tiempo de inicio cuando el sistema lo proporciona, grupo de procesos en Unix, huella de la aplicación administrada y el argumento exacto de perfil. La identidad no persiste una línea de comandos completa ni contenido de perfiles.

Al detener, primero vuelve a comprobar que el proceso encontrado corresponde a esa aplicación y a ese directorio de perfil. Envía una petición de cierre normal y espera hasta cinco segundos. Solo si continúa verificado, escala al cierre forzado del grupo o árbol correspondiente y espera hasta dos segundos más.

- En Unix, cada lanzamiento crea su propio grupo de procesos; el cierre se dirige a ese grupo solo tras verificar la identidad.
- En Windows, el cierre usa el árbol de procesos verificado como alternativa de plataforma.
- Un watcher espera la salida del proceso. La generación de lanzamiento evita que un watcher viejo cambie el estado de un reinicio posterior.
- Si la identidad no se puede comprobar o aún quedan procesos después del cierre forzado, la instancia continúa como ejecutándose y la interfaz devuelve un error accionable. No se informa un éxito falso ni se cierra por nombre, bundle ID o un PID viejo.

La verificación local reduce el riesgo de reutilización de PID, pero la integración no puede asegurar el comportamiento de un updater o helper que escape de la identidad verificada. En ese caso la persona debe cerrar la ventana restante desde el sistema y volver a escanear.

## Iconos por instancia

Desde el editor de una instancia se puede seleccionar una imagen PNG o JPEG de hasta 5 MiB. La aplicación valida y normaliza el archivo a PNG cuadrado administrado fuera del bundle del proveedor. El icono aparece en la tarjeta y el editor, sobrevive a una sincronización de aplicación y se puede reemplazar o quitar sin modificar la aplicación original.

No se cambian archivos dentro del bundle como `app.asar`, ejecutables, `Info.plist` o recursos sellados. `NSWorkspace.setIcon` puede escribir metadata de filesystem del bundle gestionado —por ejemplo, FinderInfo, resource fork o atributos extendidos— sin alterar bytes sellados, CDHash, Team ID o designated requirement. Sin embargo, mientras esa metadata existe, `codesign --verify --deep --strict` falla; por seguridad, producción la retira y recupera el baseline estricto.

| Plataforma | Resultado del icono de sistema |
| --- | --- |
| macOS | El spike opt-in de `NSWorkspace.setIcon` falló. El icono personalizado permanece en la UI con `systemApplied=false`; el Dock no está confirmado. |
| Windows | El ejecutable firmado conserva su icono. El personalizado se muestra dentro de Code AI Profiles. |
| Linux | Se crea un launcher opcional por instancia con el icono. Debe abrirse desde ese launcher y Wayland o el compositor pueden conservar el icono oficial. |

En macOS, el spike opt-in de `NSWorkspace.setIcon` sobre un clon temporal con perfil vacío falló: `set_macos_workspace_icon(..., None)` devolvió «NSWorkspace rechazó el icono personalizado» en `src-tauri/src/lib.rs:5895`. `open -n` sí abrió el clon y Cua mostró únicamente su pantalla Sign in, pero no hubo icono distinguible en Dock. La ruta no altera bytes sellados, CDHash, Team ID ni designated requirement, ni cambia el bundle ID; además, FinderInfo/resource fork impedirían `codesign --verify --deep --strict` mientras la metadata existe. Producción la retira y restaura el baseline, por lo que `systemApplied=false` y el Dock no recibe un icono personalizado confirmado. La ruta de ICNS, `CFBundleIconFile` o firma ad-hoc queda descartada porque puede alterar requisitos de firma y afectar Keychain/safeStorage. Las copias legacy ya re-firmadas o manipuladas siguen excluidas como donantes por la validación normal de proveedor.

La transacción se limita a metadata externa de branding y metadata administrada. Puede escribir metadata de filesystem asociada al bundle gestionado, pero no archivos dentro del bundle, perfiles, sesiones, credenciales, autenticación ni transcripts; nunca toca la instalación original. Si la verificación estricta falla, revierte metadata y registro. Mientras no exista una alternativa que cumpla los criterios, producción conserva el fallback de UI y no reaplica el icono al Dock tras create, sync o update.

La confirmación requerida en macOS necesita una alternativa que mantenga `codesign --verify --deep --strict`, CDHash/Team ID/designated requirement de proveedor, launch smoke e icono distinguible en Dock mediante Cua, sin modificar perfiles. El spike opt-in se ejecutó fuera de sandbox y falló; Root cerró únicamente el PID `27587` tras validar el ejecutable y el argumento exacto `--user-data-dir` del fixture. No se tocaron perfiles ni sesiones reales y no habrá más experimentos de Dock en esta iteración. La ruta actual de `NSWorkspace.setIcon` no satisface esa comprobación: producción elimina su metadata para restaurar el baseline y deja `systemApplied=false`. El icono personalizado continúa dentro de Code AI Profiles como fallback seguro, sin re-firma, sin cambiar archivos del bundle y sin tocar perfiles, sesiones ni autenticación. Windows y Linux mantienen los límites de la tabla.

## Privacidad y límites

El selector solo procesa la imagen elegida explícitamente. Los iconos se guardan en el espacio administrado de la instancia y no se envían por red. La información usada para ciclo de vida se limita a lo necesario para verificar la identidad del proceso; no registra credenciales, cookies, prompts, respuestas ni transcripts.
