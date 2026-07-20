# Contribuir a Code AI Profiles

Gracias por querer mejorar el proyecto. Para mantener una dirección técnica clara y proteger las ramas de publicación, todas las contribuciones siguen este proceso.

## Antes de programar

1. Abre un issue describiendo el problema o la propuesta.
2. Espera una autorización explícita de `@braiyan-chundo` antes de comenzar.
3. Haz un fork y crea una rama descriptiva desde `develop`.

No se garantiza la revisión de trabajo iniciado sin autorización previa.

## Pull requests

- Abre el PR exclusivamente hacia `develop`.
- Enlaza el issue autorizado en la descripción.
- Mantén cada PR limitado a un único objetivo.
- Incluye pruebas y documentación cuando corresponda.
- Atiende todos los comentarios antes de solicitar una nueva revisión.

Los PR externos hacia `main` se cierran automáticamente. La rama `main` representa publicaciones estables y solo `@braiyan-chundo` puede actualizarla mediante un PR desde `develop`.

## Verificación local

```bash
npm ci
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Para cambios de empaquetado, ejecuta además el build nativo correspondiente descrito en el README.

## Privacidad y seguridad

No adjuntes perfiles reales, credenciales, cookies, tokens, transcripts ni información privada de cuentas. Usa datos ficticios en pruebas, capturas y reportes.

## Licencia de las contribuciones

Al enviar una contribución aceptas que se distribuya bajo la licencia Apache License 2.0 del proyecto.
