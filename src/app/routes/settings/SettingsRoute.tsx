import { PaletteIcon, ShieldCheckIcon } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { AppearanceSettings } from "../../../features/appearance";
import { PermissionsSettings, usePermissionsAttention } from "../../../features/permissions";
import { PageContent } from "../../layout/PageContent";
import { PageHeader } from "../../layout/PageHeader";

const SECTIONS = ["apariencia", "permisos"] as const;
type Section = (typeof SECTIONS)[number];
const TITLES: Record<Section, string> = { apariencia: "Apariencia", permisos: "Permisos" };
const isSection = (value: string | undefined): value is Section => SECTIONS.some((section) => section === value);

/**
 * `#/configuracion/:section?` (HU-0022, A-2): la configuración de la app en una página, con una pestaña por sección.
 * Las pestañas están controladas por la ruta (`value = section`, y cambiar de pestaña navega sin sumar historial), así que
 * cada sección tiene su enlace y las flechas las recorren como pide Radix. Sin sección, o con otra, va a Apariencia.
 * La pestaña Permisos lleva un punto cuando alguna instancia necesita un permiso. El cuerpo mide 10 columnas de la
 * retícula (896 px) y, por debajo de 1071 px, todo el ancho.
 */
export function SettingsRoute() {
  const { section } = useParams();
  const navigate = useNavigate();
  const attention = usePermissionsAttention();
  if (!isSection(section)) return <Navigate to="/configuracion/apariencia" replace />;

  return (
    <>
      <PageHeader eyebrow="Configuración" title={TITLES[section]} />
      <PageContent>
        <Tabs
          value={section}
          onValueChange={(next) => navigate(`/configuracion/${next}`, { replace: true })}
          className="max-w-[896px] gap-6 max-[1070px]:max-w-none"
        >
          <TabsList aria-label="Secciones de Configuración">
            <TabsTrigger value="apariencia">
              <PaletteIcon aria-hidden="true" /> Apariencia
            </TabsTrigger>
            <TabsTrigger value="permisos">
              <ShieldCheckIcon aria-hidden="true" /> Permisos
              {attention && (
                <>
                  <span aria-hidden="true" title="Un permiso que alguna instancia necesita" className="size-2 rounded-full bg-warning" />
                  <span className="sr-only">: hay permisos que alguna instancia necesita</span>
                </>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="apariencia"><AppearanceSettings /></TabsContent>
          <TabsContent value="permisos"><PermissionsSettings /></TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}
