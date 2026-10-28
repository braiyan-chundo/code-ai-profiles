import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@/components/ui/message";
import { Block, Sample } from "../ShowcaseSection";

export default function MessageSection() {
  return (
    <>
      <Block title="Variantes (align)" className="flex-col items-stretch">
        <Sample label='align="start"' className="items-stretch">
          <Message align="start" className="max-w-md">
            <MessageAvatar>
              <Avatar size="sm">
                <AvatarFallback>PE</AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <MessageHeader>Perfil de ejemplo</MessageHeader>
              <Bubble variant="secondary">
                <BubbleContent>Mensaje de muestra, sin contenido real.</BubbleContent>
              </Bubble>
              <MessageFooter>10:30</MessageFooter>
            </MessageContent>
          </Message>
        </Sample>
        <Sample label='align="end"' className="items-stretch">
          <Message align="end" className="max-w-md">
            <MessageContent>
              <Bubble align="end">
                <BubbleContent>Otro mensaje de muestra.</BubbleContent>
              </Bubble>
              <MessageFooter>10:31</MessageFooter>
            </MessageContent>
          </Message>
        </Sample>
      </Block>
      <Block title="Composición" className="flex-col items-stretch">
        <MessageGroup className="max-w-md">
          <Message>
            <MessageContent>
              <Bubble variant="muted">
                <BubbleContent>Primer mensaje de ejemplo.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message align="end">
            <MessageContent>
              <Bubble align="end">
                <BubbleContent>Respuesta de ejemplo.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        </MessageGroup>
      </Block>
    </>
  );
}
