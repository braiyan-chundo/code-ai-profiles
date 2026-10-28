---
id: HU-0015
titulo: "Frontend escalable: componentes, features y router"
estado: en-proceso
fase: arquitectura
area: interfaz
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [estados]
reglas: []
depende: []
---

# Frontend escalable: componentes, features y router

Como mantenedor de Code AI Profiles
quiero el frontend separado en componentes, features y pantallas, con un router
para añadir funcionalidades nuevas sin seguir engordando un solo archivo.

## Petición original

> «deberias agregar router no? osea estoy pensando a futuro agregar mas funcionabilidades a la app quizas agregar el router sea lo mejor, que opinas?» — Braiyan Rodriguez (mantenedor), 2026-10-28

> «ok, entonces eso debe estar optimizado, deberias crear una historia para que el codigo este separado en componentes y sea escalable siguiendo los patrones de diseño del frontend escalable de react vite» — Braiyan Rodriguez (mantenedor), 2026-10-28

Elección: el router va en esta historia y no en la HU-0014. Queda autorizada la dependencia de React Router.

## Problema

Toda la interfaz vive en `src/App.tsx`, que tiene 2.163 líneas:

- La función `App` ocupa unas 800 líneas, con 30 `useState` y 12 `useEffect`. Mezcla datos del panel,
  escaneo, actualizaciones, apariencia, transferencias de sesión y diálogos.
- En el mismo archivo hay 19 componentes (`InstanceCard`, `OriginalAppSection`, `SessionTransferDialog`,
  `InstanceEditor`, `ModalFrame`, `ConfirmDialog`…), constantes y utilidades de formato.
- No hay router: la app es una sola pantalla con diálogos. Añadir una pantalla nueva (ajustes, historial,
  detalle de un perfil) obligaría a meterla en el mismo archivo y a navegar con banderas de estado.

Lo que ya está bien y se conserva: `src/lib/bridge.ts` como único punto de `invoke`, los controladores
puros (`scan-controller.ts`, `source-update-controller.ts`) con sus pruebas, `src/types.ts` como contrato y
`components/Icons.tsx`.

## Alcance

- Reorganizar `src/` por responsabilidades: arranque de la app, router, features, componentes compartidos
  y librería.
- Sacar de `App` el estado y los efectos a hooks por feature, y los componentes a sus propios archivos.
- Añadir React Router con una ruta para el panel actual y una salida para rutas desconocidas, listo para
  añadir pantallas.
- Dejar escrita la arquitectura en `docs/arquitectura/` y actualizar la skill
  `code-ai-profiles-frontend-react-vite` y `.metodo/reglas/frontend.md` con la estructura nueva.

## Fuera de alcance

- **Cambiar lo que ve o hace la persona.** Es una reorganización: mismas pantallas, textos, estilos,
  atajos y comportamiento.
- Pantallas nuevas.
- Adoptar los componentes de shadcn en la app (HU-0014 los instala; adoptarlos es otra historia).
- Cambiar `src/types.ts`, las firmas de `bridge.ts` o cualquier cosa de Rust.
- Cambiar tokens o reglas visuales de `src/styles.css`.

## Decisiones por defecto (★)

- ★ **D-1 · Estructura por features.** `src/app/` (arranque, proveedores, router), `src/features/<feature>/`
  (componentes, hooks y lógica de instancias, sesiones, actualizaciones, escaneo, apariencia y aplicación
  original), `src/components/` (piezas compartidas como `ModalFrame`, `ConfirmDialog`, `Metric`,
  `EmptyState`) y `src/lib/` (bridge, controladores, formato). *Por qué:* lo que cambia junto vive junto, y
  una feature nueva es una carpeta nueva. *Alternativa:* por tipo (`components/`, `hooks/`, `pages/`).
- ★ **D-2 · Estado compartido con Context y hooks, sin librería.** El `DashboardState` y las operaciones en
  curso pasan a un proveedor con `useReducer`, y cada feature lo usa a través de su hook
  (`useDashboard`, `useAppearance`, `useScan`…). *Por qué:* los datos llegan por IPC y casi todo comando
  devuelve el estado completo; no hace falta una librería. *Alternativa:* Zustand.
- ★ **D-3 · React Router 7 con historial por hash.** `createHashRouter`, una ruta `/` para el panel y una
  salida que vuelve a `/`. Las pantallas futuras se cargan de forma diferida. *Por qué:* el hash evita
  problemas al recargar en una ruta profunda dentro de Tauri, y React Router es ligero y conocido.
  *Alternativa:* TanStack Router.
- ★ **D-4 · El CSS se reparte por feature sin cambiar la cascada.** `styles.css` se divide en archivos por
  feature que se importan en el mismo orden desde un único índice, de modo que las reglas resultantes son
  las mismas. *Por qué:* cada feature lleva sus estilos, sin riesgo visual. *Alternativa:* dejar
  `styles.css` como un solo archivo.
- ★ **D-5 · Pruebas para la lógica que salga a módulos puros.** Lo que se extraiga sin React (lectura de
  preferencias de apariencia, formato de fechas y tamaños, textos de resultado) gana pruebas con
  `node --test`. Los hooks y componentes se verifican con la app abierta. *Por qué:* no hay DOM en las
  pruebas y no se añade Testing Library. *Alternativa:* añadir Vitest con Testing Library.

## Criterios de aceptación

### AC-01 · La app se ve y funciona igual

Al abrir la app (`npm run tauri dev`) y en el modo navegador (`npm run dev`), el panel, las tarjetas de
instancia, la aplicación original, el escaneo, las actualizaciones, la apariencia, el editor de instancias,
la transferencia de sesiones y los diálogos de confirmación se ven y responden igual que antes, en tema
oscuro y claro, y en ventana reducida.

### AC-02 · Cada pieza en su sitio

En `src/` cada feature tiene su carpeta con sus componentes y hooks, y `App.tsx` solo compone la app (sin
estado de negocio ni componentes definidos dentro). Ningún archivo de componente supera unas 300 líneas.

### AC-03 · Hay un router listo para pantallas nuevas

La app arranca en la ruta `/` del router. Una ruta desconocida vuelve al panel. Añadir una pantalla es
añadir una ruta y su carpeta, como describe la documentación de arquitectura.

### AC-04 · Lo que ya funcionaba sigue en verde

`npm run build`, las pruebas existentes (`test:scan`, `test:update`) y las nuevas de la lógica extraída
pasan. `bridge.ts` sigue siendo el único sitio que llama a `invoke`.

### AC-05 · La arquitectura queda escrita

`docs/arquitectura/` describe la estructura, dónde va cada cosa y cómo se añade una feature o una
pantalla, y la skill de frontend y las reglas del rol lo reflejan.

## Reglas de negocio afectadas

Ninguna: la historia no cambia el comportamiento para la persona usuaria.

## Para la persona usuaria

1. **D-2**: estado compartido con Context y hooks en lugar de una librería como Zustand.
2. **D-4**: repartir `styles.css` por feature en lugar de dejarlo en un archivo.
3. **D-3**: React Router 7 con hash en lugar de TanStack Router.

**Pendiente humano:** recorrer la app en macOS, Windows y Linux para confirmar que nada cambió de aspecto
ni de comportamiento. Las tres plataformas solo se ven en sus máquinas o en los instaladores de CI.

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
- [ ] Commits en cada repo tocado con `HU: HU-0015`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
