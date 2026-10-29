# Análisis · icono personalizado de la instancia en el Dock de macOS

Arquitecto · 2026-10-28 · solo análisis: sin código, sin commits, sin tocar Claude, las instancias ni sus procesos.
Sistema de prueba: macOS 27.0.1 (26A434), Apple Silicon. Claude instalado: 3.6556.2 (Electron 44.9.3).

## 1. La conclusión en corto

**Sí es posible, y sin tocar la firma de Anthropic.** El intento anterior no falló por macOS. Falló por
**nuestra propia puerta de verificación**:

- `NSWorkspace.setIcon` (el icono personalizado de Finder) **sí cambia el icono que LaunchServices asocia a
  la app en marcha**, por ruta y no por bundle id. Lo comprobé con copias del mismo bundle id lanzadas a la
  vez: cada proceso tenía su propio icono.
- No cambia el CDHash, el Team ID, el DR, `Info.plist` ni los recursos sellados. `codesign --verify --deep`
  sin `--strict` (y con `-R=<DR de la original>`) sigue en verde. `spctl` acepta la app («Notarized
  Developer ID»). El Keychain sigue dando acceso sin diálogo.
- Lo único que falla es `codesign --verify --strict`, por **un solo motivo**: el xattr `com.apple.FinderInfo`
  en la raíz del bundle («resource fork, Finder information, or similar detritus not allowed»). El producto
  exige `--strict` en `validate_provider_identity_uncached` (`src-tauri/src/lib.rs:1532-1556`). Por eso
  `apply_macos_custom_icon` (`lib.rs:5017-5030`) revierte el icono en cuanto lo pone. El icono nunca llegó
  a quedarse aplicado mientras la instancia corría, así que **nunca se probó de verdad en el Dock**.
- Re-firmar (opción a) queda **descartado con evidencia nueva**: la Claude actual trae entitlements
  restringidos con `embedded.provisionprofile`. Un binario firmado ad hoc con esos entitlements lo mata AMFI
  al arrancar (lo reproduje: `exit 137` = SIGKILL, la misma «señal 9» que vio HU-0007).

Lo que **no** se puede confirmar sin mirar la pantalla: que el Dock pinte exactamente el mismo icono que
`NSRunningApplication.icon`. Es casi seguro, porque ambos lo piden a LaunchServices/IconServices, pero lo
tiene que **comprobar el mantenedor a ojo** (script en §5). No usé capturas ni Accesibilidad.

## 2. De dónde saca el Dock el icono de una app en marcha

Por orden de precedencia:

1. **`NSApp.applicationIconImage`**, si la propia app lo fija en ejecución (en Electron, `app.dock.setIcon`).
   Solo puede hacerlo el proceso mismo. Documentado en Apple (`NSApplication.applicationIconImage`) y en
   Electron (`Dock.setIcon`).
   - **Claude no lo usa.** `grep` de solo lectura sobre `app.asar`: 0 apariciones de `dock.setIcon` /
     `dock?.setIcon`. Solo usa `dock.setBadge`, `bounce`, `show` y `setActivationPolicy`, que no tocan el icono.
2. **Si no**, el icono que LaunchServices/IconServices resuelve para el **bundle del que salió el proceso**
   (por su ruta). En ese icono, el **icono personalizado de Finder** (`Icon\r` en la raíz del bundle, más
   `com.apple.FinderInfo` con *kHasCustomIcon*) **gana** sobre `CFBundleIconName`/`Assets.car` y sobre
   `CFBundleIconFile`.
   - Comprobado en el sandbox, prueba K: un fixture con `Assets.car` + `CFBundleIconName`, sin icono de
     Finder, daba AZUL. Con `setIcon` daba ROJO, tanto en `NSRunningApplication.icon` como en
     `NSWorkspace.iconForFile`.
3. **El caché de iconos** del Dock/IconServices puede servir un icono viejo mientras el proceso sigue vivo.
   Por eso el icono se aplica con la instancia **detenida**, y se ve al lanzarla. No se toca el caché global
   (`killall Dock` está prohibido por HU-0007).

Claude declara `CFBundleIconFile=electron.icns` y `CFBundleIconName=Claude`, con `Assets.car`. Es el caso
que cubre la prueba K.

## 3. Pruebas en el sandbox

