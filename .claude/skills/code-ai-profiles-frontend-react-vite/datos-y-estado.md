# Datos del servidor y estado de interfaz · Code AI Profiles

<!-- Parte de la skill frontend-react-vite. Ábrela cuando la pantalla lea o escriba datos del servidor o tenga estado propio. -->

## Datos del servidor: TanStack Query

- Un archivo `queries.ts` por dominio con **fábrica de claves** y hooks:
  ```ts
  export const clientesKeys = { todos: ["clientes"] as const, lista: (f: Filtros) => ["clientes", "lista", f] as const, uno: (id: string) => ["clientes", id] as const };
  export const useClientes = (f: Filtros) => useQuery({ queryKey: clientesKeys.lista(f), queryFn: () => api.listar(f) });
  ```
- Mutaciones con `useMutation` y, al terminar, `queryClient.invalidateQueries({ queryKey: clientesKeys.todos })`.
  Actualización optimista solo si la historia la pide, con su vuelta atrás en `onError`.
- v5: `isPending` (no `isLoading`) para la primera carga; los estados vacío, cargando y error de la
  maqueta se pintan desde `isPending`, `isError` y los datos.
- `staleTime` razonable por consulta; **sin `refetchInterval`** si el dato llega por socket.
- Los tipos de la respuesta salen del contrato (DTOs de salida del servidor), no se inventan en la app.

## Estado de interfaz: Zustand

- Stores pequeños, por dominio, con selectores (`useStore((s) => s.abierto)`) para no repintar de más.
- `persist` solo para preferencias del usuario (tema, columnas), nunca para datos del servidor ni tokens.

