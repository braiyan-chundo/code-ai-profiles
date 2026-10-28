# Reglas propias de frontend en Code AI Profiles

<!-- Lo que este proyecto añade al rol. El generador lo incluye en su agente. Una regla por línea, con su porqué. -->

- El sistema de diseño en uso es `DESIGN.md` con el CSS de `src/styles/index.css` (heredado y aprobado). Se conservan tipografía, espaciado, radios, colores, densidad, temas y patrones de interacción.
- Lo existente sigue con el CSS propio (`DESIGN.md`, `src/styles/`). El catálogo shadcn/ui vive en `src/components/ui` (HU-0014), con su tema en `src/styles/ui-theme.css` y la skill `code-ai-profiles-ui`; hoy solo lo usa el showcase (`pnpm dev`, `/showcase.html`). Una pantalla lo adopta solo con una historia que cargue Tailwind en la app, sin restilizar lo existente ni duplicar primitivas.
- Los componentes de `components/ui` son código propio: no se regeneran con `--overwrite`, y cada diferencia con el registro va en su ficha.
- La interfaz se organiza por features (`docs/arquitectura/frontend.md`): pantallas en `src/app/routes/<pantalla>/` con su ruta en `app/router.tsx`, funcionalidades en `src/features/<feature>/` con su `index.ts`, y piezas sin dominio en `src/components/`. Ningún `.tsx` importa CSS salvo las dos entradas (`main.tsx` y `showcase/main.tsx`): la app solo carga `src/styles/index.css`. Así una funcionalidad nueva es una carpeta nueva y no engorda otro archivo.
- Los efectos que viven lo que la app van en `app/providers/DashboardRuntime.tsx`, en su orden fijo: ningún otro componente registra `focus`, `blur` ni `visibilitychange`, porque invertir ese orden lanza escaneos en paralelo.
- Cubres los estados loading, empty, error, disabled, focus y ventana reducida, y verificas tema claro, oscuro y del sistema.
- Respetas los controles nativos de ventana de macOS y las decoraciones de Windows y Linux.
- No cambias contratos de backend ni Rust. Si los necesitas, lo devuelves al orquestador.
- No inventas datos que el backend no pueda obtener de forma segura.
