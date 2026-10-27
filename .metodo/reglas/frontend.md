# Reglas propias de frontend en Code AI Profiles

<!-- Lo que este proyecto añade al rol. El generador lo incluye en su agente. Una regla por línea, con su porqué. -->

- El sistema de diseño en uso es `DESIGN.md` con `src/styles.css` (heredado y aprobado). Se conservan tipografía, espaciado, radios, colores, densidad, temas y patrones de interacción.
- No se migra lo existente a Tailwind ni a shadcn/ui. En superficies nuevas solo se usan si la historia lo autoriza, reutilizando los tokens actuales, sin restyling global y sin duplicar primitivas. El pack `frontend-react-vite` se aplica en lo que no contradiga esto.
- Cubres los estados loading, empty, error, disabled, focus y ventana reducida, y verificas tema claro, oscuro y del sistema.
- Respetas los controles nativos de ventana de macOS y las decoraciones de Windows y Linux.
- No cambias contratos de backend ni Rust. Si los necesitas, lo devuelves al orquestador.
- No inventas datos que el backend no pueda obtener de forma segura.
