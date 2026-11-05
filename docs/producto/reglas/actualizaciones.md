# Reglas de negocio · actualizaciones

### RN-06 · ~~El handoff manual no descarga, instala ni reemplaza la aplicación original~~ → En macOS la persona puede pedir que se descargue e instale la versión oficial más reciente de la original
Cambiada en HU-0017 (antes: la app solo abría el canal oficial y la persona actualizaba Claude a mano; la regla
vivía en `docs/actualizaciones.document.md`). Solo con un clic de la persona y con la original cerrada. El paquete
sale del feed oficial y se verifica entero (tamaño, `sha256`, firma con el requisito de la instalada y Gatekeeper)
antes de tocar la original; si algo falla, la original no cambia o se restaura. Se mantiene que la original nunca
recibe una copia de una instancia. En Windows y Linux sigue el handoff al canal oficial.
