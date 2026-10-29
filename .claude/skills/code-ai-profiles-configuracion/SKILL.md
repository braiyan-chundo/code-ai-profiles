---
name: code-ai-profiles-configuracion
description: Cómo se maneja la configuración en Code AI Profiles - ninguna URL, token, clave ni ID de servicio en el código; catálogo .env.example con [SECRET]/[PUBLICO]; un módulo de configuración por app; secretos de desarrollo generados en local. Cárgala antes de escribir cualquier URL, token, clave, host o variable de entorno.
---

# Configuración fuera del código

Regla fija de la metodología: aplica siempre y no se apaga. La guarda la comprueba al escribir, al
commitear y al cerrar.

## La regla de oro

**Si cambia entre entornos o identifica un servicio, no va en el código.** Ni la URL de la API, ni el
token del CMS «que es de solo lectura», ni el ID de analítica.

## Añadir una variable

1. **En `.env.example`**, con su ficha encima:

   ```bash
   # [PUBLICO] URL base de la API que consume la web · requerida · apps: web
   VITE_API_URL=http://localhost:3000
   # [SECRET] Token de preview del CMS (lee borradores) · requerida · apps: api
   CMS_PREVIEW_TOKEN=
   ```

   - `[PUBLICO]` acaba en el navegador; `[SECRET]` nunca.
   - Un `[SECRET]` va vacío aquí y **nunca** lleva prefijo público (`VITE_`, `NEXT_PUBLIC_`,
     `NUXT_PUBLIC_`, `PUBLIC_`, `EXPO_PUBLIC_`, `REACT_APP_`).
2. **En el módulo de configuración** de la app (`config.*` / `settings.*`), validada: si falta, la app
   no arranca y dice cuál.
3. **En el código**, se importa del módulo: `import { config } from "@/config"` → `config.apiUrl`.
4. **En local**, el valor real en `.env.local` (fuera de git). Un secreto de desarrollo se genera:
   `openssl rand -base64 32`. No pidas permiso: es de prueba.

## Los enlaces fijos

Redes sociales, términos, el WhatsApp del negocio: no cambian entre entornos, así que no van al `.env`.
Van en el archivo de enlaces del proyecto (`config/enlaces.*`), el único sitio fuera del módulo de
configuración donde se aceptan URLs.

## Lo que nunca

- Una URL o un token como texto en un componente, un servicio o un cliente HTTP.
- `process.env`, `import.meta.env`, `os.environ` fuera del módulo de configuración.
- Un `.env` con valores en git (solo `.env.example`, con los `[SECRET]` vacíos).
- Un valor de producción en cualquier archivo del repo.

## Un falso positivo

Una URL de un estándar o un hash que parece token: `// metodo:permitir <motivo>` en la línea de encima,
o la excepción en `config.codigo.excepcionesUrl`. Nunca se desactiva el gate.

## Verificación

```bash
node .metodo/scripts/config.mjs check
node .metodo/scripts/config.mjs catalogo
```
