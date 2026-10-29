# Spike · HU-0021 · relevo del retorno del inicio de sesión

Arquitecto · 2026-10-28 · macOS 27.0.1 (26A434), Apple Silicon, Swift 6.4. Rama `hu-0019-ajustes-visuales`.
Sin cambios en `src/`, `src-tauri/` ni commits.

## Resumen

**Sí, en macOS el relevo funciona con apps de prueba**: una app con otro bundle id se pone como receptor del
esquema sin que macOS pida confirmación, recibe la URL y la entrega **solo** a la copia elegida por su ruta,
aunque haya otras tres copias en marcha con el mismo bundle id. Después devuelve el receptor y se recupera
si se cae a mitad. Lo ha hecho sin escribir la URL en ningún sitio.
Tiene un punto débil confirmado: cualquier copia que arranque y se vuelva a registrar le quita el receptor
en silencio, y la URL vuelve a caer en la instancia equivocada.
Queda una incógnita que decide si el diseño vale: **si Claude se vuelve a registrar solo al arrancar o
también al pulsar «Iniciar sesión»**. Solo se resuelve con la app real y requiere autorización (ver §6).

## 1. Montaje y desviaciones

- Fixtures en `…/scratchpad/relevo/` (fuentes en `src/`, binarios en `bin/`):
  - `Target` hace de Claude. Bundle id `com.caprelevo.test.target`, esquema `caprelevo-test`. Recibe la URL
    por `kAEGetURL`, como Electron, y con `--register-on-start` llama a
    `LSSetDefaultHandlerForURLScheme(esquema, su id)`, que es lo que hace `setAsDefaultProtocolClient`.
  - `Relay` hace de Code AI Profiles. Bundle id `com.caprelevo.test.relay`.
  - `Probe` es un CLI que hace de navegador (`NSWorkspace.open(url)`) y de inspector.
  - Las fixtures solo anotan un **SHA-256 truncado** de la URL, la ruta, el PID y el `--user-data-dir`.
- Copias: `cp -cR` del bundle (igual que `copy_provider_application`) a `inst-A/Alpha.app`, `inst-B/Beta.app`
  e `inst-C/Gamma.app`, con el mismo bundle id. Se lanzan por `exec` directo con `--user-data-dir=PERFIL-X`,
  igual que `launch_instance_sync`.
- **Hallazgo y desviación.** LaunchServices marca todo bundle bajo `/private/tmp` con
  `bundle flags: launch-disabled in-temp-dir` y **lo excluye de la resolución de esquemas y de la búsqueda
  por bundle id**. Lo mismo pasa con una imagen montada dentro del scratchpad. Por eso el primer
  `open-url` mostró al mantenedor el diálogo «No hay ninguna aplicación definida…»: no había ningún receptor
  elegible. Desde entonces `Probe open-url` se niega a abrir si `urlForApplication(toOpen:)` devuelve nil.
  Para probar la resolución, las fixtures se pusieron en una **imagen APFS propia** (`relevo/img/caprelevo.dmg`)
  montada con `-nobrowse` en `/Volumes/CapRelevo`. Allí sí son elegibles. La imagen ya está desmontada.
- No se tocó `claude://` ni `msauth.…`, no se lanzó ni se cerró Claude ni ninguna instancia, no se leyó
  ningún perfil y no se capturó la pantalla. Ninguna prueba pidió permisos TCC (Automatización,
  Accesibilidad, Grabación). Lectura final, solo de lectura: la preferencia de `claude` sigue en
  `com.anthropic.claudefordesktop`, modificada por última vez a las 20:20:39 hora local, 51 minutos antes de
  empezar el spike (21:12). La cambió algo ajeno al spike, probablemente una instancia al arrancar.

## 2. Lo comprobado (con evidencia)

