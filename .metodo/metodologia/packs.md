# Los packs de stack

> Estado: versión 4 (borrador), 2026-10-24.

Un rol dice **cómo trabaja**: territorio, brief, entrega. Un pack dice **con qué tecnología**. Así un
proyecto en FastAPI y Vue no carga la especialidad de NestJS y React.

## 1. Qué es un pack

Una carpeta en [plantillas/packs/](plantillas/packs/) con una o varias skills y su ficha:

```text
packs/backend-fastapi/
  pack.json        qué es, para qué rol, qué skills trae, comandos sugeridos, fuentes
  skills/
    backend-fastapi/SKILL.md         estructura, dónde vive la regla de negocio, errores, validación
    backend-fastapi/fichas/…         piezas granulares, si hacen falta
```

```json
{
  "nombre": "backend-fastapi",
  "tipo": "servidor",
  "roles": ["backend", "fullstack"],
  "siempre": ["backend", "fullstack"],
  "skills": ["backend-fastapi"],
  "comandos": { "tipos": "mypy .", "relacionadas": "pytest {archivos} -q", "suite": "pytest -q" },
  "modulo-config": "app/settings.py",
  "fuentes": ["https://fastapi.tiangolo.com/"],
  "version": "0.1.0",
  "probado-en": []
}
```

El proyecto los nombra en `config.json → stack.packs`. `metodo.mjs generar` copia sus skills a
`.claude/skills/<slug>-<skill>/` y se las da a cada rol de `roles`: en el frontmatter (contenido
completo al arrancar) si el rol está en `siempre`, o nombradas en el cuerpo para cargarlas con la
herramienta `Skill` según la tarea. La regla: «siempre» solo lo que el rol usa en casi todo despacho
(el pack de su stack); lo demás, según la tarea, para no pagar su contenido en cada despacho.

## 2. Los tipos

| Tipo | Ejemplos | Rol que lo carga |
| --- | --- | --- |
| `servidor` | `backend-nestjs`, `backend-fastapi`, `backend-laravel`, `backend-express` | `backend`, `fullstack` |
| `apps` | `frontend-react`, `frontend-vue`, `frontend-nextjs`, `frontend-nuxt`, `mobile-flutter` | `frontend`, `fullstack` |
| `persistencia` | `persistencia-postgres`, `persistencia-mongodb`, `persistencia-mysql`, `persistencia-sqlite` | `data`, `architect`, `backend`, `fullstack` |
| `dominio` | `dinero`, `eventos`, `tiempo-real`, `contratos` | según la matriz de [roles](roles.md#la-matriz-agente--skill) |
| `diseno` | `diseno-panel-datos`, `diseno-ecommerce`, `diseno-campo` | `product-design`, `frontend` |
| `infra` | `colas-bullmq`, `infra-dokploy`, `infra-vercel`, `infra-docker` | `devops`, y los de servidor para colas |
| `observabilidad` | `obs-opentelemetry`, `obs-sentry` | `devops`, implementadores |

## 3. Las skills por motor

La persistencia es el caso más claro: **una skill por motor de base de datos**, siempre presente. Es
el manual que cargan `architect` y `backend` al tocar la base: tipos exactos para dinero,
transacciones, escrituras condicionadas, índices, migraciones, trampas del driver. El agente `data`,
si está activo, trabaja con esa misma skill ([roles](roles.md#data)).

## 4. Forjar un pack que no existe

Si el stack pide una tecnología sin pack, la historia fundacional lo forja:

1. Un agente (el implementador del área, con el modelo grande) redacta la skill desde la
   **documentación oficial** de la versión que usa el proyecto, con la estructura de
   [plantillas/packs/_plantilla/](plantillas/packs/_plantilla/).
2. Incluye lo que el modelo tiende a traer de otros stacks y aquí no aplica («Lo que no se toma
   prestado»).
3. **El desarrollador la revisa** antes de usarla. Una skill sin revisar es una opinión del modelo.
4. Al cerrar el proyecto (o antes, si demostró servir), **vuelve a la metodología**: se copia a
   `plantillas/packs/` con `probado-en` actualizado. Así el siguiente proyecto la encuentra hecha.

## 5. Cómo se escribe una skill

```markdown
---
name: <slug>-<tipo>
description: <Qué cubre, con las palabras de la tarea>. Cárgala <cuándo, con un verbo: antes de
  editar X, al tocar Y>.
---

# <Título>

## La regla de oro        (la que más caro sale olvidar)
## <Secciones por tarea>   (añadir un endpoint, una migración…)
## Lo que nunca            (y por qué, con el caso que lo enseñó)
## Lo que no se toma prestado
## Verificación            (los comandos exactos, por pruebas.mjs)
## Skills relacionadas     (por nombre, sin copiar)
```

- **La descripción decide si se carga**, y todos los agentes la ven siempre: corta y con verbo.
- **Por debajo de 170 líneas.** Si crece, índice y fichas.
- **No duplica documentos**: enlaza al porqué y deja el cómo.
- **Cada regla con su caso.**

## 6. El catálogo actual

| Pack | Estado |
| --- | --- |
| `frontend-react-vite` | **Stack por defecto.** React + Vite, shadcn/ui, Tailwind, Zustand, TanStack Query, lucide, Socket.IO. Forjado el 2026-10-24 desde la documentación oficial; sin probar en proyecto |
| `backend-nestjs` | **Stack por defecto.** REST, DTOs de entrada y salida, Swagger, errores, eventos, webhooks, gateways. Ídem |
| `persistencia-mongodb` | **Stack por defecto.** Mongoose, replica set, Decimal128, escrituras condicionadas, índices, migraciones. Ídem |
| `colas-bullmq` | **Stack por defecto, si hay colas.** Redis + BullMQ, idempotencia, reintentos, fallidos, `noeviction`. Ídem |
| `persistencia-postgres` | Escrito, sin probar en proyecto |
| `dinero`, `eventos`, `tiempo-real`, `contratos` | Heredados de las skills de la v3, como packs de dominio (esqueletos que el proyecto completa) |
| `_plantilla` | Esqueleto para forjar |

Los comandos de pruebas de cada repo salen del pack de su capa (`pack.json → comandos`) si el proyecto no
los define en `stack.comandos`. Los demás packs (otras tecnologías, infra) se forjan en el primer
proyecto que los necesite. Las lecciones de la
v3 atadas a un stack (Redis `noeviction`, `vi.useFakeTimers` solo para `Date`) van a su pack cuando se
forje.