Se usaron un fixture Cocoa propio (`DockFixture`, firmado ad hoc, bundle id fijo) y un clon APFS de
`AnyDesk.app` (firmado Developer ID y notarizado, con `com.apple.provenance` y `quarantine`). El clon de
AnyDesk no se lanzó. **No se lanzó, copió ni modificó Claude.** Todo proceso se cerró por su PID, y no queda
ninguno vivo.

| # | Prueba | Resultado |
| --- | --- | --- |
| 1 | `setIcon` en una copia del fixture | Crea `Icon\r` (0 bytes, icono en su resource fork) en la raíz y `com.apple.FinderInfo` en el directorio. CDHash idéntico (`2884128c…`) |
| 2 | `codesign --verify` (normal, y `--deep`) tras `setIcon` | `valid on disk`, `satisfies its Designated Requirement` |
| 3 | `codesign --verify --deep --strict` tras `setIcon` | Falla **solo** por el xattr: «Disallowed xattr com.apple.FinderInfo» |
| 4 | Lo mismo en el clon notarizado de AnyDesk | `setIcon ok`. `--deep` y `-R=<DR de AnyDesk>` en verde. `--strict` falla igual. `spctl --assess`: **accepted, Notarized Developer ID**. Al quitar el icono vuelve el `--strict` en verde |
| 5 | Control: un byte añadido a `Info.plist` | `-R=<DR>` no estricto **sí lo detecta** («invalid Info.plist»). La verificación sin `--strict` sigue cazando la manipulación |
| 6 | Cuatro procesos del **mismo bundle id**, en marcha a la vez | `NSRunningApplication.icon` por PID: ROJO, AZUL, VERDE y AZUL, cada uno según el icono de Finder de **su** copia |
| 7 | Bundle renombrado (`DockFixture · Trabajo.app`) | Firma estricta en verde, pero `localizedName` sigue siendo `DockFixture` (sale de `CFBundleDisplayName`). Renombrar la carpeta **no** cambia el nombre de la app en marcha |
| 8 | Keychain (llavero aislado en el scratchpad, sin interacción): el ítem lo crea la app limpia y se lee después | Limpia: `find=0`. Con `setIcon`: **`find=0`**. Con un recurso sellado alterado: `find=0`. **Re-firmada ad hoc: `find=-25293`** (denegado; con interacción sería un diálogo pidiendo la contraseña) |
| 9 | Binario ad hoc con `com.apple.application-identifier`, `team-identifier` y `keychain-access-groups` (los de Claude 3.x) | **`exit 137` (SIGKILL de AMFI)**. Sin ellos: `exit 0` |

Electron de Claude, leído de los fusibles en el binario, en solo lectura: `RunAsNode=0`,
`EnableNodeOptionsEnvironmentVariable=0`, `EnableNodeCliInspectArguments=0`,
`EnableEmbeddedAsarIntegrityValidation=1`, `OnlyLoadAppFromAsar=1` y `EnableCookieEncryption=1`.

## 4. Las opciones

### a) Reemplazar el `.icns`/`Assets.car` y re-firmar ad hoc · **No viable**
- **Con los entitlements de Claude:** AMFI la mata al arrancar (prueba 9). Claude 3.x lleva
  `com.apple.application-identifier`, `com.apple.developer.team-identifier` y `keychain-access-groups`
  (webauthn, hwkey, Microsoft identity), autorizados por `embedded.provisionprofile` de su Team ID
  (Apple TN3125). Una firma ad hoc no puede llevarlos.
- **Quitándole esos entitlements:** arranca, pero:
  - pierde el llavero de protección de datos: passkeys/webauthn, la clave hardware (`hwkey`) y el SSO de
    Microsoft (MSAL);
  - el ítem «Claude Safe Storage», que comparten todas las instancias y descifra las cookies (fusible de
    cookies encriptadas activo), deja de reconocer la app (prueba 8: `-25293`). macOS pide la contraseña del
    llavero. Si se deniega, no se descifran las cookies y **se pierde la sesión**. El diálogo **vuelve con
    cada sincronización/actualización**, porque cambia el CDHash;
  - el actualizador Squirrel.Mac de Claude valida la actualización contra el DR de la app en marcha. Con un
    DR `cdhash H"…"`, ninguna actualización oficial lo cumple, así que las actualizaciones internas fallan;
  - el producto rechaza estas copias por diseño: `provider_signature_preserved=false`, «firma ad-hoc
    heredada» (`lib.rs:1690`, `:5001`). HU-0017 no se ve afectada, porque a la original nunca se le pone icono.
