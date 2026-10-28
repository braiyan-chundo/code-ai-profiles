import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Block, Sample } from "../ShowcaseSection";

export default function HoverCardSection() {
  return (
    <>
      <Block title="Variantes" className="min-h-40">
        <Sample label="al pasar el ratón o con el foco">
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <Button variant="link">@perfil-de-ejemplo</Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarFallback>PE</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Perfil de ejemplo</span>
                  <span className="text-xs text-muted-foreground">Texto de muestra, sin datos reales.</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </Sample>
        <Sample label="side=&quot;right&quot;">
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <Button variant="outline">Abre a la derecha</Button>
            </HoverCardTrigger>
            <HoverCardContent side="right" className="w-56 text-sm">
              Tarjeta lateral de ejemplo.
            </HoverCardContent>
          </HoverCard>
        </Sample>
      </Block>
    </>
  );
}
