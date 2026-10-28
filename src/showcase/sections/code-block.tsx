import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockFooter, CodeBlockHeader, CodeBlockLine, CodeBlockTitle } from "@/components/ui/code-block";
import { Block, Sample } from "../ShowcaseSection";

const codigo = `function saludar(nombre) {
  return "Hola, " + nombre;
}

saludar("mundo");`;

export default function CodeBlockSection() {
  return (
    <>
      <Block title="Variantes" className="items-stretch">
        <Sample label="por defecto, con cabecera y copiar" className="items-stretch">
          <CodeBlock className="max-w-lg">
            <CodeBlockHeader>
              <CodeBlockTitle>ejemplo.js</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton value={codigo} />
              </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent lineNumbers>{codigo}</CodeBlockContent>
          </CodeBlock>
        </Sample>
        <Sample label='variant="destructive" y size="sm"' className="items-stretch">
          <CodeBlock variant="destructive" size="sm" className="max-w-lg">
            <CodeBlockContent>{"Error de ejemplo: no se pudo completar."}</CodeBlockContent>
          </CodeBlock>
        </Sample>
      </Block>
      <Block title="Estados (líneas)" className="items-stretch">
        <CodeBlock className="max-w-lg">
          <CodeBlockContent>
            <CodeBlockLine>línea normal</CodeBlockLine>
            <CodeBlockLine variant="added">línea añadida</CodeBlockLine>
            <CodeBlockLine variant="removed">línea eliminada</CodeBlockLine>
            <CodeBlockLine variant="highlighted">línea resaltada</CodeBlockLine>
          </CodeBlockContent>
          <CodeBlockFooter>Pie de ejemplo</CodeBlockFooter>
        </CodeBlock>
      </Block>
      <Block title="Composición" className="items-stretch">
        <CodeBlock className="max-w-lg">
          <CodeBlockContent wrap>{"Una línea muy larga de texto de ejemplo que se parte porque la opción wrap está activada en este bloque de código."}</CodeBlockContent>
        </CodeBlock>
      </Block>
    </>
  );
}
