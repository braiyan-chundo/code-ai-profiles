import { useState, type FormEvent } from "react";
import type { CreateInstanceRequest, DashboardState, ManagedInstance } from "../../types";
import { ChevronDownIcon, HardDriveIcon, ImageUpIcon, InfoIcon, PlusIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Field, FieldError, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";
import { iconRetryState, iconStatusLead } from "./icon-status";
import { iconDimensionsError, iconFileError } from "./icon-validation";
import { managedIconSource } from "./instance-icon";
import type { InstanceIconChange } from "./instance-types";

export function InstanceEditor({
  instance,
  sourcePath,
  platform,
  busy,
  iconBusy,
  actionError,
  onClose,
  onRetryIcon,
  onSave,
}: {
  instance: ManagedInstance | null;
  sourcePath: string | null;
  platform: DashboardState["system"]["platform"];
  busy: boolean;
  /** «Reintentar» el icono del Dock en curso. */
  iconBusy: boolean;
  /** El error de la última operación del panel: el aviso global queda tras el fondo del diálogo. */
  actionError: string | null;
  onClose: () => void;
  onRetryIcon: () => Promise<void>;
  onSave: (request: CreateInstanceRequest, iconChange: InstanceIconChange) => Promise<void>;
}) {
  const [name, setName] = useState(instance?.name ?? "");
  const [customSource, setCustomSource] = useState(sourcePath ?? "");
  const [advanced, setAdvanced] = useState(false);
  const [iconBytes, setIconBytes] = useState<Uint8Array | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [retried, setRetried] = useState(false);
  const isNew = !instance;
  const currentIconUrl = instance ? managedIconSource(instance) : null;
  const locked = busy || iconBusy;
  const retry = iconRetryState({
    platform,
    customIcon: instance?.customIcon,
    status: instance?.status ?? "stopped",
    removeIcon,
    busy: locked,
  });

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

  const retryIcon = () => {
    setRetried(true);
    return onRetryIcon();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave({
      name: name.trim(),
      sourcePath: isNew ? customSource.trim() || null : undefined,
    }, { bytes: iconBytes, previewUrl: iconPreviewUrl, remove: removeIcon });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !locked) onClose(); }}>
      <DialogContent aria-busy={locked} closeDisabled={locked}>
        <DialogHeader>
          <DialogTitle>{isNew ? "Nueva instancia" : "Editar instancia"}</DialogTitle>
          <DialogDescription>
            {isNew ? "Un perfil local completamente independiente" : "Actualiza el nombre visible de este perfil"}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <Field>
            <FieldLabel htmlFor="instance-name" className="text-xs">Nombre del perfil</FieldLabel>
            <Input
              id="instance-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              required
              placeholder="Ej. Trabajo, Personal, Cliente A"
              className="h-11 rounded-lg px-3.5"
            />
          </Field>

          <section
            aria-labelledby="instance-icon-heading"
            className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-3.5 rounded-xl border bg-(--surface-soft) p-3.5"
          >
            <span className="grid size-[74px] place-items-center overflow-hidden rounded-[22px] border border-(--line-strong) bg-secondary text-primary-text">
              {iconPreviewUrl || (!removeIcon && currentIconUrl)
                ? <img src={iconPreviewUrl ?? currentIconUrl!} alt="Vista previa del icono de la instancia" className="size-full object-cover" />
                : <BrandMark size={30} />}
            </span>
            <div className="grid min-w-0 gap-1.5">
              <strong id="instance-icon-heading" className="text-xs font-semibold">Icono de la instancia</strong>
              <span className="text-(length:--fs-small) leading-snug text-muted-foreground">
                Se guarda fuera de la aplicación compatible para sobrevivir a futuras sincronizaciones.
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" aria-disabled={locked} className="cursor-pointer text-xs has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
                  <label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        event.currentTarget.value = "";
                        void selectIcon(file);
                      }}
                      disabled={locked}
                    />
                    <ImageUpIcon />
                    {iconPreviewUrl || instance?.customIcon ? "Reemplazar imagen" : "Seleccionar imagen"}
                  </label>
                </Button>
                {(iconPreviewUrl || instance?.customIcon) && !removeIcon && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={locked}
                    onClick={() => {
                      setIconBytes(null);
                      setIconPreviewUrl(null);
                      setRemoveIcon(true);
                      setIconError(null);
                    }}
                  >
                    Quitar
                  </Button>
                )}
              </div>
              {iconError && <FieldError className="text-(length:--fs-small)">{iconError}</FieldError>}
            </div>
          </section>

          <Alert className="border-primary/15 bg-primary/5 text-primary-text">
            <InfoIcon />
            <AlertDescription className="text-(length:--fs-small) leading-relaxed">
              {platform === "macos"
                ? "Al guardar, el icono se pone en la copia de esta instancia y se verá en el Dock la próxima vez que la abras. La firma de la aplicación no cambia."
                : platform === "windows"
                  ? "En Windows el ejecutable conserva su icono oficial; la imagen personalizada identifica la instancia dentro de Code AI Profiles."
                  : "En Linux se intenta aplicar el icono al launcher; Wayland o el compositor pueden conservar el icono oficial."}
            </AlertDescription>
          </Alert>
          {instance?.customIcon && !removeIcon && (retry.appManagement ? (
            <Alert className="border-warning/30 text-warning">
              <TriangleAlertIcon />
              <AlertTitle className="text-xs">Permiso de Gestión de apps</AlertTitle>
              <AlertDescription className="text-(length:--fs-small) leading-relaxed text-warning">
                {instance.customIcon.systemMessage}
              </AlertDescription>
              <div className="col-start-2 mt-2 grid justify-items-start gap-1.5">
                <RetryIconButton enabled={retry.enabled} loading={iconBusy} onRetry={retryIcon} />
                {retry.hint && <span className="text-(length:--fs-small)">{retry.hint}</span>}
              </div>
            </Alert>
          ) : (
            <div className="-mt-2 grid gap-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p
                  data-applied={instance.customIcon.systemApplied}
                  className="min-w-0 flex-1 basis-60 px-0.5 font-mono text-(length:--fs-small) leading-snug text-muted-foreground data-[applied=true]:text-success"
                >
                  {platform === "macos" && <strong>{iconStatusLead(instance.customIcon.systemApplied)}</strong>}
                  {instance.customIcon.systemMessage}
                </p>
                {retry.visible && <RetryIconButton enabled={retry.enabled} loading={iconBusy} onRetry={retryIcon} />}
              </div>
              {retry.hint && <p className="px-0.5 text-(length:--fs-small) text-muted-foreground">{retry.hint}</p>}
            </div>
          ))}

          {retried && actionError && !iconBusy && (
            <Alert variant="destructive">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertDescription className="text-(length:--fs-small) leading-relaxed text-destructive">{actionError}</AlertDescription>
            </Alert>
          )}

          {isNew && (
            <>
              <Alert className="border-primary/15 bg-primary/5 text-primary-text">
                <HardDriveIcon />
                <AlertTitle className="text-xs text-foreground">Copia aislada + perfil independiente</AlertTitle>
                <AlertDescription className="text-(length:--fs-small) leading-relaxed">
                  La primera creación puede tardar. macOS intenta usar una copia APFS eficiente, Windows crea una copia administrada y Linux reutiliza el binario instalado con un perfil aislado.
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-my-1 w-fit px-1.5 text-xs text-muted-foreground"
                aria-expanded={advanced}
                aria-controls="instance-source-field"
                onClick={() => setAdvanced(!advanced)}
              >
                <ChevronDownIcon className={cn("transition-transform", advanced && "rotate-180")} /> Opciones avanzadas
              </Button>
              {advanced && (
                <Field id="instance-source-field" className="animate-in fade-in-0">
                  <FieldLabel htmlFor="instance-source" className="text-xs">Ruta de la aplicación compatible</FieldLabel>
                  <Input
                    id="instance-source"
                    value={customSource}
                    onChange={(event) => setCustomSource(event.target.value)}
                    required
                    placeholder="/Applications/Compatible App.app"
                    className="h-11 rounded-lg px-3.5 font-mono text-xs md:text-xs"
                  />
                </Field>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={locked}>Cancelar</Button>
            <Button type="submit" size="lg" className="min-w-36" disabled={locked || !name.trim()}>
              {busy
                ? <><Spinner aria-hidden="true" /> {isNew ? "Creando copia…" : "Guardando…"}</>
                : isNew ? <><PlusIcon /> Crear instancia</> : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RetryIconButton({ enabled, loading, onRetry }: { enabled: boolean; loading: boolean; onRetry: () => Promise<void> }) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={!enabled} onClick={() => void onRetry()}>
      {loading ? <Spinner aria-hidden="true" /> : <RotateCwIcon />} Reintentar
    </Button>
  );
}
