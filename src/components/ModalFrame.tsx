import type { ReactNode } from "react";
import { XIcon } from "./Icons";

export function ModalFrame({
  title,
  subtitle,
  onClose,
  closeDisabled = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="modal-close" onClick={onClose} disabled={closeDisabled} aria-label="Cerrar"><XIcon size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
