"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ShieldAlert, CreditCard, Receipt } from "lucide-react";
export type PaymentNotificationCounts = {
  pendingTotal: number;
  pendingReady: number;
};

const POLL_INTERVAL_MS = 120_000;

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

async function fetchCounts(): Promise<PaymentNotificationCounts | null> {
  try {
    const response = await fetch("/api/admin/payments/pending-count", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Partial<PaymentNotificationCounts>;
    return { pendingTotal: toCount(payload.pendingTotal), pendingReady: toCount(payload.pendingReady) };
  } catch {
    return null;
  }
}

/**
 * Bell notifikasi pembayaran di header dashboard admin.
 * Menampilkan badge jumlah pembayaran pending; polling tiap 120 detik
 * (hanya saat tab terlihat) dan refresh saat tab kembali fokus.
 */
export function PlatformAdminPaymentNotificationBell({
  initial,
}: {
  initial?: PaymentNotificationCounts;
}) {
  const [counts, setCounts] = useState<PaymentNotificationCounts>(
    initial ?? { pendingTotal: 0, pendingReady: 0 },
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Hanya fetch saat tab terlihat agar tidak membanjiri API.
      if (document.hidden) return;
      const next = await fetchCounts();
      if (next && !cancelled) setCounts(next);
    };
    void load();
    const interval = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    const onFocus = () => void load();
    const onVisibility = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const pending = toCount(counts.pendingTotal);
  const ready = toCount(counts.pendingReady);
  const label =
    pending > 0
      ? `${pending} pembayaran menunggu verifikasi${ready > 0 ? `, ${ready} di antaranya siap disetujui` : ""}`
      : "Tidak ada pembayaran yang menunggu verifikasi";

  return (
    <div className="relative">
      <button
        onClick={() => setIsModalOpen(!isModalOpen)}
        aria-label={`Notifikasi pembayaran: ${label}`}
        title={label}
        className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-[#dfe8e3] bg-white text-[#527066] transition-colors hover:border-[#9ac3b0] hover:text-[#106348] cursor-pointer dark:border-[#2d3a33] dark:bg-[#1a231f] dark:text-[#a0b0a8] dark:hover:border-[#198760] dark:hover:text-[#9ac3b0]"
      >
        <Bell className="size-4" aria-hidden="true" />
        {pending > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold leading-none text-white"
          >
            {pending > 99 ? "99+" : pending}
          </span>
        )}
        <span aria-live="polite" className="sr-only">
          {label}
        </span>
      </button>

      {isModalOpen && (
        <div className="absolute right-0 top-14 z-50 w-80 rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 dark:border-[#2d3a33] dark:bg-[#15211d]">
          <div className="absolute -top-2 right-4 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white dark:border-[#2d3a33] dark:bg-[#15211d]"></div>
          
          <div className="relative z-10">
            <div className="mb-4 flex flex-row items-center gap-3 text-left">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Receipt className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 m-0 leading-none dark:text-white">
                Notifikasi Pembayaran
              </h3>
            </div>
            
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[#2d3a33] dark:bg-[#1a231f]">
                <div className="flex items-center gap-3">
                  <CreditCard className="size-5 text-slate-500 dark:text-[#a0b0a8]" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Menunggu</span>
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white">{pending}</span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="size-5 text-amber-500 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-500">Siap Verifikasi</span>
                </div>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{ready}</span>
              </div>
            </div>

            <div className="flex flex-row gap-3 w-full">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors dark:border-[#2d3a33] dark:bg-[#1a231f] dark:text-[#a0b0a8] dark:hover:bg-[#25302a] dark:hover:text-white"
              >
                Tutup
              </button>
              <Link
                href="/admin/payments?status=pending"
                onClick={() => setIsModalOpen(false)}
                className="flex flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#198760] py-2.5 text-sm font-bold text-white hover:bg-[#126b4b] shadow-sm transition-colors"
              >
                Lihat Detail
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
