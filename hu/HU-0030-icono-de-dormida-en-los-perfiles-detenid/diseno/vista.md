# Vista · HU-0030 · Icono de dormida en los perfiles detenidos

La maqueta es [`maqueta.html`](maqueta.html). Ejes: `#icono=zz|luna` y `#tema=oscuro|claro`. Aprobada con «zᶻ»
(«Aprobadas con zᶻ», 2026-11-05).

- **Glifo:** dos «z» en mono y negrita, la primera de 12 px y la segunda de 9 px subida 6 px, en `--quiet`
  (`text-(--quiet)`), `aria-hidden`.
- **Sidebar:** pegado al nombre (gap 6–8 px), antes del espacio flexible; el contador de sesiones y el botón de
  abrir/detener no se mueven. El nombre se trunca antes que el icono (`shrink-0` en el icono).
- **«Uso por instancia»:** pegado al nombre, antes de la insignia de estado.
- **Cuándo:** `status === "stopped"` y sin operación en curso. Instancias y original. Plegado, no se ve.
