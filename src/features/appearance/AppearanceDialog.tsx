import { CodeSessionIcon } from "../../components/Icons";
import { ModalFrame } from "../../components/ModalFrame";
import type { AppearancePreferences, AppTheme, SessionTextSize } from "./appearance-preferences";

export function AppearanceDialog({
  preferences,
  onChange,
  onClose,
}: {
  preferences: AppearancePreferences;
  onChange: (preferences: AppearancePreferences) => void;
  onClose: () => void;
}) {
  const themes: Array<{ value: AppTheme; label: string; description: string }> = [
    { value: "system", label: "Sistema", description: "Sigue macOS, Windows o Linux" },
    { value: "light", label: "Claro", description: "Mayor luminosidad" },
    { value: "dark", label: "Oscuro", description: "Menor brillo" },
  ];
  const sizes: Array<{ value: SessionTextSize; label: string; sample: string }> = [
    { value: "compact", label: "Compacto", sample: "Aa" },
    { value: "comfortable", label: "Cómodo", sample: "Aa" },
    { value: "large", label: "Grande", sample: "Aa" },
  ];

  return (
    <ModalFrame
      title="Apariencia"
      subtitle="Personaliza la lectura de tus sesiones"
      onClose={onClose}
    >
      <div className="appearance-settings">
        <section className="appearance-section">
          <div className="appearance-section-heading">
            <strong>Tema</strong>
            <span>Se aplica inmediatamente</span>
          </div>
          <div className="theme-options" role="radiogroup" aria-label="Tema de la aplicación">
            {themes.map((theme) => (
              <button
                key={theme.value}
                type="button"
                className={`theme-option theme-preview-${theme.value} ${preferences.theme === theme.value ? "selected" : ""}`}
                onClick={() => onChange({ ...preferences, theme: theme.value })}
                role="radio"
                aria-checked={preferences.theme === theme.value}
              >
                <span className="theme-swatch"><i /><i /><i /></span>
                <span><strong>{theme.label}</strong><small>{theme.description}</small></span>
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-heading">
            <strong>Tamaño del texto de sesiones</strong>
            <span>También amplía modelos y contexto</span>
          </div>
          <div className="text-size-options" role="radiogroup" aria-label="Tamaño del texto de las sesiones">
            {sizes.map((size) => (
              <button
                key={size.value}
                type="button"
                className={`text-size-option size-${size.value} ${preferences.sessionTextSize === size.value ? "selected" : ""}`}
                onClick={() => onChange({ ...preferences, sessionTextSize: size.value })}
                role="radio"
                aria-checked={preferences.sessionTextSize === size.value}
              >
                <span>{size.sample}</span>
                <strong>{size.label}</strong>
              </button>
            ))}
          </div>
        </section>

        <div className="appearance-preview" aria-label="Vista previa del texto de sesión">
          <span className="session-index"><CodeSessionIcon size={14} /></span>
          <div className="session-copy">
            <strong>Vista previa de una sesión</strong>
            <span>Opus 4.8 <i /> 24 turnos <i /> Ahora mismo</span>
            <div className="session-context context-elevated">
              <div className="session-context-heading"><span>640k de 1M</span><strong>64%</strong></div>
              <div className="session-context-track"><span style={{ width: "64%" }} /></div>
              <small>Contexto elevado</small>
            </div>
          </div>
        </div>

        <div className="modal-actions appearance-actions">
          <button className="primary-action modal-primary" onClick={onClose}>Listo</button>
        </div>
      </div>
    </ModalFrame>
  );
}