| # | Prueba | Resultado |
| --- | --- | --- |
| E1 | A, B y C en marcha; apertura genérica, como el navegador, 4 veces | Las 4 fueron a **A**, la más antigua, aunque la resolución por ruta apuntaba a la original, que no estaba en marcha. Se relanzó A y otras 2 aperturas fueron a **C**, que pasó a ser la más antigua. **Esto reproduce el defecto**: se entrega a un proceso en marcha con ese bundle id (en 2 de 2 series, el más antiguo), no al que pidió el login. |
| E2 | `NSWorkspace.open([url], withApplicationAt: <copia>)`, con `allowsRunningApplicationSubstitution` en `false` y en `true`, y `open -a <ruta> <url>`, hacia A, B y C | **12 de 12 entregas a la copia exacta** (PID de la ruta pedida, `--user-data-dir` correcto) y ninguna a otra copia. El `NSRunningApplication` que devuelve la llamada trae el PID correcto. |
| E2b | B detenida; `withApplicationAt: B`, `substitution=true` | **No sustituye** por A ni por C: lanza **otra B sin `--user-data-dir`**. Con Claude real, eso sería el perfil por defecto (el de la original). |
| E2c | B detenida; además `configuration.arguments = ["--user-data-dir=PERFIL-B"]` | Lanza B **con su perfil** y le entrega la URL. |
| E2d | B en marcha; `arguments = ["--user-data-dir=OTRO"]` | Se entrega a la B en marcha (PERFIL-B). Los argumentos solo se aplican al lanzar. |
| E3a | El relevo llama a `NSWorkspace.setDefaultApplication(at:toOpenURLsWithScheme:)` | Termina en **0 ms**, sin error y **sin diálogo**. El receptor pasa a ser el relevo. |
| E3b | Arranca otra copia con `--register-on-start` | `LSSetDefaultHandlerForURLScheme` devuelve `0` y **recupera el receptor en silencio**. La URL siguiente cae en **C**, no en el relevo. **La carrera es real.** |
| E4 | Flujo completo con la API LS: el relevo toma el receptor, el «navegador» abre la URL, el relevo la reenvía a B por ruta y devuelve el receptor | Se entregó **solo a B** (mismo hash en el relevo y en B) y la preferencia volvió a `com.caprelevo.test.target`. |
| E7 | El mismo flujo con la API de `NSWorkspace` para tomar y devolver, hacia C | Igual: solo C, y el receptor quedó devuelto. La preferencia se guarda como bundle id aunque se pase una ruta. |
| E5 | El relevo se cae con `SIGKILL` con el receptor tomado; luego llega una URL | La preferencia sigue en el relevo. **LaunchServices lanza el relevo**, sin argumentos, con la URL. El relevo ve que no hay sesión, descarta la URL en memoria y devuelve el receptor. Esa URL **se pierde** y el login hay que repetirlo. |
| E8 | Una app **sin `CFBundleURLTypes`** se pone como receptor (LS y NS) | Se acepta; la resolución la respeta y LaunchServices la lanza con la URL. En macOS 27 **no hace falta declarar el esquema**. No se ha probado en 13.3–26. |
| E9 | El relevo tiene el receptor y se desinstala (`lsregister -u`) | La resolución vuelve sola a otro candidato (`target`). |
| P | Búsqueda del token de la URL de E4 en los archivos del spike y en el log unificado de los últimos 20 min | En los archivos, nada (solo hashes). En el log, nada de las entregas correctas. **Sí aparece la URL completa** en un error de `CoreServicesUIAgent` (`-10814`, el `open` fallido sin receptor que provocó el diálogo): macOS registra la URL en claro cuando una apertura falla. |

## 3. Respuestas a las cuatro preguntas (macOS)

1. **Registrarse como receptor.** Funcionan las dos APIs, sin diálogo y al instante, aunque el relevo
   declare otro bundle id. `LSSetDefaultHandlerForURLScheme` está deprecada pero funciona en macOS 27 y es
   la misma que usa Electron. `NSWorkspace.setDefaultApplication(at:toOpenURLsWithScheme:)` existe desde
   macOS 12 y el proyecto pide 13.3 como mínimo. **La carrera existe y la pierde quien llama antes**: el
   receptor es una preferencia por bundle id y gana la última escritura. Mitigación: comprobar el receptor
   cada ~500 ms durante el modo y reclamarlo si se pierde. Aun así queda una ventana en la que la URL
   puede caer en otra instancia, que es el defecto de hoy, no uno nuevo.
2. **Entregar solo a la copia elegida.** Sí, por ruta (12 de 12). Dos condiciones:
   - comprobar antes que la copia está en marcha, por PID e identidad;
   - pasar `arguments` con su `--user-data-dir` por si se cerró, para no lanzarla nunca con el perfil por
     defecto (E2b).

   `open -a` también acierta, pero pone la URL en el argv de `open`, visible con `ps`: no se usa.
3. **Devolver el receptor.** Sí, con cualquiera de las dos APIs, también al bundle id de otra app. Si el
   relevo se cae a mitad, el receptor se queda en el relevo, pero el sistema **lo vuelve a lanzar** con la
   siguiente URL de ese esquema. El relevo se recupera al arrancar (devuelve el receptor si sigue siendo
   suyo) y descarta la URL huérfana: el usuario repite el login. Si el relevo se desinstala, macOS vuelve
   solo a otro candidato.
