import { useState, type FormEvent } from "react";
import type { CreateInstanceRequest, DashboardState, ManagedInstance } from "../../types";
import { AlertIcon, ChevronIcon, CloudIcon, HardDriveIcon, PlusIcon, RefreshIcon } from "../../components/Icons";
import { ModalFrame } from "../../components/ModalFrame";
import { iconDimensionsError, iconFileError } from "./icon-validation";
import { managedIconSource } from "./instance-icon";
import type { InstanceIconChange } from "./instance-types";

export function InstanceEditor({
  instance,
  sourcePath,
  platform,
  busy,
  onClose,
  onSave,
}: {
  instance: ManagedInstance | null;
  sourcePath: string | null;
  platform: DashboardState["system"]["platform"];
  busy: boolean;
  onClose: () => void;
  onSave: (request: CreateInstanceRequest, iconChange: InstanceIconChange) => Promise<void>;
}) {
  const [name, setName] = useState(instance?.name ?? "");
  const [customSource, setCustomSource] = useState(sourcePath ?? "");
  const [advanced, setAdvanced] = useState(false);
  const [iconBytes, setIconBytes] = useState<Uint8Array | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const isNew = !instance;
  const currentIconUrl = instance ? managedIconSource(instance) : null;

  const selectIcon = async (file: File | null) => {
    setIconError(null);
    if (!file) return;
    const fileError = iconFileError(file);
    if (fileError) {
      setIconError(fileError);
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const dimensionsError = iconDimensionsError(bitmap.width, bitmap.height);
      bitmap.close();
      if (dimensionsError) {
        setIconError(dimensionsError);
        return;
      }
      const reader = new FileReader();
      const preview = await new Promise<string>((resolve, reject) => {
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Vista previa no disponible"));
        reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
      });
      setIconBytes(new Uint8Array(await file.arrayBuffer()));
      setIconPreviewUrl(preview);
      setRemoveIcon(false);
    } catch {
      setIconError("No se pudo decodificar la imagen seleccionada.");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave({
      name: name.trim(),
      sourcePath: isNew ? customSource.trim() || null : undefined,
    }, { bytes: iconBytes, previewUrl: iconPreviewUrl, remove: removeIcon });
  };

  return (
    <ModalFrame
      title={isNew ? "Nueva instancia" : "Editar instancia"}
      subtitle={isNew ? "Un perfil local completamente independiente" : "Actualiza el nombre visible de este perfil"}
      onClose={busy ? () => undefined : onClose}
    >
      <form className="editor-form" onSubmit={(event) => void submit(event)}>
        <label className="form-field">
          <span>Nombre del perfil</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={64} required placeholder="Ej. Trabajo, Personal, Cliente A" />
        </label>

        <section className="instance-icon-editor" aria-labelledby="instance-icon-heading">
          <div className="instance-icon-preview">
            {iconPreviewUrl || (!removeIcon && currentIconUrl)
              ? <img src={iconPreviewUrl ?? currentIconUrl!} alt="Vista previa del icono de la instancia" />
              : <CloudIcon size={30} />}
          </div>
          <div className="instance-icon-copy">
            <strong id="instance-icon-heading">Icono de la instancia</strong>
            <span>Se guarda fuera de la aplicación compatible para sobrevivir a futuras sincronizaciones.</span>
            <div className="instance-icon-actions">
              <label className="secondary-button file-picker-button">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    event.currentTarget.value = "";
                    void selectIcon(file);
                  }}
                  disabled={busy}
                />
                {iconPreviewUrl || instance?.customIcon ? "Reemplazar imagen" : "Seleccionar imagen"}
              </label>
              {(iconPreviewUrl || instance?.customIcon) && !removeIcon && (
                <button
                  type="button"
                  className="text-danger-button"
                  disabled={busy}
                  onClick={() => {
                    setIconBytes(null);
                    setIconPreviewUrl(null);
                    setRemoveIcon(true);
                    setIconError(null);
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
            {iconError && <span className="field-error" role="alert">{iconError}</span>}
          </div>
        </section>

        <div className="icon-platform-note">
          <AlertIcon size={17} />
          <p>
            {platform === "macos"
              ? "Al guardar, Code AI Profiles intentará aplicar el icono al Dock y verificará la copia administrada. El resultado aparecerá aquí cuando termine."
              : platform === "windows"
                ? "En Windows el ejecutable conserva su icono oficial; la imagen personalizada identifica la instancia dentro de Code AI Profiles."
                : "En Linux se intenta aplicar el icono al launcher; Wayland o el compositor pueden conservar el icono oficial."}
          </p>
        </div>
        {instance?.customIcon && !removeIcon && (
          <p className={`icon-application-result ${instance.customIcon.systemApplied ? "is-applied" : "is-limited"}`}>
            {platform === "macos" && (
              <strong>{instance.customIcon.systemApplied ? "Dock aplicado. " : "No se aplicó al Dock. "}</strong>
            )}
            {instance.customIcon.systemMessage}
          </p>
        )}

        {isNew && (
          <>
            <div className="isolation-note">
              <span className="note-icon"><HardDriveIcon size={20} /></span>
              <div>
                <strong>Copia aislada + perfil independiente</strong>
                <p>La primera creación puede tardar. macOS intenta usar una copia APFS eficiente, Windows crea una copia administrada y Linux reutiliza el binario instalado con un perfil aislado.</p>
              </div>
            </div>
            <button className="advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)}>
              <ChevronIcon className={advanced ? "open" : ""} size={16} /> Opciones avanzadas
            </button>
            {advanced && (
              <label className="form-field advanced-field">
                <span>Ruta de la aplicación compatible</span>
                <input value={customSource} onChange={(event) => setCustomSource(event.target.value)} required placeholder="/Applications/Compatible App.app" />
              </label>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="primary-action modal-primary" type="submit" disabled={busy || !name.trim()}>
            {busy ? <><RefreshIcon className="spin" size={17} /> {isNew ? "Creando copia…" : "Guardando…"}</> : isNew ? <><PlusIcon size={17} /> Crear instancia</> : "Guardar cambios"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
