# HU-0010 — Publicar el fix de actualización como versión 0.2.2

## Metadatos

- Estado: `Review`
- Creada: 2026-10-27
- Actualizada: 2026-10-27
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación prevista: `backend` para el versionado; `document` para trazabilidad y documentación de publicación

## Historia de usuario

Como mantenedor de Code AI Profiles, quiero publicar el fix compatible de actualización original como `0.2.2`, integrarlo mediante los PR protegidos y obtener un instalador de macOS verificable, para distribuir un build identificable y trazable sin alterar perfiles ni sesiones.

## Problema

HU-0009 está cerrada en una rama remota, pero las fuentes canónicas del proyecto continúan en `0.2.1`. Sin una actualización SemVer coordinada, changelog, integración ordenada de ramas y empaquetado desde `main`, el instalador no podría identificarse de forma fiable como la corrección publicada.

## Contexto y evidencia de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- La consulta relacionó `Versionado`, `Versionado SemVer`, `release-version.mjs`, `releaseVersion`, `checkVersions`, los manifests y locks propios, la configuración de bundle Tauri, `CHANGELOG.md` y HU-0005.
- HU-0005 define `patch` como la categoría para fixes compatibles y documenta que el script de versión valida primero y sincroniza las fuentes canónicas de forma atómica.
- HU-0009 cerró el fix compatible de disponibilidad oficial y refresco de versiones; no cambió aún la versión del producto ni generó un instalador.
- El README conserva una descripción obsoleta de macOS como descarga DMG directa. HU-0009 cambió ese handoff: se abre exclusivamente el bundle original validado y se guía a `Claude > Check for Updates`.

## Alcance

1. Subir `0.2.1` a `0.2.2` exclusivamente mediante `npm run release:version -- patch` y sincronizar las fuentes canónicas que controla el script.
2. Añadir una entrada de changelog fechada el 2026-10-27 que resuma el comportamiento publicado por HU-0009 sin atribuir causas, canales o rollouts a versiones locales.
3. Actualizar README y `docs/versionado.document.md` a `0.2.2`; el README reflejará el flujo de macOS actual y conservará Windows con descarga oficial y Linux con instrucciones.
4. Dejar preparado el handoff operativo para que la coordinación raíz integre la rama del fix en `develop` con un PR y merge commit después de sus checks, y después `develop` en `main` mediante otro PR con las mismas garantías; no habrá push directo a ramas protegidas.
5. Generar, a petición explícita del mantenedor, un bundle `.app` y DMG local de macOS Apple Silicon desde el worktree actual `0.2.2`; reportar ruta, versión, verificaciones disponibles y hash. El resultado se identifica como artefacto local mientras no exista evidencia de que el commit llegó a `main`.

## Fuera de alcance

- Cambios funcionales, de dependencias, permisos, telemetría o esquemas de datos.
- Tags, GitHub Releases, publicación de artefactos remotos o actualización automática de Code AI Profiles.
- Notarización o firma Developer ID que no estén configuradas en este host.
- Instaladores Windows o Linux.
- Tocar aplicaciones instaladas, perfiles, sesiones, credenciales, cookies, prompts, respuestas o transcripts.

## Criterios de aceptación

