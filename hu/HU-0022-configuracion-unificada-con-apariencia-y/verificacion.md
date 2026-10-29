# Verificación · HU-0022 · Configuración unificada con apariencia y permisos

Preparada por el orquestador el 2026-10-29. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo permisos): `revision-tecnica.md`,
PASS; R-1, R-2 y R-5 corregidas antes de entregar. Maqueta aprobada antes de construir (`diseno/maqueta.html`).

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `1c7b8c3`, `82258bd`, `7a9ab41` | Contrato `openSystemSettings` y `accountFacts`; URLs de los paneles en `.env.example` (`CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL`, `CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL`); comandos con ramas para Windows y Linux |
| code-ai-profiles | frontend paso 1 · `689bde3`, `97c05ed`, `4db13ff`, `a64c5ba`, `f5e4931` | Sistema armónico en toda la app: escala de 4 px, alturas fijas por tamaño (fin de `--esc`), interlineados, radios 4/8/12/16/20/24, foco de 2 px, botón primario con texto oscuro; `DESIGN.md` y skills; pruebas 12, 15 y 16 de `test:ui` |
| code-ai-profiles | frontend paso 2 · `541f5e6`, `2b8003b`, `2b4c821`, `70a246b` | Página Configuración (Apariencia y Permisos), atajo ⌘, / Ctrl+,, enlace desde el editor; `test:permissions` |
| code-ai-profiles | correcciones · `da99619`, `3ca310f`, `e2cfb37` | R-1 marca entera en Grande, R-2 skills, R-5 accesibilidad |
| code-ai-profiles | historia, maquetas, arquitectura, revisión, `0f3c877` y el de esta verificación | Gobierno |

Rama `hu-0022-configuracion-unificada` (lleva también la HU-0023, que depende de esta).

## Comprobaciones

| Comprobación (2026-10-29) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde sobre `c28ebc6` (con la HU-0023) |
| Pruebas | `test:ui` 19 (12 reescrita, 15 escala, 16 contraste), `test:permissions` 14, `cargo test` 155 |
| Escala armónica (frontend, Chrome sin interfaz, 72 combinaciones del paso 1 y 56 del paso 2) | fuera de escala 919 → 7 (solo los huecos de los controles de ventana), radios 156 → 0, interlineados 376 → 0, nada bajo 11 px |
| Contraste | botón primario 3,0 → 6,0:1; hover 6,9:1; foco 7,1 / 5,3:1; verde de éxito en claro `#3f7a52` → `#3b7550` (4,46 → 4,77:1) |
| Fidelidad con la maqueta | oscuro y claro, 1440×920 y 980×680, macOS y Windows/Linux por mock (`evidencias/paso2/`) |
| DMG de la rama (`c28ebc6`, macOS Apple Silicon) | `Code AI Profiles_0.3.0_aarch64.dmg`, 6,2 MB, SHA-256 `bb1421648a4220790b0df9a6b9d2dfdcbe709e53ddc18f3143135ebb817e7515`, firma ad hoc válida, `Info.plist` con los cinco textos de carpetas, mínimo macOS 13.3 |
| Configuración fuera del código y guarda de producción | en orden |
| Grafo | `pnpm graph:check` en orden |
| Peso | CSS 216,5 → 218,7 kB; Configuración en un chunk diferido de 29 kB |

## Decisiones tomadas (★ y aprobadas)

1. D-1 · Página propia `#/configuracion/<sección>` con pestañas; «Configuración» sustituye a «Apariencia» en el sidebar.
2. D-2 · Solo los permisos de la plataforma actual.
3. D-3 · Estado cuando se puede saber: Gestión de apps desde el registro; Archivos y carpetas según los proyectos
   anclados; **Cuenta de administrador con estado real** (`id -Gn`, sin avisos) en lugar de «Solo informativo» (★
   del architect, tomada con tu «avanza con lo recomendado»).
4. D-4 · El aviso del editor enlaza a Permisos y no navega con cambios sin guardar.
5. **Atajo ⌘, / Ctrl+,** para abrir Configuración (★ del architect).
6. R-4 aceptada como excepción: en el botón pequeño de Compacto y en el título de la barra en Grande el texto cae a
   2 px de la retícula (alternativa: un token `--lh-ctl-sm`).

## Guía de prueba

Dónde: la app instalada desde el `.dmg` de esta rama (`src-tauri/target/release/bundle/dmg/Code AI Profiles_0.3.0_aarch64.dmg`), con tus instancias.

1. **AC-06 · Aspecto.** Recorre dashboard, una instancia, la original y algún diálogo en oscuro y claro, y en
   Compacto, Cómodo y Grande. Todo debe verse alineado y respirado; el botón principal lleva texto oscuro.
2. **AC-02 · Configuración.** Pulsa «Configuración» en el pie del sidebar (o ⌘,). Cambia tema y tamaño: se aplican
   al momento y se conservan al cerrar y reabrir la app. El diálogo de Apariencia ya no existe.
3. **AC-03 · Explicación.** En Permisos, abre la «i» de cada tarjeta con el ratón y con el teclado (Tab, Intro, Esc).
4. **AC-04 · Acceso directo.** «Abrir Ajustes del Sistema» en Gestión de apps abre Privacidad y seguridad › Gestión
   de apps; en Archivos y carpetas, su panel. La cuenta de administrador no tiene botón y dice si lo eres.
5. **AC-05 · Sin sorpresas.** Entrar en Configuración no muestra ningún aviso de macOS.
6. **Editor.** En una instancia con icono y el aviso de Gestión de apps, el enlace lleva a Permisos; con un cambio sin
   guardar, avisa y no navega.

**Solo tú puedes comprobar:** que los dos paneles se abren en el sitio exacto en tu macOS; que la lectura es cómoda en
los tres tamaños; Windows y Linux reales (solo CI).

## Veredicto

Pendiente.