- Modificar la app de Anthropic contradice lo que ya decidió el mantenedor
  (`docs/instancias.document.md`: «La ruta de ICNS, `CFBundleIconFile` o firma ad-hoc queda descartada»).
- Variante sin re-firmar (cambiar el icns y dejar la firma rota): el Keychain seguiría (prueba 8, caso 3),
  pero la firma queda **inválida** también sin `--strict`. Es peor que (b) y no gana nada visualmente.

### b) `NSWorkspace.setIcon` (icono de Finder) · **Viable. Es la recomendada**
- Cambia el icono de la app **en marcha** (pruebas 6 y K), por instancia aunque compartan bundle id, y
  también el del icono anclado en el Dock, Finder y Cmd-Tab (estos tres, a confirmar a ojo).
- **Firma de Anthropic intacta:** el mismo CDHash, Team ID, DR, entitlements y perfil de aprovisionamiento.
  AMFI no tiene nada que revalidar.
- **Sesión, Keychain y safeStorage:** sin cambios (prueba 8). El DR y el CDHash con los que el llavero
  reconoce la app no cambian.
- **Actualizador de Claude:** compara la actualización contra el DR, que no cambia. Si Claude se actualiza
  sola dentro de una copia, ShipIt reemplaza el bundle y **el icono se pierde** hasta la próxima
  sincronización o reaplicación. Esto ya pasaba con la provenance; no es nuevo.
- **Gatekeeper:** `spctl` acepta (prueba 4).
- **Coste:** relajar **solo para copias administradas con icono** la puerta `--strict`, sustituyéndola por
  una verificación equivalente en seguridad:
  `codesign --verify --deep -R=<DR de la original>`, más el CDHash de la provenance, más una **lista
  cerrada** de lo único extra que se admite: `Icon\r` en la raíz y `com.apple.FinderInfo` /
  `com.apple.ResourceFork` en la raíz y en `Icon\r`. La prueba 5 demuestra que la verificación sin
  `--strict` sigue cazando la manipulación. La original y el *staging* de HU-0017 **siguen con `--strict`**.
- Lo que hay que tocar (para una historia futura, no ahora):
  - `apply_macos_custom_icon` deja de revertir;
  - `validate_provider_identity_uncached` / `validate_managed_provenance` aceptan la forma «con icono»;
  - al clonar desde una donante con icono, se quita el icono heredado y se pone el de la destino (`cp -c`
    copia `Icon\r` y FinderInfo);
  - el test `lib.rs:6061`, que hoy exige el fallo «verificación estricta», se invierte;
  - las instancias que ya tienen icono se reaplican al detenerlas.
- **Riesgo abierto:** el «NSWorkspace rechazó el icono personalizado» del spike anterior **no lo
  reproduje**. Desde esta terminal, `setIcon` funcionó, incluso en un clon notarizado con
  `com.apple.provenance`, y `setIcon(nil)` sin icono previo también devuelve `true`. Causas posibles, no
  comprobadas: el sandbox en el que corrió aquel agente, o la protección **App Management** de macOS 13+,
  que podría exigir el permiso «Gestión de apps» para Code AI Profiles. Solo se sabe probándolo **desde la
  app** en una instancia de prueba. Si hiciera falta ese permiso, es un permiso nuevo y lo autoriza el
  mantenedor (ver §6).

### c) Lanzador propio con su `.icns` · **No sirve**
El Dock dibuja un icono por **proceso registrado**. El proceso Electron se registra con el bundle del que
sale su ejecutable (la copia de Claude). El lanzador mostraría su icono solo mientras vive, y luego quedaría
el de Claude. Hacer que el ejecutable de Claude «parezca» de otro bundle (enlaces o *hardlinks*) rompe el
sello del bundle o la carga de `Frameworks`, sin ganar nada sobre (b).

### d) Inyectar `app.dock.setIcon` · **No viable y peligroso**
- `NODE_OPTIONS`, `--inspect` y `ELECTRON_RUN_AS_NODE` están **cerrados por los fusibles** de Anthropic.
- La única vía que queda, `--remote-debugging-port`, solo llega a los *renderers*, no al proceso principal.
  Además abre un puerto con el que cualquier proceso local podría manejar una sesión ya iniciada y leer
  cookies. Choca de frente con la regla de privacidad.
- Tocar `app.asar` rompe `ElectronAsarIntegrity` y la firma.

