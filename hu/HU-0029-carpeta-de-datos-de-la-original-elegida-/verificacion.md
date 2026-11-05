# Verificación · HU-0029 · Carpeta de datos de la original elegida por la persona

Preparada por el orquestador el 2026-11-05. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre`: `revision.md`, PASS con observaciones; O-2 y O-5
corregidas antes de entregar.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `3d9fef1`, `603758d` | Contrato `SystemInfo.originalProfileOrigin`, `originalProfileHasSessions`, `originalProfileChosenMissing`; `original_profile.rs` con la resolución única, la validación (solo metadatos), `original-profile.json` y el selector nativo; comandos `choose_original_profile_folder` y `forget_original_profile_folder`; estado, topología, sesiones, transferencias y Proyectos pasan por la resolución |
| code-ai-profiles | frontend · `1955a53`, `25b330e` | Aviso encima de la tarjeta de la original, «Perfil local» con «Elegido / Detectado / Sin sesiones / Sin detectar», fila «Carpeta de datos» con «Cambiar carpeta» y «Usar la detectada» |
| code-ai-profiles | `60727e8` | O-2 y O-5 de la revisión |
| code-ai-profiles | historia, maqueta, arquitectura, revisión, CHANGELOG, documentación, grafo y esta verificación | Gobierno |

Rama `fix-ventanas-consola-windows`, en el mismo PR que el arreglo de las ventanas de consola de Windows.

## Comprobaciones

| Comprobación (2026-11-05) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | ver `pruebas.mjs estado` sobre el SHA final |
| `cargo test` | 16 pruebas nuevas de la carpeta elegida (resolución, validación M-1..M-4, enlaces en Unix, persistencia, exclusión de Proyectos) |
| Interfaz con mocks (`pnpm dev`, `?original=sin-sesiones#/original`) | aviso, rechazo con M-3, carpeta elegida con sus sesiones, «Usar la detectada» y página sin cambios cuando hay sesiones: como la maqueta |
| Configuración fuera del código y guarda de producción | en orden |

## Decisiones tomadas

1. Maqueta aprobada («Aprobada», 2026-11-05) con sus ★ D-1 a D-8.
2. Desviación aceptada: el aviso «La carpeta elegida ya no existe» no muestra la ruta perdida (el contrato no la trae).
3. Si se borra `claude-code-sessions` dentro de la elegida, el aviso también dice «ya no existe» (R-6).

## Guía de prueba

Dónde: la app instalada desde el instalador de CI de esta rama. **Nunca renombres ni muevas los datos reales de Claude
para provocar el aviso.**

1. **AC-01 · macOS, todo en su sitio.** Abre «Aplicación original»: se ve como antes, sin aviso; «Perfil local» dice
   «Detectado».
2. **AC-01 · Windows de Anderson.** Abre «Aplicación original»: sale «No se encontraron las sesiones de Claude» con
   «Elegir carpeta» y «Perfil local» dice «Sin sesiones».
3. **AC-03 · Rechazo.** Pulsa «Elegir carpeta» y elige una carpeta cualquiera (por ejemplo, Documentos): sale el error
   «Esa carpeta no tiene «claude-code-sessions»…» y la página queda igual.
4. **AC-02 · Carpeta válida.** Si existe una carpeta con `claude-code-sessions`, elígela (o elige la propia
   `claude-code-sessions`): aparecen las sesiones, «Perfil local» dice «Elegido» y al pie de la tarjeta se ve la carpeta
   con «Elegida». Cierra y abre la app: sigue igual.
5. **AC-04 · Cambiar y volver.** «Cambiar carpeta» abre el selector; «Usar la detectada» vuelve al paso 2.
6. **AC-05 · Transferir.** Con la carpeta elegida y la original y una instancia detenidas, transfiere una sesión de la
   original a la instancia y devuélvela.
7. **Sin ventanas de consola.** Al abrir la app y escanear no aparece ninguna ventana de PowerShell ni de cmd.

**Solo tú puedes comprobar:** el selector nativo en las tres plataformas; en el Windows real, si existe alguna carpeta
con `claude-code-sessions` (R-4: si esa versión de Claude no la crea, el selector rechazará todo y hará falta otra
historia); las uniones de Windows (O-1); el paso de «No detectada» a «Detenida» con una carpeta elegida (O-4).
