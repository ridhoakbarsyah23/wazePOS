"use client";

import { useId, useRef } from "react";
import { X } from "lucide-react";

type PlatformAdminAccountDetailDialogProps = {
  name: string;
  email: string;
  accessLabel: string;
  businessLabel: string;
  roleLabel: string;
  privacyLabel: string;
  updatedLabel: string;
  lastActiveLabel: string;
};

function showDialog(dialog: HTMLDialogElement | null) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
  document.body.style.overflow = "hidden";
}

function hideDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
  document.body.style.overflow = "";
}

export function PlatformAdminAccountDetailDialog({
  name,
  email,
  accessLabel,
  businessLabel,
  roleLabel,
  privacyLabel,
  updatedLabel,
  lastActiveLabel,
}: PlatformAdminAccountDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => showDialog(dialogRef.current)}
        className="w-fit cursor-pointer rounded-md py-2 text-xs font-bold text-[#147554] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198760] dark:text-[#62d6a5] dark:focus-visible:outline-[#62d6a5]"
      >
        Detail akun <span className="sr-only">{email}</span>
      </button>

      <dialog
        ref={dialogRef}
        data-admin-portal
        data-dashboard-portal
        aria-labelledby={titleId}
        onClose={() => {
          document.body.style.overflow = "";
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) hideDialog(event.currentTarget);
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-[#dce7e1] bg-white p-0 text-[#15211d] shadow-2xl backdrop:bg-[#09271d]/60 backdrop:backdrop-blur-sm dark:border-[#303030] dark:bg-[#0d0d0d] dark:text-white"
      >
        <div className="flex max-h-[calc(100dvh-2rem-2px)] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#dce7e1] px-5 py-4 dark:border-[#303030] sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#718078] dark:text-[#a3a3a3]">
                Detail akun
              </p>
              <h2 id={titleId} className="mt-1 break-words text-base font-extrabold">
                {name}
              </h2>
              <p className="mt-0.5 break-all text-xs text-[#627069] dark:text-[#a3a3a3]">{email}</p>
            </div>
            <button
              type="button"
              onClick={() => hideDialog(dialogRef.current)}
              aria-label={`Tutup detail akun ${email}`}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-[#556961] hover:bg-[#f0faf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760] dark:text-[#d4d4d4] dark:hover:bg-[#151515] dark:focus-visible:ring-[#62d6a5]"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <dl className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
            <div>
              <dt className="text-xs text-[#627069] dark:text-[#a3a3a3]">Akses platform</dt>
              <dd className="mt-1 font-semibold">{accessLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#627069] dark:text-[#a3a3a3]">Usaha terkait</dt>
              <dd className="mt-1 break-words font-semibold">{businessLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#627069] dark:text-[#a3a3a3]">Peran di usaha</dt>
              <dd className="mt-1 font-semibold">{roleLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#627069] dark:text-[#a3a3a3]">Persetujuan kebijakan privasi</dt>
              <dd className="mt-1 font-semibold">{privacyLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#627069] dark:text-[#a3a3a3]">Terakhir diperbarui</dt>
              <dd className="mt-1 font-semibold">{updatedLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#627069] dark:text-[#a3a3a3]">Aktivitas terakhir (Login)</dt>
              <dd className="mt-1 font-semibold">{lastActiveLabel}</dd>
            </div>
          </dl>
        </div>
      </dialog>
    </>
  );
}
