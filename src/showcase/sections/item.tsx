import { FolderIcon, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Block, Sample } from "../ShowcaseSection";

function Fila({ variant, size }: { variant?: "default" | "outline" | "muted"; size?: "default" | "sm" | "xs" }) {
  return (
    <Item variant={variant} size={size} className="w-80">
      <ItemMedia variant="icon">
        <FolderIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Perfil de ejemplo</ItemTitle>
        <ItemDescription>Descripción de muestra.</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon-sm" aria-label="Más opciones">
          <MoreHorizontalIcon />
        </Button>
      </ItemActions>
    </Item>
  );
}

export default function ItemSection() {
  return (
    <>
      <Block title="Variantes">
        {(["default", "outline", "muted"] as const).map((variant) => (
          <Sample key={variant} label={variant}>
            <Fila variant={variant} />
          </Sample>
        ))}
      </Block>
      <Block title="Tamaños">
        {(["default", "sm", "xs"] as const).map((size) => (
          <Sample key={size} label={size}>
            <Fila variant="outline" size={size} />
          </Sample>
        ))}
      </Block>
      <Block title="Composición">
        <ItemGroup className="w-80 rounded-xl border border-border">
          <Item>
            <ItemHeader>Cabecera de ejemplo</ItemHeader>
            <ItemContent>
              <ItemTitle>Primer elemento</ItemTitle>
            </ItemContent>
            <ItemFooter>Pie de ejemplo</ItemFooter>
          </Item>
          <ItemSeparator />
          <Item>
            <ItemContent>
              <ItemTitle>Segundo elemento</ItemTitle>
              <ItemDescription>Con descripción.</ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </Block>
    </>
  );
}
