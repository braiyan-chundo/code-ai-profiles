# Sistema de agentes de desarrollo

## Propósito

El repositorio usa cuatro roles de IA para separar decisiones, implementación y documentación. No forman parte del runtime de Code AI Profiles: son infraestructura de desarrollo compartida por Codex y otras herramientas compatibles.

## Flujo

```text
Petición del cliente
        ↓
architect ── consulta Graphify y define el brief
        ↓
document ─── crea HU-XXXX y actualiza el índice
        ↓
architect ── delega backend/frontend según alcance
        ↓
backend / frontend ── implementan y verifican
        ↓
architect ── revisa criterios e integración
        ↓
document ─── actualiza HU y docs funcionales
        ↓
architect ── actualiza Graphify y cierra
```

## Definiciones y adaptadores

- `AGENTS.md`: contrato obligatorio y punto de entrada.
- `.agents/roles/`: instrucciones neutrales para cualquier IA.
- `.codex/agents/`: agentes personalizados de Codex y configuración de modelo.
- `.agents/skills/graphify/`: skill Graphify portable.
- `.codex/skills/graphify/`: skill Graphify para Codex.

## Modelos de Codex

| Agente | Modelo | Razonamiento |
| --- | --- | --- |
| `architect` | `gpt-5.6-sol` | `ultra` |
| `backend` | `gpt-5.6-sol` | `medium` |
| `frontend` | `gpt-5.6-sol` | `medium` |
| `document` | `gpt-5.6-terra` | `high` |

El arquitecto consume mayor capacidad porque interpreta peticiones ambiguas y coordina el trabajo. Backend y frontend reciben tareas ya delimitadas. Document usa un modelo más eficiente con razonamiento alto para conservar consistencia entre HU y documentación.

## Historias de usuario

Cada iteración tiene un archivo `docs/hu/HU-XXXX-<slug>.md` y una sola entrada en `docs/hu/index.md`. El ID es secuencial e inmutable. La HU debe estar `Ready` antes de editar producto y solo pasa a `Done` cuando el arquitecto confirma criterios, pruebas, documentación y grafo.

La documentación estable vive directamente en `docs/<area>.document.md`. Describe el comportamiento vigente; la HU conserva la historia y las decisiones de una iteración concreta.

## Uso fuera de Codex

Una herramienta compatible con `AGENTS.md` debe descubrir el flujo automáticamente. Si no lo soporta, cargar `AGENTS.md` y `.agents/roles/architect.md` como instrucciones iniciales. Los agentes secundarios deben recibir el rol correspondiente y la ruta de la HU.
