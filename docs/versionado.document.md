# Versionado de Code AI Profiles

Documento relacionado con [HU-0005](hu/HU-0005-recuperar-respuesta-de-la-interfaz-y-versionado-semver.md).

Code AI Profiles usa [Semantic Versioning](https://semver.org/lang/es/). La versión vigente del repositorio es `0.2.0`.

## Política

- `patch` corrige errores compatibles.
- `minor` añade funcionalidades compatibles.
- `major` incluye incompatibilidades de API, comportamiento o datos.

Mientras el proyecto esté en `0.y.z`, SemVer permite que un incremento `minor` incluya cambios incompatibles durante el desarrollo inicial. El proyecto procurará comunicar cualquier incompatibilidad de forma explícita en el changelog y la historia de usuario correspondiente.

## Actualizar una versión

Usa una de estas formas desde la raíz del repositorio:

```bash
npm run release:version -- patch
npm run release:version -- minor
npm run release:version -- major
npm run release:version -- 0.2.1
```

La versión exacta debe ser ascendente y tener forma SemVer canónica. La herramienta calcula la siguiente versión o valida la indicada antes de modificar archivos. Si detecta una versión inválida, igual, menor o fuentes que ya discrepan, termina sin dejar una actualización parcial.

Sincroniza las versiones propias en `package.json`, las dos entradas raíz de `package-lock.json`, `src-tauri/Cargo.toml`, la entrada del paquete propio en `src-tauri/Cargo.lock` y `src-tauri/tauri.conf.json`. No modifica dependencias de terceros.

## Verificar consistencia

```bash
npm run release:check
```

Este comando es de solo lectura y falla si alguna fuente de versión no coincide. CI lo ejecuta antes de validar el build. La interfaz obtiene la versión desde el contrato runtime `SystemInfo.appVersion`, derivado de la versión compilada de Tauri, por lo que no mantiene un literal separado en React.

## Publicación

Actualizar la versión del repositorio no crea tags, GitHub Releases, descargas ni instaladores. Esas operaciones se planifican y validan por separado.
