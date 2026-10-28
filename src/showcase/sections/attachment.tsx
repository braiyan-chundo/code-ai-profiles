import { FileTextIcon, XIcon } from "lucide-react";
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Block, Sample } from "../ShowcaseSection";

const estados = ["idle", "uploading", "processing", "error", "done"] as const;

function Adjunto({ state, size, orientation }: { state?: (typeof estados)[number]; size?: "default" | "sm" | "xs"; orientation?: "horizontal" | "vertical" }) {
  return (
    <Attachment state={state} size={size} orientation={orientation}>
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>documento-de-ejemplo.txt</AttachmentTitle>
        <AttachmentDescription>12 KB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Quitar adjunto de ejemplo">
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}

export default function AttachmentSection() {
  return (
    <>
      <Block title="Variantes (size y orientation)">
        {(["default", "sm", "xs"] as const).map((size) => (
          <Sample key={size} label={size}>
            <Adjunto size={size} />
          </Sample>
        ))}
        <Sample label="vertical">
          <Adjunto orientation="vertical" />
        </Sample>
      </Block>
      <Block title="Estados (state)">
        {estados.map((state) => (
          <Sample key={state} label={state}>
            <Adjunto state={state} />
          </Sample>
        ))}
      </Block>
      <Block title="Composición">
        <AttachmentGroup>
          <Adjunto />
          <Adjunto size="sm" />
        </AttachmentGroup>
      </Block>
    </>
  );
}
