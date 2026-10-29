import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "../../components/ui/field";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { cn } from "../../lib/utils";
import type { CodeSession } from "../../types";
import { SessionItem } from "../sessions";
import type { AppearancePreferences, AppTheme, ResolvedTheme, SessionTextSize } from "./appearance-preferences";

const THEMES: Array<{ value: AppTheme; label: string; description: string }> = [
  { value: "system", label: "Sistema", description: "Sigue macOS, Windows o Linux" },
  { value: "light", label: "Claro", description: "Mayor luminosidad" },
  { value: "dark", label: "Oscuro", description: "Menor brillo" },
];
const SIZES: Array<{ value: SessionTextSize; label: string; sample: string }> = [
  { value: "compact", label: "Compacto", sample: "text-[11px]" },
  { value: "comfortable", label: "Cómodo", sample: "text-[15px]" },
  { value: "large", label: "Grande", sample: "text-[19px]" },
];

/** Una sesión de ejemplo para la vista previa (contexto elevado): no sale de ningún perfil. La actividad es la de abrir el diálogo. */
const PREVIEW_SESSION: CodeSession = {
  id: "appearance-preview",
  title: "Vista previa de una sesión",
  model: "opus-4-8",
  effort: null,
  completedTurns: 24,
  createdAt: null,
  lastActivityAt: null,
  isArchived: false,
  contextTokens: 720_000,
  contextWindowTokens: 1_000_000,
  contextPercent: 72,
};

/** La tarjeta de una opción: el radio, su título y su descripción, con el borde y el tinte de la elegida. */
function ChoiceCard({ id, value, title, description, children }: {
  id: string;
  value: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <FieldLabel htmlFor={id} className="min-w-0 *:data-[slot=field]:p-2.5">
      <Field orientation="horizontal" className="flex-wrap gap-2.5">
        {children}
        <RadioGroupItem value={value} id={id} />
        <FieldContent className="min-w-0 gap-0.5">
          <FieldTitle className="text-xs">{title}</FieldTitle>
          {description && <FieldDescription className="text-(length:--fs-small) leading-snug">{description}</FieldDescription>}
        </FieldContent>
      </Field>
    </FieldLabel>
  );
}

/**
 * Una ventana en miniatura pintada con los tokens del tema que muestra: lleva su clase `theme-*`, así que no depende
 * del tema activo ni usa colores sueltos.
 */
function ThemeSwatch({ theme, className }: { theme: ResolvedTheme; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        `theme-${theme}`,
        "grid h-[51px] w-full grid-cols-[14px_1fr] grid-rows-[9px_1fr] gap-1 rounded-[10px] border border-(--line-strong) bg-background p-[7px]",
        className,
      )}
    >
      <i className="row-span-2 rounded-[3px] bg-(--line-strong)" />
      <i className="rounded-[3px] bg-primary" />
      <i className="rounded-[3px] bg-(--line)" />
    </span>
  );
}

function ThemePreview({ theme }: { theme: AppTheme }) {
  if (theme !== "system") return <ThemeSwatch theme={theme} />;
  return (
    <span className="relative block w-full">
      <ThemeSwatch theme="light" />
      <ThemeSwatch theme="dark" className="absolute inset-0 [clip-path:inset(0_0_0_50%)]" />
    </span>
  );
}

export function AppearanceDialog({
  preferences,
  onChange,
  onClose,
}: {
  preferences: AppearancePreferences;
  onChange: (preferences: AppearancePreferences) => void;
  onClose: () => void;
}) {
  const [previewSession] = useState<CodeSession>(() => ({ ...PREVIEW_SESSION, lastActivityAt: Date.now() }));
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apariencia</DialogTitle>
          <DialogDescription>Personaliza el tema y el tamaño del texto</DialogDescription>
        </DialogHeader>

        <FieldSet className="gap-3">
          <FieldLegend variant="label" className="mb-0 flex w-full items-baseline justify-between gap-4">
            Tema <span className="text-(length:--fs-small) font-normal text-muted-foreground">Se aplica inmediatamente</span>
          </FieldLegend>
          <RadioGroup
            aria-label="Tema de la aplicación"
            value={preferences.theme}
            onValueChange={(theme) => onChange({ ...preferences, theme: theme as AppTheme })}
            className="grid-cols-3 gap-2"
          >
            {THEMES.map((theme) => (
              <ChoiceCard key={theme.value} id={`appearance-theme-${theme.value}`} value={theme.value} title={theme.label} description={theme.description}>
                <ThemePreview theme={theme.value} />
              </ChoiceCard>
            ))}
          </RadioGroup>
        </FieldSet>

        <FieldSet className="gap-3">
          <FieldLegend variant="label" className="mb-0 flex w-full items-baseline justify-between gap-4">
            Tamaño del texto <span className="text-(length:--fs-small) font-normal text-muted-foreground">Se aplica a toda la interfaz</span>
          </FieldLegend>
          <RadioGroup
            aria-label="Tamaño del texto"
            value={preferences.sessionTextSize}
            onValueChange={(size) => onChange({ ...preferences, sessionTextSize: size as SessionTextSize })}
            className="grid-cols-3 gap-2"
          >
            {SIZES.map((size) => (
              <ChoiceCard key={size.value} id={`appearance-size-${size.value}`} value={size.value} title={size.label}>
                <span aria-hidden="true" className={cn("flex h-6 w-full items-center font-mono leading-none text-muted-foreground", size.sample)}>Aa</span>
              </ChoiceCard>
            ))}
          </RadioGroup>
        </FieldSet>

        <SessionItem session={previewSession} aria-label="Vista previa del texto de sesión" />

        <DialogFooter>
          <Button size="lg" className="min-w-36" onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
