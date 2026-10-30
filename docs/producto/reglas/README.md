# Reglas de negocio de Code AI Profiles

Cómo funciona **hoy** la aplicación, en lenguaje de negocio. Lo mantiene el product owner: cada historia
que toca una regla deja su delta al cerrar. Un archivo por dominio (`pedidos.md`, `clientes.md`…); este
es el índice.

## Cómo se escribe una regla

```markdown
### RN-12 · Un pedido no se cancela después de despacharse
Desde HU-0007. Si el cliente pide cancelar un pedido despachado, se ofrece la devolución.

### RN-13 · ~~El envío es gratis desde $50~~ → El envío es gratis desde $80
Cambiada en HU-0021 (antes: desde $50, HU-0004).

### RN-09 · ~~Los proveedores se dan de alta sin RUC~~ (retirada)
Retirada en HU-0018: ahora el RUC es obligatorio (RN-31).
```

- Un id que no se reutiliza nunca.
- Cada regla cita la historia que la creó o la cambió (el gate lo comprueba al cerrar).
- La versión anterior queda tachada, no borrada.

## Dominios

| Archivo | Qué cubre | Reglas |
| --- | --- | --- |
| [`instancias.md`](instancias.md) | Copias administradas: identidad visual | RN-01 |
| [`proyectos.md`](proyectos.md) | Proyectos anclados: lectura, consumo y lo que se guarda | RN-02–RN-04 |