4. **Sin escribir la URL.** Sí: el relevo la tiene solo en memoria y la pasa al sistema por la API, no por
   argv. Lo que no depende de nosotros:
   - el navegador y macOS la manejan igual que hoy;
   - `CoreServicesUIAgent` la registra en claro **si la apertura falla**;
   - `tao` la escribe con `trace!("… URLs: {:?}")` en `app_delegate.rs:145`. Hoy es inocuo porque la app
     no instala ningún logger, pero el día que alguien añada un `log` en nivel trace la URL acaba en un
     archivo.

## 4. Lo que haría falta en Tauri (inferido del código, no compilado)

- **Recibir**: no hace falta plugin. Tauri 2.11.5 ya expone `RunEvent::Opened { urls }` en macOS
  (`tauri-2.11.5/src/app.rs:263`). Lo alimenta `application:openURLs:` en
  `tao-0.35.3/…/app_delegate.rs:137`, también en el arranque en frío (inferido; con las fixtures se
  comprobó por `kAEGetURL`).
- **Tomar y devolver el receptor**: FFI en C a `LSSetDefaultHandlerForURLScheme` y
  `LSCopyDefaultHandlerForURLScheme` (CoreServices), sin dependencias. `lib.rs:4860` ya usa este patrón de
  FFI con `NSWorkspace`.
- **Reenviar**: `NSWorkspace.openURLs:withApplicationAtURL:configuration:completionHandler:` necesita un
  bloque. Hay dos caminos:
  - `objc2` + `objc2-app-kit` + `block2`, que **ya están en `Cargo.lock`** como transitivas de Tauri (0.6.4,
    0.3.2 y 0.6.2). Declararlas como directas no añade código nuevo al árbol, pero cuenta como dependencia
    directa nueva y la decide el mantenedor.
  - el FFI a mano con un bloque nulo. Hay que comprobar que el compilador lo acepta.
- **`tauri-plugin-deep-link`: no se recomienda.** En macOS no registra en tiempo de ejecución: mete el
  esquema en el `Info.plist` de forma permanente, con lo que Code AI Profiles reclamaría `claude:` siempre y
  podría ganar la resolución en un empate. Solo aporta en Windows y Linux, y allí el diseño recomendado no
  necesita recibir la URL.
- **`CFBundleURLTypes`**: no hace falta en macOS 27 (E8). Declarar `claude` lo haría candidato permanente.
  Recomiendo **no declararlo** y comprobar E8 en la versión mínima soportada (13.3) antes de cerrar la
  historia. Si ahí falla, se declara en `src-tauri/Info.plist`, que Tauri 2 fusiona, y se acepta el efecto.

## 5. Windows y Linux (por documentación: **no comprobado**)

- **Windows**: `setAsDefaultProtocolClient` escribe `HKCU\Software\Classes\claude` (`URL Protocol`) y
  `…\shell\open\command = "<exe>" "%1"`. Las claves de esquemas propios en HKCU no llevan el hash
  `UserChoice` y se cambian sin elevación ni aviso del sistema. El navegador pregunta «¿Abrir <app>?».
- **Linux**: `.desktop` en `~/.local/share/applications` con `MimeType=x-scheme-handler/claude;` y
  `Exec=… %u`, más `xdg-mime default <archivo>.desktop x-scheme-handler/claude` (escribe en
  `~/.config/mimeapps.list`). Electron usa `xdg-settings`. Con navegadores en Flatpak o Snap pasa por el
  portal y puede salir un selector. Varía según el escritorio.
- En ambos, el relevo no necesita tener la URL en la mano: basta con apuntar el comando del protocolo a
  `"<exe>" --user-data-dir="<perfil>" "%1"` (la opción C del análisis). El lock de instancia única de
  Electron, que es por perfil, entrega la URL a la instancia en marcha por `second-instance`.
  - Ventaja: privacidad.
  - Inconveniente: no se sabe cuándo terminó el login. Hay que devolver el comando al confirmarlo el
    usuario o tras un tiempo máximo.
  - Misma carrera con el re-registro y la misma recuperación al arrancar.
- Hay que probarlo en máquinas reales, junto con lo que espera HU-0018.

## 6. Riesgos

- **Carrera (alto)**: si Claude llama a `setAsDefaultProtocolClient` también **al iniciar el login**, y no
  solo al arrancar, el relevo pierde siempre y el diseño no sirve. Mitigaciones:
  - Code AI Profiles no lanza instancias durante el modo, o reclama el receptor justo después de lanzarlas;
  - vigila el receptor cada ~500 ms y avisa si lo pierde.

  La original abierta a mano por el usuario queda fuera de su control. **Prueba decisiva, con la app real y
  autorización**: con el relevo como receptor de `claude://`, pulsar «Iniciar sesión» en una instancia ya
  abierta y leer el receptor. Si cambia, se descarta.
