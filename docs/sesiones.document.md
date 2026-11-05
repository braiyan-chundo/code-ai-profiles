# Sesiones y estimación de contexto

Documento funcional relacionado con [HU-0002](hu/HU-0002-actualizar-aplicacion-original-y-metadatos-por-modelo-y-proveedor.md), [HU-0003](hu/HU-0003-transferencias-conscientes-de-artefactos-actualizacion-disponible-y-uso-en-vivo.md) y [HU-0004](hu/HU-0004-sincronizacion-desde-la-instancia-mas-reciente-cierre-robusto-artefactos-locales-e-identidad-visual.md).

## Origen y alcance del dato

El contexto mostrado en Code AI Profiles es una estimación local. Para cada sesión vinculada a un transcript, el escaneo busca en orden inverso la respuesta principal más reciente que tenga metadatos de uso y toma el modelo de esa misma respuesta. Las entradas sidechain no participan.

El conteo suma:

```text
input_tokens + cache_creation_input_tokens + cache_read_input_tokens
```

Cuando la respuesta contiene iteraciones de uso, se toma la última iteración; en caso contrario se usan los contadores generales. El resultado no incluye una consulta a Anthropic ni representa facturación, cuotas de cuenta o consumo semanal.

## Ventana según el modelo activo

El denominador se resuelve únicamente para modelos conocidos. Los identificadores se normalizan y admiten aliases fechados, sufijos y wrappers que conserven el alias delimitado del modelo.

| Ventana | Familias o modelos reconocidos |
| --- | --- |
| 1 000 000 tokens | Opus 5; Opus 4.8, 4.7 y 4.6; Sonnet 5 y 4.6; Fable 5; Mythos 5; Mythos Preview |
| 200 000 tokens | Opus 4.5, 4.1 y 4.0; Claude 3 Opus; Claude 2.x, Claude 1.x y Claude Instant 1; Sonnet 4.5 y 4.0; Claude 3.7, 3.5 y 3 Sonnet; Haiku 4.5; Claude 3.5 y 3 Haiku |
| No disponible | Cualquier identificador que no coincida con una familia o alias conocido |

Un prefijo de proveedor o wrapper, una fecha o un sufijo de despliegue no cambian la ventana si el alias reconocido sigue delimitado. Una coincidencia parcial ambigua —por ejemplo, un número de modelo diferente que solo empieza igual— no se acepta.

El modelo puede cambiar dentro de una sesión. En el siguiente escaneo se usa el modelo de la última respuesta válida y se recalculan tanto el límite como el porcentaje.

## Cálculo y señales visuales

Con una ventana conocida:

```text
porcentaje = clamp(tokens_estimados / ventana_del_modelo × 100, 0, 100)
```

El valor se limita a 100 % incluso si el conteo estimado supera la ventana. La interfaz usa estos umbrales:

- Menos de 70 %: contexto saludable.
- Desde 70 % y menos de 90 %: contexto elevado.
- Desde 90 %: conviene compactar o iniciar otra sesión.

La barra y el porcentaje solo aparecen cuando se conoce la ventana. Si hay tokens pero el modelo es desconocido, se muestra el conteo junto a «Límite no identificado para este modelo», sin inventar denominador, porcentaje, barra ni nivel de riesgo.

## Compactación y ausencia de datos

- Una frontera de compactación posterior a la última respuesta válida limpia la estimación hasta que exista otra respuesta con uso.
- Una sesión sin transcript vinculado, sin respuesta principal con `usage` o sin datos después de compactar muestra «Contexto sin datos» o «Disponible tras la próxima respuesta».
- Una respuesta con uso pero sin modelo utilizable puede conservar el conteo, aunque el límite y el porcentaje quedan no disponibles.
- Las recomendaciones visuales solo describen ocupación estimada de contexto; no controlan ni ejecutan la compactación.

## Carpeta de datos de la original

Las sesiones de Code de la aplicación original se leen de `<carpeta de datos>/claude-code-sessions/`. La carpeta de datos
es la que la app detecta en su ruta habitual por plataforma (`detect_original_profile()`), salvo que la persona haya
elegido otra (HU-0029, RN-07).

- **Cuándo se pregunta.** Si no hay carpeta detectada o la detectada no tiene `claude-code-sessions`, la página de la
  original muestra un aviso con «Elegir carpeta» (selector nativo de carpetas). Con las sesiones en su sitio no cambia
  nada.
- **Qué se acepta.** Una carpeta real (ni enlace simbólico ni unión de Windows) que contenga `claude-code-sessions`. Si la
  persona elige la propia `claude-code-sessions`, se usa la carpeta que la contiene. Se rechazan la carpeta de datos de
  Code AI Profiles, cualquier carpeta dentro de ella y las que la contienen. La validación solo mira nombres y tipos: no
  abre ningún archivo.
