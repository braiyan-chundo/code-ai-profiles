import { useState, type FormEvent } from "react";
import type { CreateInstanceRequest, DashboardState, ManagedInstance } from "../../types";
import { ChevronDownIcon, HardDriveIcon, ImageUpIcon, InfoIcon, PlusIcon } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Field, FieldError, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";
import { cn } from "../../lib/utils";
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
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent aria-busy={busy} closeDisabled={busy}>
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
              <span className="text-[11px] leading-snug text-muted-foreground">
                Se guarda fuera de la aplicación compatible para sobrevivir a futuras sincronizaciones.
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" aria-disabled={busy} className="cursor-pointer text-xs has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
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
                      disabled={busy}
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
                    disabled={busy}
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
              {iconError && <FieldError className="text-[11px]">{iconError}</FieldError>}
            </div>
          </section>

          <Alert className="border-primary/15 bg-primary/5 text-primary-text">
            <InfoIcon />
            <AlertDescription className="text-[11px] leading-relaxed">
              {platform === "macos"
                ? "Al guardar, Code AI Profiles intentará aplicar el icono al Dock y verificará la copia administrada. El resultado aparecerá aquí cuando termine."
                : platform === "windows"
                  ? "En Windows el ejecutable conserva su icono oficial; la imagen personalizada identifica la instancia dentro de Code AI Profiles."
                  : "En Linux se intenta aplicar el icono al launcher; Wayland o el compositor pueden conservar el icono oficial."}
            </AlertDescription>
          </Alert>
          {instance?.customIcon && !removeIcon && (
            <p
              data-applied={instance.customIcon.systemApplied}
              className="-mt-2 px-0.5 font-mono text-[10px] leading-snug text-muted-foreground data-[applied=true]:text-success"
            >
              {platform === "macos" && (
                <strong>{instance.customIcon.systemApplied ? "Dock aplicado. " : "No se aplicó al Dock. "}</strong>
              )}
              {instance.customIcon.systemMessage}
            </p>
          )}

          {isNew && (
            <>
              <Alert className="border-primary/15 bg-primary/5 text-primary-text">
                <HardDriveIcon />
                <AlertTitle className="text-xs text-foreground">Copia aislada + perfil independiente</AlertTitle>
                <AlertDescription className="text-[11px] leading-relaxed">
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
            <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={busy}>Cancelar</Button>
            <Button type="submit" size="lg" className="min-w-36" disabled={busy || !name.trim()}>
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
