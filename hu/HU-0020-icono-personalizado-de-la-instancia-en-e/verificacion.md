# Verificación · HU-0020 · Icono personalizado de la instancia en el Dock de macOS

Preparada por el orquestador el 2026-10-28. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo permisos): `revision-tecnica.md`,
PASS; R-1..R-4 y R-7 corregidas.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `391fa89`…`76fad7f` | Contrato, `macos_icon.rs` con la comprobación equivalente, registro del CDHash, verificación del staging, ciclo de vida del icono, comprobación al lanzar |
| code-ai-profiles | frontend · `ef01d4f`, `02310ba` | «Reintentar», aviso de «Gestión de apps», badge del Dock |
| code-ai-profiles | correcciones · `c2b4729`, `592da64`, `e37bc5d`, `ebc9037` | R-1..R-4 y R-7; aviso a LaunchServices tras cada cambio; plantilla de icono de macOS; textos y error del reintento |
| code-ai-profiles | `fc39180`, `4666cb9`, `cdaeeac`, `3d99327`, `e1a5c53` y el de esta verificación | Arquitectura, bitácora, revisión y verificación |

## Comprobaciones

| Comprobación (2026-10-28) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`) | en verde sobre `e1a5c53` |
| Pruebas de Rust | 122 (92 antes); matriz de manipulaciones con el icono puesto, CDHash, staging, quitar, reintentar, `EPERM`, plantilla del icono, aviso a LaunchServices |
| Pruebas del frontend | `test:format` 16, `test:ui` 15/15 |
| Instancias de este Mac (orquestador, solo lectura del registro y los `Info.plist`) | las copias con icono tenían `systemIssue: appManagement`: macOS protege las copias que Claude actualizó por su cuenta (4.29.0); hace falta el permiso «Gestión de apps» |
| Prueba a ojo (mantenedor, primer `.dmg`) | en las instancias nuevas el icono sale en el Dock; en las existentes no, y la imagen salía cuadrada |
| Prueba a ojo (mantenedor, `.dmg` de `e1a5c53` con «Gestión de apps») | «el icono quedo perfecto en el dock» |

## Decisiones (★)

1. D-1 · Icono de Finder persistente en las copias administradas.
2. D-2 · Comprobación equivalente a `--strict` solo para copias con icono; la original y la descarga de la HU-0017
   siguen con `--strict`.
3. D-3 · El icono se reaplica al lanzar si Claude se actualizó sola; solo se acepta una versión igual o mayor.
4. «Gestión de apps» se pide solo cuando macOS la exige, con «Reintentar».
5. El icono del Dock sigue la plantilla de macOS (margen, esquinas redondeadas, sombra); la imagen guardada no cambia.

## Guía de prueba

1. **AC-01.** Dos instancias abiertas a la vez, cada una con su icono en el Dock.
2. **AC-02.** Al abrirlas, el Llavero no pide la contraseña y conservan la sesión.
3. **AC-03.** Una copia modificada fuera de Code AI Profiles no se abre y pide sincronizar (cubierto por pruebas).
4. **AC-04.** «Quitar» el icono y abrir: vuelve el icono de Claude.

**Solo tú puedes comprobar:** AC-02 y AC-04 en tu Mac; Windows y Linux no cambian (solo CI).

## Veredicto

Pendiente de la persona. Primera respuesta, 2026-10-28: «el icono quedo perfecto en el dock».
