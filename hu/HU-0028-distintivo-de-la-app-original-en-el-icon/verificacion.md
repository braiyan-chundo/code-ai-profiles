# Verificación · HU-0028 · Distintivo de la app original en el icono de instancia

Preparada por el orquestador el 2026-11-03. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo plataforma): `revision.md`, PASS sin R-n;
O-3 y O-4 corregidas antes de entregar.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `4dd8a55`, `e90a629`, `b97193f` | Contrato `SystemInfo.providerBadge` y `CustomIcon.dockBadge`; `provider_badge.rs` lee el icono de la original (icns en macOS, recursos de `Claude.exe` en Windows, hicolor en Linux), lo recorta y guarda una copia en `<datos de la app>/provider-badge/`; el Dock lo compone abajo a la derecha; testigo para que las instancias existentes lo reciban una vez; scope del asset protocol solo para `provider-badge/*.png`; topes contra iconos manipulados |
| code-ai-profiles | frontend · `771efe1` | `InstanceAvatar` con distintivo en 64 y 32 px y en la vista previa del editor; el punto de estado sube arriba a la derecha; nada en 16 px ni en la original |
| code-ai-profiles | historia, maqueta, arquitectura, revisión, grafo, evidencias y esta verificación | Gobierno |

Rama `ajustes-windows-y-sidebar`, en el mismo PR que la HU-0027, el borde de Windows, el botón del sidebar y la detección
MSIX.

## Comprobaciones

| Comprobación (2026-11-03) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde sobre `0e949c6` |
| `cargo test` | 241 pasan, 2 ignoradas (19 nuevas: lectores icns y PE con datos rotos y hostiles, recorte, caché y limpieza, memoria, Linux, contrato, Dock con distintivo, testigo y A-2) |
| Sonda con el `electron.icns` real de `/Applications/Claude.app` (solo lectura) | distintivo de 512 px y icono de Dock de 1024 con el distintivo abajo a la derecha, como la maqueta |
| `test:dashboard` · `test:ui` | 25 de 25 · 20 de 20 |
| DMG (macOS Apple Silicon) | `Code AI Profiles_0.4.0_aarch64.dmg` (código de `0e949c6`), SHA-256 `5b4ea81cd50180c3ce4797f0d637e5d27d96e7f28e9428b088c6232b5d813284` |
| Configuración fuera del código y guarda de producción | en orden |
| Grafo (`graph:check`) | al día |
| Capturas con mocks | `evidencias/` (64, 32, 16, editor, quitar, sin icono y original; oscuro y claro). El distintivo del mock es un cuadrado neutro |

## Decisiones tomadas

1. Maqueta aprobada con sus ★: D-1 icono real de la original, D-2 se añade al mostrar (tu imagen no cambia), D-3 36 %,
   D-4 punto de estado arriba, D-5 sin distintivo en 16 px, D-6 Windows y Linux solo en la app, D-7 sin icono legible no
   hay distintivo.
2. En el Dock el distintivo mide 368 de 1024 px (el 36 % del lienzo de la maqueta). Si lo quieres más pequeño es una
   constante.
3. El webview puede leer `provider-badge/*.png` de los datos de la app.

## Guía de prueba

Dónde: la app instalada desde el `.dmg` de esta entrega, con al menos una instancia con icono propio (y mejor otra sin
icono). Instancias detenidas al empezar.

1. **AC-02 · En la app.** Abre la página de la instancia con icono: el icono de Claude está abajo a la derecha del avatar
   y el punto de estado arriba a la derecha. En el dashboard, «Uso por instancia» lo muestra igual en pequeño. En el
   sidebar (16 px) no hay distintivo y el punto sigue abajo. La original y la instancia sin icono no cambian.
2. **AC-01 y AC-03 · Dock de una instancia que ya tenía icono.** Ábrela desde la app: en el Dock su icono lleva el de Claude
   abajo a la derecha. Ciérrala y vuelve a abrirla: sigue igual y no parpadea ni se vuelve a aplicar. Mira también el
   Finder (Aplicaciones de la instancia, desde «Abrir carpeta»).
3. **AC-04 · Cambiar la imagen.** En el editor elige otra imagen: la vista previa ya lleva el distintivo. Guarda y abre:
   el Dock enseña la nueva con el distintivo. La instancia abre sin avisos de firma.
4. **AC-04 · Quitar.** «Quitar» el icono y guardar: la instancia vuelve al icono de Claude, sin distintivo, en la app y
   en el Dock.
5. Cambia a tema claro: el halo del distintivo en la app se ve limpio.
6. **AC-05** (sin icono legible de la original, sin distintivo ni error) lo cubren las pruebas de cargo; no hace falta
   romper tu Claude para verlo.
7. Si quieres, «Reintentar» en una instancia con icono y una sincronización: el distintivo se mantiene.

**Solo tú puedes comprobar:** el Dock real en claro y oscuro; Windows (clásico y MSIX) y Linux, solo dentro de la app,
cuando haya instaladores de la rama.

## Veredicto

Pendiente.
