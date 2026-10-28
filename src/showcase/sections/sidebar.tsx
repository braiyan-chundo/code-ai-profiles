import { FolderIcon, HomeIcon, SettingsIcon } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Block } from "../ShowcaseSection";

const items = [
  { titulo: "Inicio", icono: HomeIcon, activo: true },
  { titulo: "Perfiles", icono: FolderIcon, activo: false, insignia: "3" },
  { titulo: "Ajustes", icono: SettingsIcon, activo: false },
];

/* El `transform` del marco contiene el `position: fixed` de la barra lateral. */
function Marco({ children }: { children: React.ReactNode }) {
  return <div className="relative h-[440px] w-full overflow-hidden rounded-xl border border-border [transform:translateZ(0)]">{children}</div>;
}

export default function SidebarSection() {
  return (
    <>
      <Block title="Variantes (variant y collapsible)" className="flex-col">
        <Marco>
          <SidebarProvider className="h-full min-h-0">
            <Sidebar collapsible="icon" className="absolute h-full">
              <SidebarHeader className="px-3 py-2 text-sm font-medium">Perfil de ejemplo</SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Navegación</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map(({ titulo, icono: Icono, activo, insignia }) => (
                        <SidebarMenuItem key={titulo}>
                          <SidebarMenuButton isActive={activo} tooltip={titulo}>
                            <Icono />
                            <span>{titulo}</span>
                          </SidebarMenuButton>
                          {insignia ? <SidebarMenuBadge>{insignia}</SidebarMenuBadge> : null}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="px-3 py-2 text-xs text-muted-foreground">Pie de ejemplo</SidebarFooter>
            </Sidebar>
            <SidebarInset className="p-4">
              <SidebarTrigger aria-label="Alternar barra lateral" />
              <p className="mt-3 text-sm text-muted-foreground">Contenido principal de ejemplo.</p>
            </SidebarInset>
          </SidebarProvider>
        </Marco>
      </Block>
      <Block title="Estados">
        <div className="w-60 rounded-xl border border-border p-2">
          <SidebarProvider className="min-h-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarProvider>
        </div>
      </Block>
    </>
  );
}
