import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Block, Sample } from "../ShowcaseSection";

/* Solo con AvatarFallback: el showcase no pide imágenes a ninguna URL. */
export default function AvatarSection() {
  return (
    <>
      <Block title="Variantes (size)">
        {(["sm", "default", "lg"] as const).map((size) => (
          <Sample key={size} label={size}>
            <Avatar size={size}>
              <AvatarFallback>PE</AvatarFallback>
            </Avatar>
          </Sample>
        ))}
      </Block>
      <Block title="Estados">
        <Sample label="con insignia">
          <Avatar>
            <AvatarFallback>PE</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="grupo con contador">
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>EF</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
        </Sample>
      </Block>
    </>
  );
}
