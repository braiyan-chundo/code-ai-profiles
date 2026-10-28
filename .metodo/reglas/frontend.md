# Reglas propias de frontend en Code AI Profiles

<!-- Lo que este proyecto añade al rol. El generador lo incluye en su agente. Una regla por línea, con su porqué. -->

- El sistema de diseño en uso es `DESIGN.md`, aplicado con el catálogo shadcn/ui de `src/components/ui` y sus tokens (`src/styles/tokens.css` y `ui-theme.css`, desde HU-0016). Se conservan tipografía, espaciado, radios, colores, densidad, temas y patrones de interacción.
- La interfaz se compone con el catálogo y utilidades de Tailwind (skill `code-ai-profiles-ui`), sin CSS propio: los únicos `.css` de `src/` son `styles/index.css`, `styles/tokens.css`, `styles/ui-theme.css` y `showcase/showcase.css` (lo vigila `test:ui`). Antes de componer, usa la pieza de la app que ya lo resuelve; así no vuelven dos sistemas a la vez.
- Los componentes de `components/ui` son código propio: no se regeneran con `--overwrite`, y cada diferencia con el registro va en su ficha. Un ajuste que vale para todos los usos se hace en el componente, no repetido en cada pantalla.
- Iconos de lucide, más `BrandMark` para la marca y el icono por defecto de una instancia; `components/Icons.tsx` no vuelve. Un botón de solo icono lleva `aria-label` en español.
- Los diálogos son `Dialog` o `AlertDialog`, montados por `DialogHost`: Escape, la X y el clic fuera pasan por su `onOpenChange`, guardado por `busy` igual que «Cancelar». Nada de `keydown` global ni de `Toaster`, porque cerrarían una operación en curso o registrarían listeners de ventana (R-1).
- La interfaz se organiza por features (`docs/arquitectura/frontend.md`): pantallas en `src/app/routes/<pantalla>/` con su ruta en `app/router.tsx` y su entrada en el sidebar, funcionalidades en `src/features/<feature>/` con su `index.ts`, y piezas sin dominio en `src/components/`. Ningún `.tsx` importa CSS salvo las dos entradas (`main.tsx` y `showcase/main.tsx`): la app solo carga `src/styles/index.css`. Así una funcionalidad nueva es una carpeta nueva y no engorda otro archivo.
- Los efectos que viven lo que la app van en `app/providers/DashboardRuntime.tsx`, en su orden fijo: ningún otro componente registra `focus`, `blur` ni `visibilitychange`, porque invertir ese orden lanza escaneos en paralelo.
- Cubres los estados loading, empty, error, disabled, focus y ventana reducida, y verificas tema claro, oscuro y del sistema, también en diálogos y menús (el tema va en `<html>`).
- Respetas los controles nativos de ventana de macOS y las decoraciones de Windows y Linux.
- No cambias contratos de backend ni Rust. Si los necesitas, lo devuelves al orquestador.
- No inventas datos que el backend no pueda obtener de forma segura.