1. Las fuentes canónicas que controla `release:version` quedan en `0.2.2` y `npm run release:check` lo confirma.
2. El cambio de versión usa el script existente, sin edición manual de manifests ni locks propios.
3. `CHANGELOG.md`, README y `docs/versionado.document.md` describen `0.2.2` y el flujo de actualización de macOS de forma coherente con HU-0009.
4. Pasan `npm run test:release`, `npm run release:check`, `npm run test:update`, `npm run test:scan`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml` y `git diff --check`.
5. El cierre actualiza Graphify, revisa el impacto de `releaseVersion` o una consulta equivalente y `npm run graph:check` pasa después de versionar los artefactos requeridos.
6. El handoff de integración especifica el orden feature→`develop` y `develop`→`main`, ambos por PR y merge commit, sin relajar las protecciones ni realizar push directo.
7. La documentación no afirma que `main` haya recibido `0.2.2` ni que exista un instalador antes de que la coordinación raíz complete esos pasos y entregue evidencia verificable.
8. El artefacto local solicitado produce un DMG y `.app` de macOS Apple Silicon con versión `0.2.2` verificable y hash reportable. Si el checkout no es `main`, la evidencia debe identificarlo como artefacto de worktree no publicado. La compilación no debe modificar aplicaciones ni datos de usuario existentes.

## Diseño técnico y contratos

- `scripts/release-version.mjs` es el único escritor de la versión de `package.json`, las dos entradas raíz de `package-lock.json`, el paquete propio de `src-tauri/Cargo.toml` y `src-tauri/Cargo.lock`, y `src-tauri/tauri.conf.json`.
- El incremento `patch` es compatible y no cambia el contrato de datos ni la semántica de HU-0009.
- La compilación macOS usa la configuración Tauri ya versionada del worktree actual; la publicación desde el commit final de `main` sigue requiriendo su propia evidencia. Una firma ad hoc local no equivale a notarización o distribución firmada por Developer ID.

## Casos límite, privacidad y plataformas

- Si las fuentes canónicas discrepan, el script debe fallar antes de escribir; no se intentará corregirlas manualmente dentro de esta HU.
- Si CI o un merge protegido falla, la coordinación raíz no continuará a la siguiente rama ni al empaquetado de distribución.
- Un fallo de firma, bundle o DMG bloquea la entrega del artefacto y se reporta con sus diagnósticos; no se sustituye por un instalador no verificado. Esta HU no declara el resultado de ese paso antes de recibir la evidencia.
- La compilación no abre ni modifica la aplicación original, instancias, perfiles o sesiones. El paquete macOS se genera para la arquitectura del host; las demás plataformas no se publican en esta iteración.

## Plan de delegación

1. `backend` ejecutará únicamente el script SemVer existente y comprobará las fuentes canónicas y las pruebas de versión. No modificará producto, documentación, Graphify ni Git remoto.
2. `document` mantiene esta HU, el índice, changelog, README y documentación de versionado a partir de la evidencia verificada por `architect`.
3. `architect` revisa el cambio SemVer y la documentación, coordina el cierre Graphify y comunica a la coordinación raíz los criterios satisfechos. Para esta solicitud concreta, `backend` ejecuta el empaquetado local y sus verificaciones nativas; los PR, merges y toda publicación remota siguen fuera de alcance.

## Plan y resultado de pruebas

Evidencia de implementación recibida de `backend` y verificada por `architect`:

- `npm run release:version -- patch` actualizó exclusivamente las seis fuentes previstas de `0.2.1` a `0.2.2`: `package.json`, las dos entradas raíz de `package-lock.json`, el paquete propio de `src-tauri/Cargo.toml`, el bloque propio de `src-tauri/Cargo.lock` y `src-tauri/tauri.conf.json`.
- `npm run release:check` confirmó `0.2.2`; `npm run test:release` pasó 11 de 11 y `git diff --check` pasó.
- La coordinación raíz verificó el fix incluido: `npm run test:update` pasó 24 de 24, `npm run test:scan` 13 de 13, `npm run build` correctamente y `cargo test --manifest-path src-tauri/Cargo.toml` 43 pruebas aprobadas y 1 ignorada.
- `npm run build:macos` terminó con código 0 y generó `src-tauri/target/release/bundle/macos/Code AI Profiles.app` (16 MiB) y `src-tauri/target/release/bundle/dmg/Code AI Profiles_0.2.2_aarch64.dmg` (5.6 MiB). `release:check` confirmó `0.2.2`.
- El `Info.plist` del bundle reportó versión corta y de build `0.2.2`, identificador `com.braiyan.claudeprofiles`, y el ejecutable fue Mach-O `arm64`. `codesign --verify --deep --strict` fue válido con firma ad-hoc, runtime y sin Team ID. `hdiutil verify` reportó checksum `VALID`; un montaje temporal de solo lectura confirmó la `.app` `0.2.2` arm64 y el enlace `Applications` a `/Applications`, y se desmontó y limpió.
- `spctl` terminó con código 1 e error interno, resultado compatible con artefacto ad-hoc/no notarizado; no se interpretó como aprobación de Gatekeeper. SHA-256: DMG `e6a993554c7ab8b94d6be6a756ecbf4e4a79bd175a585697f9d88eddac270730`; ejecutable `5d9216f454b8a60c6fb242714413cbbeb81e948ad9b4556ade35b7dd4129c704`.
- `architect` ejecutó `npm run graph:update` con código 0: 1,033 nodos, 2,305 aristas y 61 comunidades. La consulta enfocada conectó HU-0010 con los scripts de `package.json`, `build`/`bundle`/`macOS` de `tauri.conf.json` y las fuentes de versión. `graphify affected "build:macos"` no identificó nodos directos, por lo que la consulta equivalente fue la evidencia aplicable.
- `npm run graph:check` reextrajo el grafo sin cambios de topología, pero terminó con código 1 únicamente porque `graphify-out/graph.json` y `graphify-out/GRAPH_REPORT.md` difieren de `HEAD`: el script exige que esos artefactos actualizados estén versionados en un commit. Esta tarea no autoriza el commit.

## Documentación afectada

- `CHANGELOG.md`: entrada `0.2.2`.
- `README.md`: versión vigente y flujo de actualización macOS.
- `docs/versionado.document.md`: versión vigente y enlace a esta HU.
- `docs/hu/index.md` y esta HU: trazabilidad de la publicación.

## Bitácora de implementación

- 2026-10-27: `architect` clasificó HU-0009 como fix compatible y recomendó el incremento patch `0.2.2`. `document` creó HU-0010 y la dejó en `Ready` con los criterios, privacidad, orden de integración y empaquetado verificables. No se modificaron código de producto, manifests, Graphify, perfiles ni sesiones durante esta preparación.
- 2026-10-27: `backend` ejecutó el script SemVer existente con `patch`; no editó producto ni dependencias. La evidencia verificada confirma las seis fuentes canónicas en `0.2.2`, `release:check`, 11 pruebas de release y las verificaciones del fix indicadas en «Plan y resultado de pruebas». `document` actualizó changelog, README y la documentación de versión, y dejó la HU en `Review` hasta el cierre de Graphify. Los PR protegidos, los merges y el artefacto macOS siguen siendo operaciones posteriores de coordinación raíz y no se declaran realizados.
- 2026-10-27: ante la solicitud explícita de terminar el build para macOS, `document` reabrió HU-0010 como `Ready` para el empaquetado local del worktree `0.2.2`. No autoriza publicación, tag, merge, GitHub Release, firma Developer ID ni notarización; la evidencia debe diferenciar el artefacto local de una entrega desde `main`.
- 2026-10-27: `backend` generó y verificó localmente el bundle y DMG de macOS Apple Silicon descritos en «Plan y resultado de pruebas». La compilación procede de `codex/fix-original-update-refresh`, con cambios sin commit; no es una compilación de `main`, ni un GitHub Release. `document` dejó la HU en `Review` a la espera exclusiva del cierre de Graphify por `architect`.
- 2026-10-27: `architect` actualizó y verificó Graphify. La topología resultante fue consistente, pero `graph:check` quedó bloqueado por la política de commit del propio script respecto de los artefactos de grafo modificados. La HU continúa en `Review`; el instalable local permanece generado y verificado.

## Resultado y riesgos residuales

El instalable local de macOS fue generado y verificado estructuralmente. Su procedencia es el worktree con cambios sin commit de `codex/fix-original-update-refresh`, no `main`; no constituye una publicación ni GitHub Release. La firma ad-hoc sin Team ID y el resultado de `spctl` impiden declararlo firmado con Developer ID, notarizado o aprobado por Gatekeeper; macOS puede requerir clic derecho → **Abrir**. Persisten los checks protegidos, los merges y el commit de los artefactos Graphify actualizado para que `graph:check` pueda cerrar una entrega publicada.

## Cierre de Graphify

`architect` ejecutó `npm run graph:update` correctamente (1,033 nodos, 2,305 aristas, 61 comunidades) y revisó la consulta equivalente de impacto. `npm run graph:check` no cerró porque exige un commit de `graphify-out/graph.json` y `graphify-out/GRAPH_REPORT.md`, ambos modificados frente a `HEAD`; no se autorizó ese commit. `document` no ejecutó ni modificó Graphify.
