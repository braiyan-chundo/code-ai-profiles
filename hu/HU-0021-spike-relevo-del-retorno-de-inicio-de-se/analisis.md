# Análisis · el callback del inicio de sesión cae en otra instancia

Rama `hu-0019-ajustes-visuales` (HEAD 39f4f05). Solo lectura: no se implementó nada, no se lanzó, detuvo ni
registró ninguna app, y no se leyó ningún perfil. `graphify-out/` sin cambios.

## 1. Cómo se crean y lanzan las instancias (código)

| Qué | Dónde | Hecho |
| --- | --- | --- |
| Copia | `src-tauri/src/lib.rs:2062` `copy_provider_application` | macOS: `cp -cR` (clon APFS) o `ditto` del bundle **literal**. Windows: `robocopy` del directorio. Linux: **symlink** al ejecutable instalado. |
| Personalización | `lib.rs:2172` `personalize_application_path` | Solo **renombra la carpeta** `.app` (macOS). No toca `Info.plist`, ni firma, ni bundle id. |
| Lanzamiento | `lib.rs:4537` `launch_instance_sync` | `Command::new(<ejecutable de la copia>)` directo (no `open`, no LaunchServices), con `--user-data-dir=<instancia>/profile` y la env `CODE_AI_PROFILES_INSTANCE_ID` (que la app de IA no usa). `process_group(0)` en Unix. |
| Separación del perfil | `--user-data-dir` | Es lo único que distingue una instancia de otra. Identidad del proceso por ese argumento exacto (`lib.rs:3518`, `3543`). |
| Esquema de URL | — | Code AI Profiles no declara ni gestiona ningún esquema (`tauri.conf.json` sin `CFBundleURLTypes`, sin `deep-link`). |

## 2. Evidencia del sistema (solo lectura)

`Info.plist` de la original y de las 4 instancias administradas: **idénticos en identidad**.

| Bundle | `CFBundleIdentifier` | `CFBundleURLTypes` | Firma | Versión |
| --- | --- | --- | --- | --- |
| `/Applications/Claude.app` | `com.anthropic.claudefordesktop` | `claude`, `msauth.com.anthropic.claudefordesktop` | Team `Q6L2SF6YDW`, runtime | 3.6556.2 |
| `Claudio Personal/Happy/Josued/Karibu.app` | `com.anthropic.claudefordesktop` | los mismos dos | Team `Q6L2SF6YDW`, runtime (sin re-firmar) | 4.29.0 |

LaunchServices (`lsregister -dump`, solo lectura): **17 bundles registrados reclaman `claude:`** con el mismo
bundle id: la original, las 4 instancias, una instancia ya borrada (`8d0c93bc…/Happy.app`), fixtures de
HU-0007/HU-0008 en `/private/tmp` y `/var/folders`, y montajes de DMG en `/Volumes/Claude*`.

Preferencia del usuario (`com.apple.launchservices.secure` → `LSHandlers`):
`LSHandlerURLScheme = claude; LSHandlerRoleAll = "com.anthropic.claudefordesktop"`. **El handler por defecto
es un bundle id, no una ruta.** No hay forma de elegir «esta copia» con esa preferencia.

Resolución actual (`NSWorkspace.urlForApplication(toOpen: claude://…)`): `Claudio Personal.app`, no la
original (LaunchServices desempata entre bundles con el mismo id; aquí gana una copia, probablemente por
versión mayor, 4.29.0 > 3.6556.2). Lo mismo para `msauth.com.anthropic.claudefordesktop://`.

La app de IA (presencia de cadenas en `app.asar`, sin descompilar): usa `requestSingleInstanceLock`,
`second-instance`, `open-url` y `setAsDefaultProtocolClient`. Es decir: se re-registra como handler al
arrancar y recibe el login por `open-url` (macOS) o por `second-instance` (Windows/Linux).

## 3. Mecanismo

**macOS.**
1. La instancia A abre el navegador para iniciar sesión. Al terminar, la web redirige a `claude://…`.
2. El navegador pide a LaunchServices que abra la URL. LaunchServices resuelve el handler por **bundle id**
   (`com.anthropic.claudefordesktop`). Si hay procesos en marcha con ese bundle id, entrega el Apple Event
   `kAEGetURL` a **uno** de ellos; si no hay ninguno, lanza el bundle que resolvió (hoy `Claudio Personal.app`).
3. Las instancias se lanzan por `exec` directo, pero al iniciar `NSApplication` se registran en
   LaunchServices con ese mismo bundle id. Para el sistema son indistinguibles: el `--user-data-dir` es
   invisible para LaunchServices.
4. Electron dispara `open-url` en el proceso que recibió el evento. `requestSingleInstanceLock` no
   interviene en macOS: el lock es por `userData`, y cada instancia tiene el suyo, así que todas son
   «primarias» y ninguna reenvía a la que pidió el login.
5. El proceso que lo recibe no es el que generó el `state`/PKCE (si el flujo lo lleva, lo que no se puede
   saber sin descompilar): o rechaza el callback, o completa el login en el perfil equivocado. Lo segundo
   es peor: la cuenta queda en otra instancia.

