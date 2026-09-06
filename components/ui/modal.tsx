"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-full max-w-lg border border-line bg-white p-0 text-ink backdrop:bg-ink/30"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-serif text-xl font-light">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink">
          ✕
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
