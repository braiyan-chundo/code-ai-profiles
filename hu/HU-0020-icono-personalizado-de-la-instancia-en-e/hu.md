---
id: HU-0020
titulo: "Icono personalizado de la instancia en el Dock de macOS"
estado: en-proceso
fase: requisitos
area: instancias
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [permisos]
reglas: []
depende: []
---

# Icono personalizado de la instancia en el Dock de macOS

Como mantenedor con varias instancias abiertas
quiero que cada una muestre en el Dock su icono personalizado
para distinguirlas sin abrirlas.

## Petición original

> «analizar la posibilidad (que estaba pendiente) de que el icono personalizado de una instancia se pueda ver al montarla en el dock del mac (ver imagen2) es que codex no pudo, yo creo que tu si podras» — Braiyan Rodriguez (mantenedor), 2026-10-28

Elecciones, en la misma conversación, tras el análisis (`analisis.md`):

- «Sí, cambiar regla (Recomendado)»: el icono de Finder se queda puesto en las copias administradas y la
  verificación estricta se sustituye, solo para ellas, por una comprobación equivalente.
- Permiso «Gestión de apps»: «Sí, si hace falta».

## Lo que se sabe (análisis del architect, 2026-10-28)

- El Dock muestra el icono de Finder (`NSWorkspace.setIcon`) de cada copia, también con la app en marcha, y
  por copia aunque todas compartan identificador; gana sobre el icono interno de Claude.
- Con el icono puesto, la firma de Anthropic no cambia (mismo CDHash, Team ID y requisitos); `codesign --verify
  --deep` y `spctl` pasan. Solo falla `--strict`, por el atributo `com.apple.FinderInfo` en la raíz del bundle.
- El llavero («Claude Safe Storage») sigue funcionando con el icono; con una re-firma ad hoc, no.
- Hoy el producto revierte el icono justo después de ponerlo porque la verificación estricta falla
  (`apply_macos_custom_icon`, `src-tauri/src/lib.rs`), así que nunca llega al Dock.
- Re-firmar, inyectar código y cambiar el nombre del Dock quedan descartados (detalle en `analisis.md`).

## Alcance

- Dejar puesto el icono personalizado en las copias administradas de macOS, aplicado con la instancia detenida.
- Sustituir, solo para esas copias, `codesign --strict` por: `codesign --verify --deep` con los requisitos de
  la original, el CDHash registrado y, como único añadido admitido, el icono de Finder (`Icon\r` y sus
  atributos).
- Reaplicar el icono tras sincronizar o clonar, quitando el heredado.
- Pedir el permiso «Gestión de apps» solo si macOS lo exige, con su explicación.
- Actualizar `docs/instancias.document.md`, README y CHANGELOG.

## Fuera de alcance

- Windows y Linux.
- La original y la descarga de la HU-0017, que siguen con `--strict`.
- Re-firmar, inyectar código o cambiar el nombre en el Dock.

## Decisiones por defecto (★)

- ★ **D-1 · Icono de Finder persistente.** *Alternativa:* ninguna viable sin tocar la firma.
- ★ **D-2 · Comprobación equivalente solo para copias con icono.** *Alternativa:* aceptar `--deep` sin más.
- ★ **D-3 · Si Claude se actualiza sola dentro de una copia y pierde el icono**, se reaplica en la siguiente
  detención o sincronización. *Alternativa:* avisar y no reaplicar.

## Criterios de aceptación

### AC-01 · El icono se ve en el Dock

Una instancia con icono personalizado muestra ese icono en el Dock al abrirla, también con otras instancias
abiertas a la vez, cada una con el suyo.

### AC-02 · La sesión y las actualizaciones siguen igual

Con el icono puesto, la instancia abre sin pedir la contraseña del llavero, conserva su sesión y se sincroniza
y actualiza como antes.

### AC-03 · La verificación sigue protegiendo

Una copia con el icono pasa la comprobación; una copia con cualquier otro cambio en el bundle la falla y no se
lanza.

### AC-04 · Quitar el icono

Al quitar el icono personalizado, la instancia vuelve al icono de Claude en el Dock.

## Reglas de negocio afectadas

- **Regla modificada (confirmado por el mantenedor, 2026-10-28):** `docs/instancias.document.md` dice que si la
  verificación estricta falla tras aplicar el icono, se revierte, y que no se cambian archivos dentro del bundle.
  Para las copias administradas de macOS con icono, la verificación estricta se sustituye por la comprobación
  equivalente de D-2 y se admite el icono de Finder. Se deja su delta al cerrar.
- Permiso nuevo autorizado si macOS lo exige: «Gestión de apps».

## Para la persona usuaria

**Pendiente humano:** confirmar a ojo en el Dock, primero con la app de prueba del análisis
(`prueba-a-ojo.sh`, tres cuadrados de color sin Claude) y al final con las instancias reales.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0020`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
