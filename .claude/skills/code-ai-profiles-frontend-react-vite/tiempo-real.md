# Tiempo real con Socket.IO · Code AI Profiles

<!-- Parte de la skill frontend-react-vite. Ábrela solo si la app usa sockets. -->

## Tiempo real: Socket.IO

- **Un** socket en `lib/socket.ts`, creado con `autoConnect: false` y conectado tras iniciar sesión.
- El testigo de acceso va en `auth` **como función**, para que se pida en cada reconexión:
  `io(config.socketUrl, { auth: (cb) => cb({ token: obtenerToken() }) })`. Si se guarda el valor, tras
  reconectar el socket queda mudo sin dar error.
- Un evento del servidor **invalida o actualiza la caché de Query**; no mantiene un estado paralelo:
  `socket.on("cliente.actualizado", (c) => queryClient.setQueryData(clientesKeys.uno(c.id), c))`.
- Los listeners se registran en un `useEffect` y se quitan en su limpieza (`socket.off`).
- Se prueba con **dos clientes abiertos a la vez**: las pruebas unitarias no detectan un socket mudo.

