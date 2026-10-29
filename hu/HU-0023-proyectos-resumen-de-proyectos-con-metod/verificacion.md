# Verificación · HU-0023 · Proyectos: resumen de proyectos con metodología v4

Preparada por el orquestador el 2026-10-29. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo permisos): `revision-tecnica.md`.
La primera dio FAIL (R-1: una ruta de repo fuera de la carpeta se resolvía en disco, lo que en Windows abría red);
corregida con R-2..R-5 y R-9..R-11, la re-revisión da PASS. Maqueta aprobada antes de construir.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `ab26ad5`, `1785d4d`, `a9d609c` | Contrato con mocks; `tauri-plugin-dialog` 2.7.3 (autorizado) e `Info.plist` con los textos de los avisos de macOS; `projects.rs` (método, tecnologías, git) y seis comandos |
| code-ai-profiles | frontend · `ecf5102`, `10883f5`, `fcd3423`, `5d5e667`, `ac9d421` | Estado y cálculos (`test:projects`), lista, página, diálogo de anclar, sidebar, «Archivos y carpetas» activa en Configuración, caso 17 de `test:ui` |
| code-ai-profiles | correcciones · `4e98912`, `9fe8928`, `4f4be11`, `83c1514` | Rutas léxicas sin tocar disco, symlinks sin seguir, carpetas en la nube saltadas, topes de avisos, carreras del reducer, diálogo diferido, prohibición de `alert`/`confirm`/`prompt` |
| code-ai-profiles | historia, maquetas, arquitectura, revisiones, `da30038`, `c28ebc6` y el de esta verificación | Gobierno, CI y grafo |

## Comprobaciones

| Comprobación (2026-10-29) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde sobre `c28ebc6` |
| Pruebas | `cargo test` 155 (28 de proyectos: válido, no v4, roto, descartadas, varios repos, git suelto y empaquetado, symlinks, rutas fuera, UNC, carpeta en modo 000, nube, registro dañado, «solo lectura» con huella del árbol); `test:projects` 27; `test:ui` 19 |
| Cifras de este repo (architect) | 14 historias (1 en espera · 4 en curso · 7 terminadas · 2 descartadas), 56 h en fases, 572 M tokens, 97,8 % caché, 2,7 M entrada + salida; coinciden con `hu/INDEX.md` y los `metricas.json` |
| Escala y retícula (frontend, 20 pantallas) | solo los huecos ya conocidos fuera de escala; cifras 4/12 + 4 × 2/12 de igual alto; Tecnologías 5/12 y Repos 7/12 |
| Privacidad | sin `~/.claude`, sin datos de la app ni perfiles, sin red ni ejecutar nada; del reflog solo fecha y SHA |
| DMG de la rama (`c28ebc6`, macOS Apple Silicon) | `Code AI Profiles_0.3.0_aarch64.dmg`, 6,2 MB, SHA-256 `bb1421648a4220790b0df9a6b9d2dfdcbe709e53ddc18f3143135ebb817e7515`, firma ad hoc válida, `Info.plist` con los cinco textos de carpetas, mínimo macOS 13.3 |
| Configuración fuera del código y guarda de producción | en orden |
| Peso | JS principal 596 → 628 kB (mocks de desarrollo, ~12 kB, deuda R-7); rutas y diálogo diferidos |

## Decisiones tomadas (★ y del mantenedor)

1. D-1 · Solo lectura con el código de la app; nada del proyecto se ejecuta.
2. D-2 · Tecnologías de los manifiestos (también `src-tauri/Cargo.toml`) y packs; solo versión mayor.
3. D-3 · «Desde» en días y «Tiempo en fases» en horas (tu decisión).
4. D-4 · Lectura al entrar, con «Actualizar» y **al abrir la app** (tu decisión; ver aviso abajo).
5. D-5 · Rama, SHA corto y fecha del último commit, leídos de `.git` sin ejecutar `git`; la fecha es cuándo llegó el
   commit a la rama.
6. Tokens con la parte de caché y entrada + salida; descartadas fuera de los totales; se guarda el último nombre leído.

## Aviso para decidir · avisos de macOS al abrir la app (R-6)

Leer los proyectos al abrir la app puede mostrar **un aviso de macOS por cada tipo de carpeta** donde tengas proyectos
(Escritorio, Documentos, Descargas, iCloud, discos externos o de red). Como Code AI Profiles no está firmada con un
certificado de Apple, macOS **los vuelve a pedir tras cada actualización** de la app. Si prefieres evitarlo, la
alternativa es leer solo al entrar en Proyectos (el contador del sidebar aparecería al entrar la primera vez).

## Guía de prueba

Dónde: la app instalada desde el `.dmg` de esta rama, con proyectos v4 reales (por ejemplo esta misma carpeta,
`CLAUDE_WRAPPER`).

1. **AC-02 · Anclar.** Proyectos › «Anclar proyecto», elige la carpeta de un proyecto v4: el diálogo muestra lo
   detectado; confirma y aparece en la lista y en el sidebar. Cierra y reabre la app: sigue ahí. Ancla una carpeta
   cualquiera sin `.metodo/`: dice que no es v4 y no la ancla.
2. **AC-03 · Resumen.** Abre el proyecto: nombre, resumen, perfil, fase, tecnologías, repos con rama y último commit,
   «Desde», «Tiempo en fases», tokens e historias por estado, con las mismas cifras que su `hu/INDEX.md`.
3. **AC-04 · Historias.** Filtra por estado; las terminadas muestran tiempo y tokens; las descartadas, atenuados y
   sin sumar.
4. **AC-05 · Carpeta rota.** Ancla una copia de prueba de un proyecto, renómbrala en Finder y pulsa «Actualizar»:
   sale «Carpeta no encontrada» con el último nombre y «Desanclar». Desanclar no toca la carpeta.
5. **AC-06 · Solo lectura.** En el proyecto anclado, `git status` no muestra cambios tras anclar, ver y actualizar.
6. **Permisos.** Si macOS pregunta por Documentos o Escritorio, el texto explica para qué; si lo deniegas, el
   proyecto dice que falta el permiso y Configuración › Permisos › Archivos y carpetas pasa a «Lo necesita».

**Solo tú puedes comprobar:** el selector nativo y los avisos de macOS con la app instalada; tus proyectos reales;
Windows y Linux (solo CI).

## Veredicto

Pendiente.
