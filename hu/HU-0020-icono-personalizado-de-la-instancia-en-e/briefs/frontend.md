# Brief · HU-0020 · frontend

Criterios: AC-01 y AC-04 (lo que se ve del estado del icono) y el reintento de A-5. Modelo: **sonnet**: textos,
un botón y una acción sobre un contrato ya fijado; nada de dinero, sesión ni permisos en el cliente.
Contrato: `arquitectura.md` § A-1. Lo escribe backend en B-1 (`src/types.ts`, `src/lib/bridge.ts`); **no edites esos
dos archivos**. Empieza cuando backend avise.

## Datos que llegan a la pantalla

`instance.customIcon.{systemApplied, systemMessage, systemIssue}`, `instance.status` y la plataforma. Nada más.
`systemMessage` ya viene redactado desde Rust (A-5): se muestra tal cual, sin reescribirlo.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/features/instances/useInstanceActions.ts` | `reapplyIcon(instance)` → `runAction(\`icon:${id}\`, () => bridge.reapplyInstanceIcon(id))`; exportado junto a `launch`/`stop` |
| `src/features/instances/InstanceEditor.tsx` | Textos de macOS (abajo); botón «Reintentar» y aviso de «Gestión de apps» |
| `src/features/instances/InstanceDetail.tsx` | Texto del badge del icono en macOS |
| `src/app/layout/DialogHost.tsx` | Pasa `onRetryIcon` (de `useInstanceActions`) al `InstanceEditor` |

## Textos (macOS; Windows y Linux no cambian)

- `Alert` informativo del editor (hoy «Al guardar, Code AI Profiles intentará aplicar…»):
  «Al guardar, el icono se pone en la copia de esta instancia y se verá en el Dock la próxima vez que la abras. La
  firma de la aplicación no cambia.»
- Línea de estado bajo el `Alert` (hoy «Dock aplicado. » / «No se aplicó al Dock. »):
  `systemApplied` → «En el Dock. » · `!systemApplied` → «Solo en Code AI Profiles. », seguido de `systemMessage`.
- Badge de `InstanceDetail` (hoy «Icono personalizado · Dock aplicado / Dock no aplicado»):
  «Icono personalizado · en el Dock» / «Icono personalizado · solo en la app». Mantén el `title` con `systemMessage`.

## Reintento

- Botón «Reintentar» (`variant="outline"`, `size="sm"`, icono lucide `RotateCw`) junto a la línea de estado.
  - Visible si `platform === "macos" && customIcon && !systemApplied && !removeIcon`.
  - Activo solo con `status === "stopped"` y sin una operación en curso. Si está en marcha, debajo:
    «Detén la instancia para reintentar.»
- Con `systemIssue === "appManagement"`, la línea de estado va en un `Alert` de aviso (tono `warning`, como el badge
  «Sincronización pendiente» de `InstanceDetail`),
  con título «Permiso de Gestión de apps» y `systemMessage` como descripción. El botón «Reintentar» va dentro del
  `Alert`.
- El error de la llamada se muestra como los demás (`friendlyError`). El panel se actualiza con el `DashboardState`
  devuelto.

## Pasos

1. Acción en `useInstanceActions.ts`, prop `onRetryIcon` en `InstanceEditor` y cableado en `DialogHost.tsx`. Ojo:
   `editor` en `DialogHost` es una instantánea; tras reintentar, el editor debe leer la instancia fresca de
   `state.instances` por id para que cambie el estado.
2. Textos y badge. Componentes de `src/components/ui` (`Alert`, `Button`) con tokens; sin estilos sueltos.
3. Modo navegador: el mock de `bridge.ts` deja `systemApplied=true`. Para ver el aviso, fuerza en local un
   `customIcon` con `systemIssue: "appManagement"` (no lo commitees).
4. `pnpm build`.

## Variables de entorno nuevas

Ninguna.

## Pruebas

No hay controlador puro nuevo. Si extraes la decisión «mostrar Reintentar» a una función, pruébala en
`tests/` (macOS/otras, detenida/en marcha, con y sin `systemIssue`). Corre:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src/features/instances/InstanceEditor.tsx src/features/instances/InstanceDetail.tsx src/features/instances/useInstanceActions.ts src/app/layout/DialogHost.tsx`.

## Si dudas

`graphify explain "InstanceEditor"`, skill `code-ai-profiles-frontend-react-vite` (temas, plataformas, catálogo) y
`code-ai-profiles-ui` para el `Alert`.

## No toques

- `src/types.ts` y `src/lib/bridge.ts` (son de backend en esta historia).
- El flujo `save` de `useInstanceActions` (set y clear del icono siguen igual).
- `PageHeader.tsx` y los archivos de HU-0019 que están modificados en el árbol de trabajo.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`.
