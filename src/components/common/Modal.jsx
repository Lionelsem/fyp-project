import React, { useEffect, useId, useRef } from "react";

const FOCUSABLE_ELEMENTS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const Modal = ({
  title,
  children,
  onClose,
  ariaLabel,
  className = "",
  bodyClassName = "",
  closeLabel = "Close dialog",
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedElement = useRef(null);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const firstFocusableElement = dialog?.querySelector(FOCUSABLE_ELEMENTS);
    (firstFocusableElement || dialog)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll(FOCUSABLE_ELEMENTS)
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocusedElement.current?.focus?.();
    };
  }, [closeOnEscape]);

  const handleBackdropClick = (event) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const modalClassName = ["modal", className].filter(Boolean).join(" ");
  const modalBodyClassName = ["modal-body", bodyClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel || "Dialog" : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          {title && <h2 id={titleId}>{title}</h2>}
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className={modalBodyClassName}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