### e) API del Dock / `NSDockTile` desde otro proceso · **No existe**
`NSDockTile` solo sirve para la propia app. `NSDockTilePlugIn` requiere una clave en `Info.plist` (sellado) y
solo actúa con la app cerrada. Lo demás serían SPI privadas (CoreDock, `_LSSetApplicationInformationItem`),
sin documentar, frágiles entre versiones e impropias de una app open source.

### f) Cambiar el nombre en el Dock · **No viable sin romper la firma**
El nombre de la app en marcha sale de `CFBundleDisplayName`/`CFBundleName`, que están en `Info.plist`
sellado. Renombrar la carpeta del bundle no lo cambia (prueba 7) y además rompería las rutas fijas del
producto (`application/Claude.app`, `lib.rs:2068`). Con (b), el icono ya distingue las instancias.

## 5. Lo que comprueba el mantenedor a ojo

1. **Fixture, sin Claude (1 minuto):** ejecutar
   `/private/tmp/claude-501/-Users-braiyanrodriguez-Desktop-PROYECTOS-BRAIYAN-CLAUDE-WRAPPER/288ca477-5b35-4b90-8643-2e8bbdd7d2ef/scratchpad/dock-icon/prueba-a-ojo.sh`.
   Lanza tres copias del mismo bundle id (azul, roja y verde) durante 25 s y las cierra por PID. Si el Dock
   muestra tres cuadrados de colores distintos, el mecanismo queda confirmado.
2. **Ya en la historia, con una instancia de prueba vacía:** aplicar el icono desde la app con la instancia
   detenida, lanzarla y mirar el Dock, Cmd-Tab y si aparece algún aviso de «Gestión de apps». Antes y
   después: `codesign -dv --verbose=4` (el mismo CDHash) y que la sesión siga iniciada.
3. **Estética en macOS 26+:** si el icono cuadrado sale «encerrado» en la plantilla gris del sistema. Es
   cosmético.

## 6. Reglas escritas que chocan

| Opción | Regla o decisión escrita | Choque |
| --- | --- | --- |
| a | `docs/instancias.document.md`: «La ruta de ICNS, `CFBundleIconFile` o firma ad-hoc queda descartada porque puede alterar requisitos de firma y afectar Keychain/safeStorage»; HU-0007: «La técnica de re-firma ad-hoc queda rechazada»; el código rechaza copias ad hoc | Frontal. Ahora además con evidencia (AMFI y llavero) |
| a, d | AGENTS «Privacidad» (promesa central) y «Sin permisos invasivos» | d abre un puerto de depuración sobre la sesión |
| b | `docs/instancias.document.md`: «Si la verificación estricta falla, revierte» y «La confirmación requerida en macOS necesita una alternativa que mantenga `codesign --verify --deep --strict`» | **Es el único choque de b.** Es una decisión propia del proyecto, no un límite de macOS. El mantenedor decide si la cambia por la verificación equivalente de §4b |
| b | Misma guía: «No se cambian archivos dentro del bundle» | `setIcon` crea `Icon\r` (0 bytes, sin sellar) en la raíz. No altera ningún archivo sellado, pero literalmente añade uno. Hay que reescribir la frase |
| b | AGENTS «Sin permisos invasivos… que la persona no autorice» | Solo si la prueba desde la app pide «Gestión de apps» |
| todas | AGENTS «Tres plataformas» | Solo cambia macOS. Windows y Linux mantienen su tabla actual |
| b | Antes del análisis, `graphify query` | No lo corrí: localicé los símbolos con `rg` en `lib.rs`. `graphify-out/` no se tocó |

## 7. Lo que decide el mantenedor

1. Si acepta cambiar, **solo para copias administradas con icono**, la puerta `--strict` por la verificación
   equivalente (`--deep -R=<DR>` + CDHash + lista cerrada de `Icon\r`/FinderInfo). Sin esto no hay icono en
   el Dock por ninguna vía segura.
2. Si, en caso de que macOS lo exija, autoriza pedir el permiso «Gestión de apps» para Code AI Profiles. Si
   no, se queda con el respaldo actual (icono solo dentro de la app).
3. Si confirma, con la prueba a ojo, antes de abrir la historia (`/hu-new`). El tamaño estimado es una
   historia pequeña-mediana, solo de backend (macOS). El modelo recomendado es **opus**, porque toca la
   verificación de firma. El frontend solo cambia el texto de `systemApplied`, y hay que actualizar la
   documentación.
4. Si se abandonan definitivamente (a), (d) y (f).