Esto explica el síntoma y el workaround del mantenedor: con **una sola** instancia en marcha, el único
candidato es la que pidió el login. Que cerrar las demás funcione es coherente con «entrega a un proceso en
marcha con el mismo bundle id»; el criterio exacto de LaunchServices entre varios procesos (el primero
registrado, el último activo…) no está documentado y no se probó.

**Efecto lateral (observación).** Si no hay ninguna instancia en marcha, un `claude://` lanza
`Claudio Personal.app` **sin** `--user-data-dir`, es decir, una copia con el perfil por defecto
(`~/Library/Application Support/Claude`, el de la original). No se probó, pero es lo que dice la resolución.

**Windows (no verificado, inferido del comportamiento estándar de Electron).** El protocolo se registra en
`HKCU\Software\Classes\claude\shell\open\command` por `setAsDefaultProtocolClient`, apuntando al
`Claude.exe` del último proceso que lo registró, **sin** `--user-data-dir`. El navegador lanza
`Claude.exe "claude://…"`: ese proceso pide el lock de `userData` **por defecto** (el de la original), así que
o reenvía por `second-instance` a la original si está abierta, o arranca la original con ese perfil. La
instancia no lo recibe nunca, **ni cerrando las demás**. Hay que comprobarlo en una máquina Windows.

**Linux (no verificado).** Igual que Windows con `x-scheme-handler/claude` en el `.desktop` del paquete
(`Exec=… %u` sin `--user-data-dir`). Las instancias son symlinks al mismo ejecutable. Mismo resultado:
gana el `userData` por defecto.

## 4. Opciones

### A. Cambiar el bundle id y/o el esquema de cada copia y re-firmar ad hoc
- Cambiar solo el esquema no sirve: la web redirige a `claude://`, fijo. La copia no recibiría nada.
- Cambiar solo el bundle id no sirve sin más: el handler por defecto sigue siendo
  `com.anthropic.claudefordesktop`. Haría falta A + C (cambiar el handler por defecto a la copia).
- Coste: re-firma ad hoc (pierde Team ID y *designated requirement*). Riesgos: el llavero / `safeStorage`
  (la clave de cifrado del perfil) deja de ser accesible o pide permiso, el actualizador Squirrel/ShipIt
  rechaza paquetes, Gatekeeper, el runtime endurecido y sus entitlements, y las instancias existentes con
  sesión. HU-0007 y HU-0008 dieron resultado negativo o `inconclusive` con exactamente esta técnica.
- Choca con: `docs/instancias.document.md` («La ruta de ICNS, `CFBundleIconFile` o firma ad-hoc queda
  descartada…»), HU-0012 fuera de alcance («Cambiar el bundle ID de una copia, por su efecto posible en la
  autenticación, el perfil o el updater»), `validate_provider_identity` (las re-firmadas no son donantes) y
  HU-0017 (DR y bundle id iguales).
- Plataformas: solo macOS, y en Windows/Linux no aplica.
- **No viable.**

### B. Code AI Profiles recibe el callback y lo reenvía a la instancia que lo pidió
- macOS: Code AI Profiles declara `claude:` (`tauri-plugin-deep-link`, dependencia nueva) y se pone como
  handler por defecto (`LSSetDefaultHandlerForURLScheme` / `NSWorkspace.setDefaultApplication`). Para
  reenviar al proceso exacto: un Apple Event dirigido por PID (requiere el permiso TCC de Automatización,
  invasivo) o `NSWorkspace.open([url], withApplicationAt: <copia>)`. **No está comprobado** que ese último
  distinga entre copias con el mismo bundle id, y si no encuentra la copia en marcha la **lanzaría sin
  `--user-data-dir`** (perfil de la original).
- Fragilidad: cada instancia vuelve a llamar a `setAsDefaultProtocolClient` al arrancar y recupera el
  handler. Code AI Profiles tiene que reafirmarlo antes de cada login y estar abierto cuando llega el
  callback. Además, hay que decidir a quién va un `claude://` cuando nadie pidió login (a la original).
- Windows/Linux: es donde mejor funciona. Reenviar es lanzar `"<exe>" --user-data-dir="<perfil>" "<url>"`:
  el lock de ese perfil lo tiene la instancia en marcha y Electron le entrega la URL por `second-instance`.
  Hace falta registrar el protocolo (HKCU o `.desktop` + `xdg-mime`) y sigue la carrera con
  `setAsDefaultProtocolClient`.
- Privacidad: Code AI Profiles **tiene en la mano la URL con el código o token de autenticación**. Choca
  con la regla central de `AGENTS.md`: «nadie lee, registra ni expone credenciales, cookies, tokens…».
  Solo sería admisible como tránsito opaco (sin parsear, sin log, sin persistir) y con autorización
  explícita.
- Choca también con «Sin dependencias, permisos invasivos…» (plugin nuevo, Automatización en macOS) y con
  que la app no reclama nada del sistema hoy.
