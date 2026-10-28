import type { ReactNode } from "react";
import { AlertIcon } from "./Icons";
import { ModalFrame } from "./ModalFrame";

export function ConfirmDialog({
  title,
  confirmLabel,
  busy,
  busyLabel = "Eliminando…",
  tone = "danger",
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  confirmLabel: string;
  busy: boolean;
  busyLabel?: string;
  tone?: "danger" | "neutral";
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <ModalFrame title={title} onClose={busy ? () => undefined : onCancel}>
      <div className="confirm-content">
        <div className="confirm-warning"><AlertIcon size={23} /></div>
        <p>{children}</p>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className={tone === "danger" ? "destructive-button" : "primary-action modal-primary"} onClick={() => void onConfirm()} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </ModalFrame>
  );
}
