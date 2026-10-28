import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Block, Sample } from "../ShowcaseSection";

export default function NavigationMenuSection() {
  return (
    <>
      <Block title="Variantes" className="min-h-60">
        <Sample label="con contenido desplegable">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Perfiles</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-64 gap-1">
                    <li>
                      <NavigationMenuLink href="#navigation-menu">
                        <div className="font-medium">Todos los perfiles</div>
                        <div className="text-muted-foreground">Lista de ejemplo.</div>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink href="#navigation-menu">
                        <div className="font-medium">Archivados</div>
                        <div className="text-muted-foreground">Otra entrada de ejemplo.</div>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#navigation-menu" className={navigationMenuTriggerStyle()}>
                  Sesiones
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="enlace activo">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink href="#navigation-menu" active className={navigationMenuTriggerStyle()}>
                  Activo
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#navigation-menu" className={navigationMenuTriggerStyle()}>
                  Normal
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </Sample>
      </Block>
    </>
  );
}