- **Perfil equivocado (alto)**: si la copia destino se cerró, reenviar sin `arguments` lanzaría el perfil
  por defecto (E2b). Hay que comprobar la identidad antes y pasar `--user-data-dir`, o no reenviar.
- **Privacidad (medio)**: el código de autenticación pasa por la memoria de Code AI Profiles. Reglas:
  - sin `Debug` ni logs de `RunEvent::Opened`;
  - sin parsear la consulta;
  - sin evento IPC con la URL hacia el frontend;
  - sin persistir; solo se persisten el id de la instancia, el receptor anterior y la caducidad;
  - nunca `open -a <url>`;
  - prohibido un logger en nivel trace para `tao`.
- **Recuperación (medio)**: tras una caída, la siguiente URL de `claude://` lanza Code AI Profiles y se pierde
  ese login. Se recupera al arrancar y al salir (`RunEvent::Exit`), y con un tiempo máximo del modo.
- **Cobertura (medio)**: el inicio de sesión con Microsoft puede volver por
  `msauth.com.anthropic.claudefordesktop://`. El relevo tendría que tomar los dos esquemas. No se sabe cuál
  usa cada flujo.
- **Basura en LaunchServices (bajo)**: `lsregister -u` no borró los registros de las dos copias lanzadas por
  LaunchServices (B en E2c y la fixture sin esquema). Quedan inertes: no resuelven. Mismo fenómeno que los
  `/Volumes/Claude*` del análisis.

## 7. Recomendación

**Abrir la historia solo para macOS, con un primer paso bloqueante**: la prueba decisiva de §6 con Claude
real, autorizada por el mantenedor. Si Claude se vuelve a registrar al iniciar el login, se descarta B y se
queda E («inicio de sesión asistido», del análisis).
Diseño concreto, si pasa:

- Una acción «Iniciar sesión aquí» en una instancia en marcha. Comprueba su identidad, guarda
  `login-relay.json` en los datos de la app (`instanceId`, receptor anterior, caducidad; nunca la URL) y toma
  `claude` (y `msauth…`, si se decide) con `LSSetDefaultHandlerForURLScheme(…, "com.braiyan.claudeprofiles")`.
- Mientras dura el modo: vigila el receptor y lo reclama si lo pierde; no lanza otras instancias.
- `RunEvent::Opened`: si hay modo activo, reenvía con `withApplicationAt: <copia>`, sin sustitución, con
  `arguments` `--user-data-dir` y el entorno `CODE_AI_PROFILES_INSTANCE_ID`. Comprueba el PID devuelto,
  devuelve el receptor y avisa al frontend sin la URL. Si no hay modo activo, descarta la URL y devuelve el
  receptor.
- Tiempo máximo (por ejemplo 5 min), cancelar, `RunEvent::Exit` y el arranque devuelven el receptor.
- Sin `tauri-plugin-deep-link` y sin `CFBundleURLTypes`, salvo que falle en 13.3.

Windows y Linux van en una historia hermana con la opción C, tras probarlas en máquinas reales.
Implementador con `opus`: sesión, datos personales y una preferencia del sistema.

## 8. Lo que decide el mantenedor

1. **Regla de privacidad**: si acepta que Code AI Profiles tenga en memoria, en tránsito, la URL con el
   código de autenticación, con las reglas de §6. Hoy `AGENTS.md` lo prohíbe, y el cambio va como delta en
   `docs/producto/reglas/`.
2. **Escribir el receptor del sistema** (`claude`, y quizá `msauth…`) de forma temporal: ¿cuenta como
   permiso invasivo? No pide TCC ni elevación.
3. **Dependencias**: `objc2`, `objc2-app-kit` y `block2` como directas (ya transitivas), o FFI a mano. Sin
   `tauri-plugin-deep-link`.
4. **Autorizar la prueba decisiva** con Claude real: cambia de forma temporal y reversible el receptor de
   `claude://`.
5. Si se reenvía también cuando la copia destino se cerró (lanzándola con su perfil) o se aborta.
6. Si el relevo cubre `msauth.com.anthropic.claudefordesktop`.
7. Si autoriza `lsregister -gc` para limpiar los registros inertes, los de este spike y los de antes.

## 9. Estado en que queda el sistema

- Procesos de prueba: 0, todos cerrados por PID.
- Imagen desmontada. `caprelevo-test` sin receptor resoluble (`urlForApplication` devuelve nil y no hay
  candidatos).
- Residuos inertes:
  - en LaunchServices, dos registros de bundle y dos de contenedor de la imagen desmontada;
  - en `com.apple.launchservices.secure`, la entrada `LSHandlers` de `caprelevo-test`, que apunta a
    `com.caprelevo.test.relay` porque no hay API para borrarla. No se editó el plist a mano para no tocar
    la entrada real de `claude`.
