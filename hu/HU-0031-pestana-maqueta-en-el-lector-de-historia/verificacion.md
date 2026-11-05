# Verificación · HU-0031 · Pestaña Maqueta en el lector de historias

Preparada por el orquestador el 2026-11-05. Revisión técnica: PASS con observaciones; O-1 corregida en `030bc11`.

## Qué se entregó

| Commits | Qué |
| --- | --- |
| `202ddc6`, `08607dc` | Contrato `"design"` y `"tooLarge"`; lectura de `diseno/maqueta.html` con tope de 1 MiB; comando `open_history_mockup` (sin ruta desde la interfaz, re-validación, `file://`) |
| `9272d5c`, `030bc11` | Pestaña «Maqueta», marco `sandbox=""` con CSP propia, franja con «Abrir en el navegador», vacío de «demasiado grande» |
| `12bbf3e` y gobierno | Historia, maqueta aprobada, decisiones «Estática + abrir en navegador» y tope de 1 MiB, revisión y esta verificación |

## Guía de prueba

Usa un proyecto anclado con historias del método (por ejemplo este mismo repositorio).

1. **AC-01.** Abre una historia con maqueta (HU-0029, HU-0030 o HU-0031): la última pestaña es «Maqueta». Abre una sin
   maqueta (HU-0024): no aparece.
2. **AC-02.** Pulsa «Maqueta»: se ve la maqueta a todo el ancho, con su estilo; sus botones no hacen nada (es estática).
   Las de HU-0030 y HU-0031 se dibujan con JavaScript y se verán casi vacías.
3. **«Abrir en el navegador».** Se abre la misma maqueta en tu navegador, con sus botones funcionando.
4. **AC-04 · Tope.** La maqueta de la HU-0025 (664 KiB) se ve dentro. Una de más de 1 MiB muestra «demasiado grande para
   verla aquí» y solo «Abrir en el navegador».
5. **AC-03.** Nada de la maqueta carga de internet dentro de la app.

**Solo tú puedes comprobar:** el aislamiento y la CSP en la app compilada en macOS (WKWebView), Windows (WebView2) y
Linux (WebKitGTK); que «Abrir en el navegador» abre el navegador (y no un editor asociado a `.html`) en las tres; en
Windows el aviso de error casi nunca sale aunque falle, porque `rundll32` devuelve 0 (O-3).
