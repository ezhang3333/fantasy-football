import { useId } from "react";
import type { ReactNode } from "react";
import "./css/ModalDialog.css";

interface ModalDialogProps {
  open: boolean;
  title?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
}

export default function ModalDialog({
  open,
  title,
  children,
  className = "",
}: ModalDialogProps) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  const panelClassName = `modal-dialog${className ? ` ${className}` : ""}`;

  return (
    <div className="modal-dialog-overlay" role="presentation">
      <div
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-dialog-header">
          <h2 id={titleId} className="modal-dialog-title">
            {title}
          </h2>
        </div>
        <div className="modal-dialog-content">{children}</div>
      </div>
    </div>
  );
}
