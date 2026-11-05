---
id: HU-0030
titulo: "Icono de dormida en los perfiles detenidos"
estado: en-proceso
fase: implementacion
area: instancias
entrega: 1
prioridad: media
creada: 2026-11-05
requiere: { arquitectura: false, diseno: true }
repos: [code-ai-profiles]
riesgo: []
reglas: [RN-08]
depende: []
---

# Icono de dormida en los perfiles detenidos

Como mantenedor con varias instancias
quiero ver un iconito de «durmiendo» junto al nombre de cada perfil detenido
para distinguir de un vistazo cuáles están apagados sin fijarme en el punto de estado.

## Petición original

> «en el sidebar y en el dashboard si una sesion esta apagada colocar una manera que se vea un iconito durmiendo
> despues del nombre, o dile a disñeo que analice donde colocarlo» — Braiyan Rodriguez (mantenedor), 2026-11-05

Va en la rama `fix-ventanas-consola-windows`, en el mismo PR («aprovechemos el pr para agregar»).

## Problema

Hoy un perfil detenido solo se distingue por el punto de estado del avatar (16 px en el sidebar) o por la insignia
«Detenida» en «Uso por instancia» (`src/app/routes/dashboard/UsageRanking.tsx`). En el sidebar
(`src/app/layout/AppSidebar.tsx`) el punto es tan pequeño que no se ve de un vistazo.

## Alcance

- Un icono de dormida después del nombre de cada perfil detenido (las instancias y la original) en el sidebar y en
  «Uso por instancia» del dashboard.

## Fuera de alcance

- Cambiar el punto de estado o la insignia de estado.
- Los perfiles abiertos, sin detectar o en transición (abriendo, deteniendo).
- La página de la instancia: ya dice «Detenida» en grande.

## Decisiones por defecto (★)

- ★ **D-1 · «Detenido» es `status === "stopped"` sin operación en curso.** Un perfil que se abre o se detiene no lleva
  el icono hasta que termina. «Sesión apagada» se lee como perfil (instancia u original) detenido, que es lo que lista el
  sidebar. *Alternativa:* también las sesiones de Code inactivas.
- ★ **D-2 · El icono es «zᶻ» (dos zetas de distinto tamaño) en el color apagado del texto**, pegado al nombre, sin
  empujar el contador de sesiones. *Por qué:* `lucide` no trae un «zzz» y la luna se confunde con el tema oscuro.
  *Alternativa:* `MoonIcon` o `BedIcon` de lucide.
- ★ **D-3 · Con el sidebar plegado no se ve:** solo queda el avatar con su punto, como hoy. *Alternativa:* encima del
  avatar.
- ★ **D-4 · Accesible:** el icono es decorativo (`aria-hidden`); el estado ya lo leen el `sr-only` y el tooltip.

## Criterios de aceptación

### AC-01 · Sidebar

Con una instancia detenida, su fila del sidebar muestra el icono de dormida justo después del nombre. Una abierta no lo
muestra. Si la original está detenida, también lo lleva.

### AC-02 · Dashboard

En «Uso por instancia», la fila de un perfil detenido muestra el icono después del nombre.

### AC-03 · Transiciones

Al pulsar «Abrir» en una instancia detenida, el icono desaparece en cuanto empieza a abrirse; al detenerla, aparece
cuando termina de detenerse.

## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| RN-08 | nace | Un perfil detenido (instancia u original) lleva un icono de dormida después de su nombre en el sidebar y en «Uso por instancia». |

## Para la persona usuaria

1. ★ D-2: «zᶻ» o una luna.
2. ★ D-1: solo perfiles, no sesiones de Code.

**Pendiente humano:** cómo se ve en Windows y Linux.

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
- [ ] Commits en cada repo tocado con `HU: HU-0030`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
