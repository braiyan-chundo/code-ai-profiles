import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

type CopyState = "idle" | "copied" | "failed";

/**
 * Un botón que copia un texto con `navigator.clipboard`, como `CodeBlockCopyButton` pero con sus textos en español y de
 * ancho fijo: «Copiado» no mueve lo que tiene al lado (HU-0025, 112 px). Vuelve a su texto a los 2 s; si el portapapeles
 * se niega, dice «No se pudo». El aviso para lectores de pantalla va en una región `aria-live`.
 */
export function CopyButton({
  value,
  label = "Copiar",
  doneLabel = "Copiado",
  ariaLabel,
  className,
  variant = "outline",
  size = "default",
  iconOnly = false,
}: {
  value: string;
  label?: string;
  doneLabel?: string;
  ariaLabel: string;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  /** Solo el icono (24 px), para la cabecera de un bloque de código; el estado sigue en `aria-label`. */
  iconOnly?: boolean;
}) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => setState("copied"))
      .catch(() => setState("failed"));
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-label={state === "copied" ? `${doneLabel}: ${ariaLabel.toLowerCase()}` : ariaLabel}
        title={ariaLabel}
        onClick={copy}
        className={cn(!iconOnly && "min-w-28", "shrink-0", state === "copied" && "text-success", state === "failed" && "text-destructive", className)}
      >
        {state === "copied" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        {!iconOnly && (state === "copied" ? doneLabel : state === "failed" ? "No se pudo" : label)}
      </Button>
      <span role="status" className="sr-only">{state === "copied" ? doneLabel : state === "failed" ? "No se pudo copiar" : ""}</span>
    </>
  );
}
