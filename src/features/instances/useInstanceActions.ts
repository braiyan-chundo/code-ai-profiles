import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import type { CreateInstanceRequest, ManagedInstance } from "../../types";
import { useDashboard } from "../dashboard";
import type { InstanceIconChange } from "./instance-types";

/**
 * Las operaciones sobre instancias. Se crean en cada render y leen el estado de ese render, como antes.
 * Las que cierran un diálogo reciben `close` y lo llaman en el mismo punto que antes.
 */
export function useInstanceActions() {
  const {
    dashboard: state,
    busyRef,
    runAction,
    setBusy,
    setError,
    replaceDashboard,
    storeIconPreview,
    removeIconPreview,
  } = useDashboard();

  /**
   * Abrir y detener, desde la página de la instancia, el sidebar o el dashboard (HU-0026, A-2). `busyRef` corta un
   * doble clic que llega antes de que el `disabled` esté en el DOM; el error nombra la instancia.
   */
  const launch = (instance: ManagedInstance) => {
    if (busyRef.current !== null) return;
    void runAction(`launch:${instance.id}`, () => bridge.launch(instance.id), { errorTitle: `No se pudo abrir ${instance.name}` });
  };
  const stop = (instance: ManagedInstance) => {
    if (busyRef.current !== null) return;
    void runAction(`stop:${instance.id}`, () => bridge.stop(instance.id), { errorTitle: `No se pudo detener ${instance.name}` });
  };
  /**
   * Reaplica el icono al Dock con la instancia detenida (HU-0020, A-5); el panel se actualiza con el estado devuelto.
   * Como `runAction`, pero devuelve el error de este intento (o `null`) para que el editor muestre solo ese.
   */
  const reapplyIcon = async (instance: ManagedInstance): Promise<string | null> => {
    setBusy(`icon:${instance.id}`);
    setError(null);
    try {
      replaceDashboard(await bridge.reapplyInstanceIcon(instance.id));
      return null;
    } catch (reason) {
      const message = friendlyError(reason);
      setError(message);
      return message;
    } finally {
      setBusy(null);
    }
  };
  const openFolder = (instance: ManagedInstance) => void bridge.openFolder(instance.id).catch((reason) => setError(friendlyError(reason)));

  const save = async (
    editor: ManagedInstance | "new",
    form: CreateInstanceRequest,
    iconChange: InstanceIconChange,
    close: () => void,
  ) => {
    const isNew = editor === "new";
    setBusy(isNew ? "create" : "update");
    setError(null);
    try {
      let next = isNew
        ? await bridge.create(form)
        : await bridge.update({ ...form, id: editor.id });
      const previousIds = new Set(state.instances.map((instance) => instance.id));
      const changedInstance = isNew
        ? next.instances.find((instance) => !previousIds.has(instance.id))
        : next.instances.find((instance) => instance.id === editor.id);
      if (changedInstance && iconChange.remove && changedInstance.customIcon) {
        next = await bridge.clearInstanceIcon(changedInstance.id);
        removeIconPreview(changedInstance.id);
      }
      if (changedInstance && iconChange.bytes) {
        next = await bridge.setInstanceIcon(changedInstance.id, iconChange.bytes);
        if (iconChange.previewUrl) {
          storeIconPreview(changedInstance.id, iconChange.previewUrl!);
        }
      }
      replaceDashboard(next);
      close();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (instance: ManagedInstance, close: () => void) => {
    await runAction(`delete:${instance.id}`, () => bridge.remove(instance.id));
    close();
  };

  return { launch, stop, reapplyIcon, openFolder, save, remove };
}
