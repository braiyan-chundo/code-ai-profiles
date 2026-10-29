import { useState, useId, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "../../components/ui/field";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { cn } from "../../lib/utils";
import type { CodeSession } from "../../types";
import { SessionItem } from "../sessions";
import { useAppearance } from "./appearance-context";
import type { AppTheme, ResolvedTheme, SessionTextSize } from "./appearance-preferences";

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

/** Una sesión de ejemplo para la vista previa (contexto elevado): no sale de ningún perfil. La actividad es la de abrir la página. */
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

/** La tarjeta de una opción: el radio, su título y su descripción, con el anillo y el tinte de la elegida. */
function ChoiceCard({ id, value, title, description, children }: {
  id: string;
  value: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <FieldLabel htmlFor={id} className="min-w-0 *:data-[slot=field]:p-3">
      <Field orientation="horizontal" className="flex-wrap gap-2">
        {children}
        <RadioGroupItem value={value} id={id} />
        <FieldContent className="min-w-0 gap-0">
          <FieldTitle className="text-(length:--fs-small)/(--lh-small)">{title}</FieldTitle>
          {description && <FieldDescription className="text-(length:--fs-small)/(--lh-small)">{description}</FieldDescription>}
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
        "grid h-12 w-full grid-cols-[16px_1fr] grid-rows-[8px_1fr] gap-1 rounded-sm bg-background p-2 ring-1 ring-(--line-strong) ring-inset",
        className,
      )}
    >
      <i className="row-span-2 rounded-xs bg-(--line-strong)" />
      <i className="rounded-xs bg-primary" />
      <i className="rounded-xs bg-(--line)" />
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

/** Una tarjeta de ajuste: su título, lo que hace el cambio a la derecha y el contenido. */
function SettingCard({ id, title, note, children }: { id: string; title: string; note: string; children: ReactNode }) {
  return (
    <Card size="sm" className="gap-3">
      <CardHeader className="flex items-start justify-between gap-4">
        <CardTitle id={id} className="text-(length:--fs-heading)/(--lh-heading) font-semibold">{title}</CardTitle>
        <span className="text-right text-(length:--fs-small)/(--lh-heading) text-muted-foreground">{note}</span>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Configuración › Apariencia (HU-0022, A-2): lo mismo que el diálogo de antes, en tres tarjetas (tema, tamaño del texto
 * y la sesión de ejemplo). Los cambios se aplican y se guardan al momento por `useAppearance()`: no hay «Listo».
 */
export function AppearanceSettings() {
  const { preferences, setPreferences } = useAppearance();
  const [previewSession] = useState<CodeSession>(() => ({ ...PREVIEW_SESSION, lastActivityAt: Date.now() }));
  const themeId = useId();
  const sizeId = useId();
  return (
    <div className="grid gap-4">
      <p className="text-(length:--fs-small)/(--lh-prose) text-muted-foreground">
        Los cambios se aplican al momento y se guardan para la próxima vez.
      </p>

      <SettingCard id={themeId} title="Tema" note="Se aplica inmediatamente">
        <RadioGroup
          aria-labelledby={themeId}
          value={preferences.theme}
          onValueChange={(theme) => setPreferences({ ...preferences, theme: theme as AppTheme })}
          className="grid-cols-3 gap-2"
        >
          {THEMES.map((theme) => (
            <ChoiceCard key={theme.value} id={`appearance-theme-${theme.value}`} value={theme.value} title={theme.label} description={theme.description}>
              <ThemePreview theme={theme.value} />
            </ChoiceCard>
          ))}
        </RadioGroup>
      </SettingCard>

      <SettingCard id={sizeId} title="Tamaño del texto" note="Se aplica a toda la interfaz">
        <RadioGroup
          aria-labelledby={sizeId}
          value={preferences.sessionTextSize}
          onValueChange={(size) => setPreferences({ ...preferences, sessionTextSize: size as SessionTextSize })}
          className="grid-cols-3 gap-2"
        >
          {SIZES.map((size) => (
            <ChoiceCard key={size.value} id={`appearance-size-${size.value}`} value={size.value} title={size.label}>
              <span aria-hidden="true" className={cn("flex h-6 w-full items-center font-mono text-muted-foreground", size.sample)}>Aa</span>
            </ChoiceCard>
          ))}
        </RadioGroup>
      </SettingCard>

      <Card size="sm" className="gap-3">
        <CardHeader className="flex items-start justify-between gap-4">
          <CardTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">Vista previa</CardTitle>
          <span className="text-right text-(length:--fs-small)/(--lh-heading) text-muted-foreground">Una sesión de ejemplo, no sale de ningún perfil</span>
        </CardHeader>
        <CardContent>
          <SessionItem session={previewSession} aria-label="Vista previa del texto de sesión" />
        </CardContent>
      </Card>
    </div>
  );
}
