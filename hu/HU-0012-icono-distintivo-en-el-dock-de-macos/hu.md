---
id: HU-0012
titulo: "Icono distintivo en el Dock de macOS"
estado: en-espera
fase: requisitos
area: instancias
entrega: 1
prioridad: baja
creada: 2026-10-27
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [permisos]
reglas: []
depende: []
---

# Icono distintivo en el Dock de macOS

Como persona que tiene varias instancias abiertas a la vez en macOS
quiero que cada copia gestionada muestre en el Dock el icono personalizado de su perfil
para distinguirlas sin abrirlas.

## Petición original

> «Cerrar y abrir Dock» — Braiyan Rodriguez, 2026-10-27, al decidir el destino de la HU-0005 heredada durante la adopción v4 (HU-0011).

Elección: cerrar la HU-0005 por lo entregado (refresco incremental y SemVer, 0.2.0) y llevar a esta historia, en espera, lo único que le faltaba: el icono del Dock.

## Problema

Hoy el icono personalizado de una instancia solo se ve dentro de Code AI Profiles (`set_instance_icon`,
`branding/icon.png`). En el Dock todas las copias muestran el icono del proveedor.

Lo que ya se probó y no sirvió (evidencia en `docs/archivo/previo/hu/`):

- **`NSWorkspace.setIcon` como metadata externa** (HU-0005): Apple prohíbe FinderInfo, resource fork y
  atributos de icono en bundles firmados. Con ellos, `codesign --verify --deep --strict` falla, así
  que la producción retira la metadata (`systemApplied=false`). En el spike, `NSWorkspace` rechazó el
  icono.
- **Re-firma ad-hoc de un clon temporal antes del primer login** (HU-0007): resultado negativo. No
  dejó un proceso validable ni se vio el icono en el Dock.
- **Diagnóstico A/B del arranque re-firmado** (HU-0008): inconcluso. La variante terminó con la señal
  9 después de TERM, sin muestra de interfaz, Dock ni login.
- `app.dock.setIcon`, `NSDockTile` y `NSRunningApplication.icon` solo funcionan dentro del propio
  proceso o son de solo lectura. Tampoco vale inyectar `NODE_OPTIONS`.

Una re-firma puede cambiar la firma, el Team ID o el designated requirement, y con ello romper el
acceso a Keychain/safeStorage y obligar a iniciar sesión de nuevo.

## Alcance

Por definir al sacarla de espera. Empezaría por una investigación acotada con fixtures, no con
instancias reales.

## Fuera de alcance

- Tocar la aplicación original, perfiles reales, conversaciones, credenciales, llavero o sesiones.
- Cambiar el bundle ID de una copia, por su efecto posible en la autenticación, el perfil o el updater.
- Relajar `validate_provider_identity` o aceptar como donantes copias re-firmadas.

## Decisiones por defecto (★)

- ★ **D-1 · En espera.** No se trabaja hasta que aparezca una técnica nueva que respete la firma del
  proveedor. *Por qué:* las tres vías conocidas fallaron o quedaron inconclusas. *Alternativa:*
  descartarla.

## Criterios de aceptación

Borrador heredado del criterio 13 de la HU-0005; se rehacen al salir de espera.

### AC-01 · Icono propio en el Dock sin romper la firma

Con una copia gestionada en marcha en macOS, el Dock muestra su icono personalizado. Además,
`codesign --verify --deep --strict` da el mismo resultado antes y después, y se conservan el CDHash,
el Team ID y el designated requirement del proveedor.

## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| — | — | Por definir (aislamiento de perfiles y privacidad, cuando existan como `RN-n`) |

## Para la persona usuaria

**Pendiente humano:** el icono en el Dock y el login después de cualquier cambio solo se comprueban en
un Mac real con un perfil de prueba.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [ ] Criterios numerados y observables desde la interfaz
- [ ] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0012`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
