import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { Block, Sample } from "../ShowcaseSection";

const mensajes = Array.from({ length: 14 }, (_, index) => ({ id: `m${index + 1}`, propio: index % 2 === 1, texto: `Mensaje de ejemplo número ${index + 1}.` }));

export default function MessageScrollerSection() {
  return (
    <>
      <Block title="Variantes" className="items-stretch">
        <Sample label="con botón para ir al final" className="items-stretch">
          <MessageScrollerProvider>
            <MessageScroller className="h-64 w-80 rounded-xl border border-border">
              <MessageScrollerViewport aria-label="Mensajes de ejemplo" className="p-3">
                <MessageScrollerContent className="gap-3">
                  {mensajes.map((mensaje) => (
                    <MessageScrollerItem key={mensaje.id} messageId={mensaje.id}>
                      <Message align={mensaje.propio ? "end" : "start"}>
                        <MessageContent>
                          <Bubble variant={mensaje.propio ? "default" : "secondary"} align={mensaje.propio ? "end" : "start"}>
                            <BubbleContent>{mensaje.texto}</BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className="bottom-3" />
            </MessageScroller>
          </MessageScrollerProvider>
        </Sample>
      </Block>
    </>
  );
}
