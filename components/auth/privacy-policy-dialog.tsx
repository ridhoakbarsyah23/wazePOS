"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { PrivacyPolicyContent } from "@/components/shared/privacy-policy-content";

export function PrivacyPolicyDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="register-privacy-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
          event.currentTarget.close();
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-[#dce7e1] bg-white p-0 text-[#15211d] shadow-2xl backdrop:bg-[#09271d]/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[calc(100dvh-2rem-2px)] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#dce7e1] px-5 py-4 sm:px-6">
          <h2 id="register-privacy-title" className="text-lg font-extrabold">Kebijakan Privasi</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup kebijakan privasi"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-[#556961] hover:bg-[#f0faf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
          <PrivacyPolicyContent />
        </div>
      </div>
    </dialog>
  );
}
