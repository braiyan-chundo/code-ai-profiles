# La configuración fuera del código

> Estado: versión 4 (borrador), 2026-10-24.

Regla fija: aplica en **todos** los perfiles y no se puede apagar.

## 1. Por qué

Agentes que dejaban la URL de la API escrita en el frontend, o el token de Storyblok en el código
«porque es de solo lectura». Sí pasa algo: queda en el historial de git para siempre, viaja en el
bundle a cualquier navegador, y no se puede rotar ni cambiar por entorno sin tocar código.

## 2. La regla

**Nada que sea configuración vive en el código.** Es configuración todo lo que cambia entre entornos o
identifica un servicio:

- URLs y hosts, empezando por la base de la API en el frontend;
- tokens y claves, **incluidos los de solo lectura y los públicos**;
- identificadores de servicios: espacio del CMS, DSN de errores, ID de analítica, webhooks;
- correos de envío, puertos, feature flags.

## 3. Las cuatro piezas

### `.env.example`, el catálogo de cada repo

El **único** `.env` que se commitea. Cada variable lleva encima su ficha
([plantilla](plantillas/config/env.example)):

```bash
# [PUBLICO] URL base de la API que consume la web · requerida · apps: web
VITE_API_URL=http://localhost:3000

# [SECRET] Token de preview de Storyblok (lee borradores) · requerida · apps: api
STORYBLOK_PREVIEW_TOKEN=
# [PUBLICO] Token público de Storyblok (solo contenido publicado) · requerida · apps: web
VITE_STORYBLOK_PUBLIC_TOKEN=
```

- **Uno por repo**, donde la app lee su entorno (Vite lee el `.env` de su carpeta, Nest el de la suya);
  con un solo repo en la raíz, uno en la raíz. `iniciar` y `generar` lo crean, con solo lo de su capa,
  cuando el repo existe. El gate revisa todos.
- `[SECRET]` o `[PUBLICO]`, siempre. Un `[PUBLICO]` acaba en el navegador; un `[SECRET]` nunca.
- **`localhost` no es excepción**: `http://localhost:3000` escrito en un componente es justo la URL de
  la API que no se escribe a mano. Va a `VITE_API_URL` con su valor local en el catálogo.
- Los `[SECRET]` van vacíos aquí; los valores reales, en `.env.local` (desarrollo) o en el gestor del
  entorno (staging, producción).
- Es también la lista que usa `devops` para configurar cada entorno.

### Un módulo de configuración por app

Un solo archivo lee y **valida** las variables al arrancar: `config.ts` con zod o equivalente,
`settings.py` con pydantic-settings, según el pack. El resto del código importa desde ahí. Si falta
una variable, la app no arranca y dice cuál.

Las rutas de esos módulos se declaran en la config del proyecto
(`codigo.modulos`), o el gate busca `config.*`, `env.*`, `settings.*` en la raíz de `src/`.

### El brief declara las variables

El arquitecto pone en cada brief la tabla de variables nuevas: nombre, `[SECRET]`/`[PUBLICO]`, apps,
para qué. El implementador no improvisa: la añade a `.env.example` y al módulo de configuración.

### Los enlaces fijos

Los enlaces que no cambian entre entornos (redes sociales, términos, el WhatsApp del negocio) no van
al `.env`: lo llenarían de ruido. Van en un **archivo de enlaces declarado** (`codigo.archivoDeEnlaces`; el gate acepta siempre `config/links.*` y `config/enlaces.*`,
por defecto `config/enlaces.*`), el único sitio fuera del módulo de configuración donde se aceptan
URLs. Con `codigo.enlaces: "env"`, también van al `.env` y el gate lo exige.

## 4. El gate

[`config.mjs`](plantillas/scripts/config.mjs) comprueba seis cosas:

| Comprueba | Falla si |
| --- | --- |
| **Secretos** | Aparece un patrón de clave o token: `sk_live_`, `sk_test_`, JWT, claves privadas, tokens de AWS, GitHub, Slack, Google, Storyblok, cadenas de conexión con contraseña. Si `gitleaks` está instalado, lo usa además |
| **URLs fijas** | Hay un `http(s)://` literal fuera del módulo de configuración, del archivo de enlaces, de las carpetas de prueba y de `codigo.excepcionesUrl` |
| **Lecturas sueltas** | Se lee `process.env`, `import.meta.env`, `os.environ`, `os.getenv`, `Deno.env` fuera del módulo de configuración |
| **Catálogo** | Una variable que lee el módulo no está en `.env.example`, o no lleva `[SECRET]`/`[PUBLICO]` |
| **Fuga al navegador** | Una variable `[SECRET]` lleva prefijo público (`VITE_`, `NEXT_PUBLIC_`, `NUXT_PUBLIC_`, `PUBLIC_`, `EXPO_PUBLIC_`, `REACT_APP_`) |
| **Archivos** | Git sigue un `.env*` que no es `.env.example` |

El catálogo se compara con lo que lee el módulo de configuración: `import.meta.env.X`, `process.env.X` **y las
claves de un esquema** (`z.object({ VITE_API_URL: … })`). Las listas de `config.codigo` se suman a las de
por defecto, no las reemplazan.

El catálogo también se revisa solo donde cambió: en un commit o al terminar un turno, el `.env.example`
tocado y los módulos de configuración tocados; con `--todo`, todos. La configuración de las pruebas
(`test/config.ts`, `e2e/env.ts`) no es la de la app y no cuenta.

Corre **solo sobre lo que cambió**, en tres momentos:

| Momento | Cómo | Efecto |
| --- | --- | --- |
| **Al escribir** | Hook `PreToolUse` sobre `Edit` y `Write` (`guarda.mjs`) | El agente se frena en el momento, no al final de la historia |
| **Al commitear** | Hook de git `pre-commit` (`config.mjs check --staged`) | Frena también los commits hechos a mano |
| **Al cerrar** | Gate de fin de turno y `/hu-close` | Última red |

Para un falso positivo real (una URL de un estándar, un hash que parece token) no se desactiva el gate:
se añade la excepción a `codigo.excepcionesUrl` o una línea `// metodo:permitir <motivo>` justo encima,
que el gate acepta y lista en su informe.

## 5. Lo que hace cada rol

| Rol | Qué |
| --- | --- |
| `architect` | Declara las variables nuevas en el brief |
| `backend`, `frontend`, `fullstack` | Leen solo del módulo; añaden al catálogo con su etiqueta; generan los `[SECRET]` de desarrollo en `.env.local` |
| `devops` | Configura cada entorno desde `.env.example`; los secretos de producción los pone la persona o el gestor del entorno |
| El orquestador | No acepta una entrega con el gate en rojo |
