# Verificación · HU-0017 · Descargar e instalar la original en macOS

Preparada por el orquestador el 2026-10-28. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo permisos y estados):
`revision-tecnica.md`, PASS sin bloqueos; R-1..R-6 corregidas antes de entregar.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `46eae71`, `c08a448`, `befc811`, `bd232ef`, `87f20be`, `0023e97` | Contrato IPC con `Channel`; `config.rs` + `build.rs` (URLs fuera del código, deuda de HU-0011 saldada); descarga, verificación, intercambio atómico con vuelta atrás y recuperación; flujo completo con sincronización |
| code-ai-profiles | frontend · `e283657`…`720d877` | Botón «Descargar e instalar», panel de progreso, sincronización pendiente en `DashboardRuntime` (paso 7, sin listeners), avisos y badge de pendiente |
| code-ai-profiles | correcciones · `edda501`, `7bc4a40`, `5f4712b`, `9e93f4b`, `2a3b5a9` | R-2..R-6 (backend) y R-1 (frontend) de la revisión técnica |
| code-ai-profiles | `700b2b6`, `24b6161`, `65a0d43`, `bf52878`, `6258758`, `0e8fe74` y el de esta verificación | Historia, arquitectura, ADR-0002, bitácora, revisión, skill de Rust y `docs/actualizaciones.document.md` |

## Comprobaciones

| Comprobación (2026-10-28) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde; se registra sobre el SHA de esta verificación |
| Pruebas de Rust | 92 (47 antes): feed, redirecciones, descarga con hash y límites, zip (zip slip, symlinks, bomba), verificación, intercambio y vuelta atrás, recuperación, flujo de punta a punta con éxito, fallos y cancelación |
| Pruebas del frontend | `result-messages` 23, `dashboard-state` 19, `test:ui` 12 |
| Contra la Claude instalada (architect, solo lectura) | su requisito de firma se cumple a sí mismo (`codesign -R` = 0) y falla con otro equipo (3); Gatekeeper la acepta como notarizada |
| Paquete oficial (architect, metadatos y `zipinfo`) | 378 MB, 5 202 entradas coherentes, una raíz `Claude.app/`; responde 200 sin redirecciones ni cookies |
| Interfaz con el mock (frontend, oscuro y claro, 1440×920 y 980×680) | botón, progreso por fases, cancelar, error, original abierta, resultado con pendientes, sincronización automática al detener, y la pendiente que espera con la original abierta |
| Configuración fuera del código y guarda de producción | en orden; ninguna URL en `lib.rs` ni `original_update.rs` |
| Privacidad | sin cookies, UUID nulo, sin leer perfiles |

## Decisiones tomadas por defecto (★, revisables al probar)

1. D-1 · Verificación completa antes de tocar la original, con el requisito de firma de la instalada.
2. D-2 · Intercambio atómico en `/Applications/.code-ai-profiles-original-<uuid>/`, con vuelta atrás y recuperación al arrancar.
3. D-3 · Con la original abierta no se instala.
4. D-4 · Solo `https` a `downloads.claude.ai`, hasta 3 redirecciones a hosts permitidos.
5. D-5 · Sincronización de las detenidas; las abiertas quedan pendientes en memoria.
6. D-6 · Un clic sin confirmación; «Abrir Claude» como acción secundaria.
7. Tus decisiones: `sha2` directa, pendiente en memoria, carpeta temporal en `/Applications`, y las reglas de
   red, sincronización encadenada y módulos de Rust modificadas (ADR-0002).

## Guía de prueba

Dónde: la app instalada en tu Mac desde el `.dmg` de esta rama. Necesita una cuenta de administrador.

1. **AC-01 · El botón.** Con la original al día no aparece. Cuando el feed publique una versión nueva, aparece
   «Descargar e instalar» en el dashboard y en la página de la original, con la versión instalada y la disponible.
2. **AC-04 · Original abierta.** Abre Claude Desktop: el botón se deshabilita con «Cierra Claude Desktop para
   actualizarla.». Ciérrala y vuelve a estar activo.
3. **AC-02 · Instalar.** Con la original cerrada, pulsa el botón: descarga (MB y %), verificación, instalación y
   sincronización. Al terminar, la original muestra la versión nueva y no se abrió.
4. **AC-05 · Instancias.** Las detenidas quedan con la versión nueva. Si dejaste una abierta, aparece «Sincronización
   pendiente»; al detenerla se sincroniza sola y sale el aviso.
5. **AC-03 · Cancelar.** En otra ocasión, pulsa «Cancelar» durante la descarga: «Descarga cancelada. La original no
   cambió.».

**Solo tú puedes comprobar:**

- Una actualización real: depende de que Claude publique una versión posterior a la instalada (o de instalar a
  propósito una original más antigua). Nadie la ha hecho; todo se probó con paquetes y firmas de prueba.
- Que tus instancias funcionen después de sincronizarse con la versión nueva.
- Windows y Linux compilan solo en la CI (no se pudo aquí); su comportamiento no cambia.

## Veredicto

Pendiente de la persona: probará cuando salga una versión nueva de Claude y avisará cómo fue.
