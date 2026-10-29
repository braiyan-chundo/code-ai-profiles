# Los entornos

> Estado: versión 4 (borrador), 2026-10-24.

Dos ideas separadas: **la fase del proyecto** (¿hay producción?) y **los entornos** (¿dónde trabaja
cada uno?). Y una regla fija: ningún agente toca producción.

## 1. El problema

Los agentes se negaban a generar claves o a iniciar sesión aunque todo fuera de prueba. No era
capricho: era **ambigüedad**. El agente no sabía si la clave, la cuenta o el servidor eran de prueba o
reales, y ante la duda se negaba. Y al revés: nada impedía que un agente apuntara a la base de
producción si encontraba la cadena de conexión.

La v4 quita la ambigüedad: declara qué es local, qué es staging y qué es producción, deja las
credenciales de prueba donde los agentes las encuentran, y pone una guarda que bloquea producción.

## 2. La fase del proyecto

| `fase` | Cuándo |
| --- | --- |
| `desarrollo` | Nada en producción. Todo dato es de prueba |
| `produccion` | Hay usuarios o datos reales |

**La fase no cambia dónde trabajan los agentes** (siempre en local): cambia el cuidado.

| | `desarrollo` | `produccion` |
| --- | --- | --- |
| Contratos | Según dial; con `estrictos-en-produccion`, 0.x flexibles | Compatibilidad estricta, versionado, feature flags |
| Migraciones | Libres; se resetea la base local | Plan, respaldo, aprobación; probadas antes en copia anonimizada |
| Datos de producción en local | No existen | Solo anonimizados, nunca copia cruda |
| Revisión técnica | Según dial | Mínimo `riesgo` |
| Observabilidad | Según dial | Mínimo `basica`; cada historia con sus señales |

## 3. Los entornos

Declarados en `.metodo/entornos.json` ([plantilla](plantillas/config/entornos.json)), **sin
secretos**, solo identificadores:

```json
{
  "local":      { "hosts": ["localhost", "127.0.0.1", "*.localhost", "*.test"], "env": ".env.local" },
  "staging":    { "hosts": ["staging.miapp.com"], "env": ".env.staging" },
  "produccion": { "hosts": ["miapp.com", "db.miapp.com"], "marcas": ["sk_live_", "pk_live_"],
                  "archivos": [".env.production"] }
}
```

**Regla de oro: los agentes trabajan siempre en local**, y en staging solo cuando la persona nombra el
host en el chat para esa tarea.

## 4. Credenciales de prueba, sin fricción

En local, los agentes **no piden permiso** para:

- **Generar secretos de desarrollo** (firma de sesión, JWT, claves de cifrado) con
  `openssl rand -base64 32` y escribirlos en `.env.local`, que está en `.gitignore`.
- **Crear cuentas de prueba con el seed** del proyecto, una por rol (administración, operador, sin
  permiso…). Las credenciales de esas cuentas viven en el archivo de seed o de ejemplo del proyecto
  (por ejemplo `seed/cuentas.json`), y desde ahí las leen los agentes y `qa` para iniciar sesión en la
  app local. No se repiten en la conversación.
- **Usar servicios en modo prueba**: pasarela en modo test con sus tarjetas de prueba publicadas,
  correo capturado (Mailpit), datos falsos verosímiles.
- **Opcional**: un atajo de inicio de sesión solo para desarrollo (enlace mágico en consola),
  protegido por entorno y con una prueba que demuestra que no existe en el build de producción.

La historia fundacional deja el seed, el módulo de configuración y `.env.example`.

Lo que **nunca** se hace, aunque estemos en desarrollo: usar la contraseña real de la persona para
otro servicio, usar claves *live*, o crear cuentas en servicios reales (un proveedor de identidad en
producción, una pasarela real).

## 5. La guarda

Regla fija: aplica en todos los perfiles y no se apaga.

| Capa | Qué hace |
| --- | --- |
| `deny` de lectura | `.env.production` y los archivos de `produccion.archivos` no se pueden leer: los secretos de producción ni siquiera están al alcance |
| Hook `PreToolUse` (`guarda.mjs` → `entorno.mjs`) | Antes de cada comando de shell: bloquea si aparece un host de producción, una marca *live* o un archivo de producción, y dice por qué |
| Gate al cerrar | El diff no puede traer hosts, marcas ni rutas de producción al código |

Si la guarda bloquea, el agente se detiene y lo dice. **Nunca se rodea**: ni con otro comando, ni
pidiéndole al orquestador que lo haga ([seguridad](seguridad.md#el-blanqueo-de-permisos)).

Las acciones contra producción (desplegar, migrar la base real, consultar logs de producción) las hace
`devops` con autorización explícita de la persona, cada vez, y fuera de la guarda: la persona ejecuta
o autoriza el comando concreto.

## 6. El paso a producción

```bash
node .metodo/scripts/metodo.mjs fase produccion --simular
```

O `/metodo fase produccion`. Checklist que el comando enseña y no da por hecha:

- [ ] `entornos.json` con los hosts y marcas de producción declarados.
- [ ] La guarda bloquea un comando de prueba con el host de producción (`entorno.mjs probar`).
- [ ] Los contratos actuales congelados como versión base (si `contratos` no es `flexibles`).
- [ ] El atajo de login de desarrollo comprobado ausente en el build de producción.
- [ ] Señales mínimas de observabilidad en los flujos críticos.
- [ ] Respaldo de la base de producción y su restauración probada (lo hace `devops` con la persona).
- [ ] Los pendientes humanos de las historias cerradas, revisados.

Con la checklist comprobada y el sí de quien decide el método (lo pide `/metodo`), el comando cambia
`fase`, regenera y deja un ADR. **Se niega si `entornos.json` no declara hosts de producción**: la
guarda no sabría qué bloquear. Un host declarado cubre sus subdominios (`tienda.com` bloquea
`api.tienda.com`). La simulación enseña también los efectos que no son diales: los contratos pasan a
estrictos.
