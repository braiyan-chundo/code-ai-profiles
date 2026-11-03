import { ImageUpIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FieldError } from "../../components/ui/field";
import { Spinner } from "../../components/ui/spinner";
import { iconDimensionsError, iconFileError } from "../../lib/icon-validation";
import { ProjectInitial } from "./ProjectInitial";
import { projectIconSource } from "./project-icon";
import { projectName, type ReadableProject } from "./projects-selectors";
import { useProjects } from "./useProjects";

/**
 * «Icono del proyecto» (HU-0027, AC-02 y AC-03): elegir una imagen PNG o JPEG, ver cómo queda y guardarla, o quitar la
 * que hay. La imagen se valida aquí (tipo, peso y dimensiones, con los textos de las instancias) y otra vez en Rust, que
 * la normaliza y la guarda en los datos de la app; la carpeta del proyecto no se toca. Mientras guarda, Escape, la X y
 * el clic fuera no cierran (`saving`). Con éxito se cierra solo.
 */
export function ProjectIconDialog({ project, onClose }: { project: ReadableProject; onClose: () => void }) {
  const { setIcon, clearIcon } = useProjects();
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const name = projectName(project);
  const current = projectIconSource(project);
  const dirty = bytes !== null || (remove && project.icon !== null);

  // Cada selección lleva un número: si llega otra antes de que termine la anterior, gana la última (O-3).
  const selection = useRef(0);
  // La vista previa es un `data:` de memoria; no hay URL que revocar, pero al cerrar se descarta cualquier resultado en vuelo.
  useEffect(() => () => { selection.current += 1; }, []);

  const select = async (file: File | null) => {
    const ticket = ++selection.current;
    setError(null);
    if (!file) return;
    // Un error de selección deshace la selección válida anterior: la vista previa vuelve al estado guardado y «Guardar» se
    // desactiva (R-1, AC-03). `remove` se deja como estaba.
    const discard = (message: string) => {
      setBytes(null);
      setPreviewUrl(null);
      setError(message);
    };
    const fileError = iconFileError(file);
    if (fileError) {
      discard(fileError);
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const dimensionsError = iconDimensionsError(bitmap.width, bitmap.height);
      bitmap.close();
      if (ticket !== selection.current) return;
      if (dimensionsError) {
        discard(dimensionsError);
        return;
      }
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Vista previa no disponible"));
        reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
      });
      const data = new Uint8Array(await file.arrayBuffer());
      if (ticket !== selection.current) return;
      setBytes(data);
      setPreviewUrl(preview);
      setRemove(false);
    } catch {
      if (ticket !== selection.current) return;
      discard("No se pudo decodificar la imagen seleccionada.");
    }
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    const failure = bytes ? await setIcon(project.id, bytes) : await clearIcon(project.id);
    if (failure) {
      setSaving(false);
      setError(failure);
      return;
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent aria-busy={saving} closeDisabled={saving}>
        <DialogHeader>
          <DialogTitle>Icono del proyecto</DialogTitle>
          <DialogDescription>{name}</DialogDescription>
        </DialogHeader>

        <section
          aria-label="Imagen del icono"
          className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-sm ring-1 ring-border ring-inset bg-(--surface-soft) p-4"
        >
          <ProjectInitial name={name} size="dialog" iconSrc={previewUrl ?? (remove ? null : current)} />
          <div className="grid min-w-0 gap-2">
            <span className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">
              Se guarda en los datos de Code AI Profiles; el proyecto no se modifica.
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" aria-disabled={saving} className="cursor-pointer text-xs has-[:focus-visible]:border-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-50">
                <label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      event.currentTarget.value = "";
                      void select(file);
                    }}
                    disabled={saving}
                  />
                  <ImageUpIcon />
                  {previewUrl || project.icon ? "Reemplazar imagen" : "Seleccionar imagen"}
                </label>
              </Button>
              {(previewUrl || project.icon) && !remove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    selection.current += 1;
                    setBytes(null);
                    setPreviewUrl(null);
                    setRemove(true);
                    setError(null);
                  }}
                >
                  Quitar
                </Button>
              )}
            </div>
            {error && <FieldError className="text-(length:--fs-small)/(--lh-small)">{error}</FieldError>}
          </div>
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" size="lg" className="min-w-36" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? <><Spinner aria-hidden="true" /> Guardando…</> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
