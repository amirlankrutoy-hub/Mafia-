import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open = true, onClose, children, className = "", z = "z-[700]" }) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  // Портал в body: fixed-позиционирование не ломается внутри карточек с backdrop-filter
  return createPortal(
    <div className={`fixed inset-0 ${z} flex items-center justify-center p-4`} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md anim-fade-in" onClick={onClose} />
      <div className={`noir-card deco-corners relative w-full max-w-md p-6 sm:p-8 anim-scale-in ${className}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