- **Dónde se guarda.** `<datos de la app>/original-profile.json`, con solo la ruta. Si falta o está dañado, se usa la
  detectada.
- **Para qué se usa.** Una sola resolución (`resolve_original_profile`, `src-tauri/src/original_profile.rs`) da la
  carpeta a las sesiones, al estado de la original, a la topología de versiones, a las transferencias y a la lista de
  exclusión de Proyectos (que excluye la efectiva, la detectada y la guardada).
- **Si desaparece.** Si la elegida deja de existir o pierde `claude-code-sessions`, la app vuelve a la detectada y el
  aviso dice «La carpeta elegida ya no existe»; la ruta se conserva hasta elegir otra o pulsar «Usar la detectada».

## Privacidad

El escaneo deserializa exclusivamente los campos necesarios de metadatos. No muestra ni registra el contenido de prompts, respuestas, razonamientos o resultados de herramientas, y no lee credenciales, cookies o tokens OAuth para calcular el contexto. Todo el cálculo se realiza localmente sobre archivos a los que ya tiene acceso el usuario.

## Transferencia de sesiones, artefactos y monitores

Una transferencia mueve o copia la conversación local entre perfiles detenidos; no mueve la propiedad remota de artefactos publicados ni de sus monitores. Antes de escribir el índice de destino, Code AI Profiles elimina referencias `publishedArtifacts` que pertenecen al origen y conserva las que ya eran propiedad del destino.

- Al copiar, el índice y las referencias de origen permanecen intactos.
- Al mover, el sistema respalda el estado de origen. Si la sesión vuelve directamente al origen o se desvincula, intenta restaurar y fusionar sus referencias desde los manifests/backups disponibles.
- Si ese material no existe o está dañado, la aplicación no inventa referencias. La conversación sigue recuperable, pero el usuario deberá publicar otra vez el artefacto y volver a configurar su vigilancia en el perfil destino.
- Las copias locales de artefactos se pueden incluir de manera explícita y vienen activadas por defecto. Solo se buscan dentro de roots locales permitidos y se copian como bytes opacos, sin leer ni indexar su contenido.
- En esta versión no hay un adaptador de schema local confirmado para registrar esos payloads en el perfil de destino. Por eso las copias detectadas se preservan bajo la exportación administrada y el resultado indica la ruta relativa; el usuario puede abrirlas, importarlas con el mecanismo compatible o publicarlas de nuevo.
- Al copiar, el material local del origen no se altera. Al mover, el material local del origen también se conserva cuando el destino solo recibe una exportación; no se elimina nada hasta contar con un registro de destino confirmado y rollback.
- Se rechazan symlinks, escapes fuera de los roots permitidos, archivos especiales y árboles excesivamente profundos. Si un recurso no supera la validación, se omite sin exponer su nombre o contenido.

Cada sesión puede mostrar solo un resumen seguro: número de artefactos publicados y el último estado conocido de un monitor `artifact-comment-monitor`. No muestra URLs, IDs, títulos, contenido, prompts, respuestas, resultados, cookies, credenciales ni tokens. Un aviso del proveedor que indique que un monitor no pudo reanudarse puede continuar apareciendo: es una restricción del recurso remoto, no una promesa que Code AI Profiles pueda resolver localmente.

## Uso de plan durante la ejecución

Cuando hay instancias ejecutándose y la ventana está visible, la interfaz solicita una lectura local de `plan-usage-history.json` cada 15 segundos y hace una actualización adicional al recuperar el foco. Esta ruta es independiente del escaneo completo de sesiones, versiones y estado, que conserva su cadencia normal.

La lectura es de solo lectura y solo fusiona el uso de cada perfil. Si el archivo falta momentáneamente, está bloqueado —algo frecuente en Windows— o contiene JSON parcial mientras el proveedor lo escribe, se conserva el último valor válido. La interfaz etiqueta la marca como «Última captura»: depende de la cadencia de escritura del proveedor y no afirma ser información en tiempo real ni fuerza una llamada autenticada.

## Mantenimiento de modelos y aliases

Las ventanas y nombres de modelos pueden evolucionar. Antes de añadir o modificar un alias se debe:

1. Confirmar la ventana en documentación oficial vigente.
2. Añadir el alias de forma delimitada, incluidos los IDs fechados o wrappers representativos necesarios.
3. Conservar `None` para identificadores desconocidos en vez de aplicar un fallback general.
4. Añadir pruebas para una familia de 1 000 000, una de 200 000, wrappers/sufijos, coincidencias parciales inválidas y un modelo desconocido.
5. Actualizar esta guía y la HU correspondiente.

## Referencias oficiales

- [Ventanas de contexto de Claude](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Resumen de modelos Claude](https://platform.claude.com/docs/en/about-claude/models/overview)
