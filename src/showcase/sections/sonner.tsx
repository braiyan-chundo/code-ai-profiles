import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Block, Sample } from "../ShowcaseSection";

/* El <Toaster> se monta una sola vez en Showcase.tsx, con el tema por props (A-6). */
export default function SonnerSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="por defecto">
          <Button variant="outline" onClick={() => toast("Aviso de ejemplo")}>
            Aviso
          </Button>
        </Sample>
        <Sample label="success">
          <Button variant="outline" onClick={() => toast.success("Acción completada (ejemplo)")}>
            Éxito
          </Button>
        </Sample>
        <Sample label="info">
          <Button variant="outline" onClick={() => toast.info("Dato informativo de ejemplo")}>
            Información
          </Button>
        </Sample>
        <Sample label="warning">
          <Button variant="outline" onClick={() => toast.warning("Cuidado: texto de ejemplo")}>
            Advertencia
          </Button>
        </Sample>
        <Sample label="error">
          <Button variant="outline" onClick={() => toast.error("No se pudo completar (ejemplo)")}>
            Error
          </Button>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="cargando y resolución">
          <Button
            variant="outline"
            onClick={() => {
              const id = toast.loading("Guardando (ejemplo)");
              window.setTimeout(() => toast.success("Guardado (ejemplo)", { id }), 1500);
            }}
          >
            Cargando
          </Button>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="con descripción y acción">
          <Button
            variant="outline"
            onClick={() =>
              toast("Perfil de ejemplo detenido", {
                description: "Texto de apoyo de ejemplo.",
                action: { label: "Deshacer", onClick: () => toast.info("Deshecho (ejemplo)") },
              })
            }
          >
            Con acción
          </Button>
        </Sample>
      </Block>
    </>
  );
}
