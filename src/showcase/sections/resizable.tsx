import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Block, Sample } from "../ShowcaseSection";

function Panel({ texto }: { texto: string }) {
  return <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">{texto}</div>;
}

export default function ResizableSection() {
  return (
    <>
      <Block title="Variantes (orientation)" className="flex-col items-stretch">
        <Sample label="horizontal, con tirador" className="items-stretch">
          <ResizablePanelGroup orientation="horizontal" className="h-40 max-w-lg rounded-xl border border-border">
            <ResizablePanel defaultSize={35} minSize={20}>
              <Panel texto="Panel A" />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65}>
              <Panel texto="Panel B" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </Sample>
        <Sample label="vertical" className="items-stretch">
          <ResizablePanelGroup orientation="vertical" className="h-56 max-w-lg rounded-xl border border-border">
            <ResizablePanel defaultSize={40}>
              <Panel texto="Arriba" />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={60}>
              <Panel texto="Abajo" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </Sample>
      </Block>
    </>
  );
}