- Coste: alto (historia grande, de tres plataformas). En macOS necesita un spike previo.

### C. Modo «iniciar sesión» que deja solo a la instancia destino como handler del esquema
- macOS: **no se puede.** El handler por defecto es un bundle id y todas las copias comparten el mismo.
  `lsregister -u` de las demás copias no cambia a qué proceso en marcha se entrega, y los procesos se
  vuelven a registrar al arrancar. Solo funcionaría combinado con A (descartada).
- Windows/Linux: viable. Durante el login se reescribe el comando del protocolo
  (`HKCU\…\claude\shell\open\command` o un `.desktop` temporal + `xdg-mime default`) a
  `"<exe>" --user-data-dir="<perfil>" "%1"` y se restaura al terminar. Sin elevación (HKCU, `~/.local`).
  Riesgos: carrera con `setAsDefaultProtocolClient` si otra instancia arranca entre medias, y dejar el
  registro alterado si la app se cierra a mitad (hace falta restaurar al arrancar).
- No toca credenciales: no ve la URL. Escribe una preferencia del sistema del usuario: ¿permiso invasivo?
  Lo decide el mantenedor.

### D. Login sin callback (copiar un código)
- No consta que la app de IA lo ofrezca. Saberlo exige mirar la pantalla de inicio de sesión (visible para
  el usuario), no el código. Si existiera, bastaría con documentarlo. **Se comprueba a mano, sin coste.**

### E. Inicio de sesión asistido con las piezas que ya existen
- Una acción «Iniciar sesión» en la instancia: avisa de qué instancias están en marcha, y con
  confirmación **las detiene** (con el cierre verificado por identidad de HU-0004), arranca solo la
  destino y, cuando el usuario confirma que terminó, **ofrece volver a abrir** las que detuvo. Si la
  original está abierta, pide cerrarla a mano (la app no cierra la original: HU-0004, fuera de alcance
  «cerrar la original u otra instancia»; aquí sería otra instancia con confirmación explícita, no
  silenciosa).
- Es automatizar el workaround que ya funciona. No toca el esquema, ni la firma, ni credenciales, ni
  permisos nuevos, ni dependencias. El fin del login lo confirma el usuario: no se lee el perfil.
- macOS: funciona (lo demuestra el workaround). Windows/Linux: **probablemente no basta** (sección 3) y
  necesitaría C para esas plataformas.
- Coste: bajo-medio, una historia pequeña de frontend y un comando IPC compuesto (o solo frontend
  reutilizando `stop_instance` / `launch_instance`).

### F. Documentarlo sin más
- Coste nulo. Una nota en `docs/instancias.document.md` y en el README: «para iniciar sesión, deja abierta
  solo la instancia que inicia sesión (y cierra la original)». Útil ya, como mínimo, en cualquier caso.

## 5. Recomendación

1. **Ahora:** F (documentar) y comprobar D a mano en la pantalla de login.
2. **Historia:** E en macOS, como «inicio de sesión asistido». Es la única que funciona en macOS sin
   re-firmar, sin tocar la URL de autenticación y sin permisos nuevos.
3. **Para Windows y Linux:** primero verificar en una máquina real si el callback llega siquiera a una
   instancia sola (sospecha: no). Si no llega, E necesita C en esas dos plataformas, dentro de la misma
   historia o en una hermana, en la línea de HU-0018 (que también espera prueba real en Windows/Linux).
4. **Descartar A.** Dejar B como spike opcional solo si el mantenedor quiere logins en paralelo sin detener
   nada y acepta que la app maneje la URL de autenticación en tránsito.

Observación aparte: LaunchServices acumula registros de copias borradas, fixtures en `/tmp` y DMGs, y hoy
resuelve `claude://` a una copia. Un `lsregister -u` de la copia al **borrar** una instancia reduciría la
basura, pero no arregla el defecto. Puede ir como O-n de la historia.

## 6. Clasificación

**Historia, no `/fix`.** La causa no es un error del código de Code AI Profiles. Es una limitación de
diseño: copias literales con el mismo bundle id y el mismo esquema, y perfiles separados solo por
`--user-data-dir`, que el sistema operativo no ve. No hay una «capa mínima» que corregir sin comportamiento
nuevo: cualquier solución añade un flujo (E), toca preferencias del sistema (C) o maneja el callback (B).
Lo único `/fix`-able es la documentación (F).

## 7. Lo que decide el mantenedor

- Si acepta E: que la app **detenga otras instancias** (con confirmación) para iniciar sesión.
- Si autoriza que la app **escriba el handler del protocolo** del usuario en Windows/Linux (C): ¿cuenta como
  permiso invasivo?
- Si se abre un spike de B: implica que la app **tenga la URL de autenticación** en tránsito (regla de
  privacidad), una dependencia nueva y, en macOS, posiblemente el permiso de Automatización.
- Confirmar que A sigue descartada (firma ad hoc / bundle id: HU-0007, HU-0008, HU-0012).
- Si hay una máquina Windows/Linux para comprobar el comportamiento real antes de diseñar C.
