"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Crown,
  RotateCw,
  ShoppingCart,
  Store,
} from "lucide-react";
import { DashboardClock } from "@/components/dashboard/dashboard-clock";

export type PeriodKey = "today" | "7d" | "30d";

export function DashboardHeader({
  userName,
  businessName,
  activeOutletName,
  outlets,
  selectedOutletId,
  selectedOutletSlug,
  selectedPeriod,
  trialDaysRemaining,
  currentPlan = "tumbuh",
  showOutletFilter = true,
}: {
  userName: string;
  businessName: string;
  activeOutletName: string;
  outlets: Array<{ id: string; name: string; slug?: string }>;
  selectedOutletId: string;
  selectedOutletSlug?: string;
  selectedPeriod: PeriodKey;
  trialDaysRemaining?: number | null;
  currentPlan?: string;
  showOutletFilter?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navigateFilter(newPeriod: PeriodKey, newOutletId: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", newPeriod);
      if (newOutletId !== "all") {
        params.set("outlet", newOutletId);
      } else {
        params.delete("outlet");
      }
      router.push(`/dashboard?${params.toString()}`);
    });
  }

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  const cashierHref =
    selectedOutletSlug
      ? `/pos/${encodeURIComponent(selectedOutletSlug)}`
      : selectedOutletId !== "all"
        ? `/pos?outlet=${encodeURIComponent(selectedOutletId)}`
      : "/pos";

  return (
    <div className="dash-warung space-y-4 animate-page-enter">
      {/* Buku kas harian: sapaan + status toko */}
      <div className="dash-card relative overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_30px_rgba(16,65,48,.05)] sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#198760]" aria-hidden="true" />

        <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          {/* Sapaan & meta gerai */}
          <div className="min-w-0 space-y-2.5 pl-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="dash-kicker">
                <span className="dash-live-dot" aria-hidden="true" />
                Buku kas harian
              </span>
              <DashboardClock />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-tight text-[#15211d] sm:text-3xl">
                Halo, {userName}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#627069] sm:text-sm">
                <Store className="size-3.5 shrink-0 text-[#198760]" aria-hidden="true" />
                <span className="font-bold text-[#15211d]">{businessName}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedOutletId === "all" ? "Semua gerai" : activeOutletName}</span>
                <span aria-hidden="true">·</span>
                {trialDaysRemaining !== null && trialDaysRemaining !== undefined ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                    <Crown className="size-3.5 text-amber-600" aria-hidden="true" />
                    <span>
                      Trial {currentPlan.toUpperCase()} · sisa {trialDaysRemaining} hari
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                    <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Paket {currentPlan.toUpperCase()} aktif</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Aksi utama kasir */}
          <div className="grid shrink-0 grid-cols-2 gap-2.5 pl-2 sm:flex sm:flex-wrap sm:items-center lg:pl-0">
            <button
              type="button"
              disabled={isPending}
              onClick={handleRefresh}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#dbe5df] bg-white px-3 text-xs font-bold text-[#627069] shadow-xs transition-colors duration-200 hover:border-[#b8d6c7] hover:bg-[#f7faf8] hover:text-[#15211d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30 disabled:cursor-wait disabled:opacity-60 sm:px-4"
              title="Perbarui data terbaru"
            >
              <RotateCw className={`size-3.5 ${isPending ? "animate-spin text-[#198760]" : ""}`} aria-hidden="true" />
              <span>{isPending ? "Memuat..." : "Perbarui"}</span>
            </button>

            <Link
              href={cashierHref}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#198760] px-3 text-xs font-extrabold text-white shadow-[0_4px_16px_rgba(25,135,96,.35)] transition-colors duration-200 hover:bg-[#147554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/40 focus-visible:ring-offset-2 sm:px-5"
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              <span>Buka Kasir POS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter kas: periode + gerai */}
      <div className="dash-card flex flex-col gap-3 rounded-2xl border border-[#dfe8e3] bg-white p-2.5 shadow-xs sm:px-4 md:flex-row md:items-center md:justify-between">
        {/* Periode kas */}
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">Pilih periode laporan</legend>
          <div
            role="radiogroup"
            aria-label="Pilih periode laporan"
            className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-[#dbe5df] bg-[#f8faf9] p-1 [scrollbar-width:none] md:w-auto"
          >
            {(
              [
                { key: "today", label: "Hari ini" },
                { key: "7d", label: "7 hari" },
                { key: "30d", label: "30 hari" },
              ] as const
            ).map((option) => {
              const active = selectedPeriod === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isPending}
                  onClick={() => navigateFilter(option.key, selectedOutletId)}
                  className={`shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30 disabled:cursor-wait disabled:opacity-60 ${
                    active
                      ? "border border-[#cce4d7] bg-white text-[#198760] shadow-xs"
                      : "text-[#627069] hover:bg-white hover:text-[#15211d]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {showOutletFilter && (
          <div className="flex w-full items-center gap-2 md:w-auto">
            <label
              htmlFor="dashboard-outlet-filter"
              className="hidden shrink-0 text-xs font-bold text-[#627069] md:inline"
            >
              Gerai:
            </label>
            <div className="relative min-w-0 flex-1 md:flex-none">
              <select
                id="dashboard-outlet-filter"
                value={selectedOutletId}
                disabled={isPending}
                onChange={(e) => navigateFilter(selectedPeriod, e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-[#dbe5df] bg-[#f8faf9] pl-9 pr-8 text-xs font-bold text-[#15211d] transition-colors duration-200 hover:border-[#198760] focus:border-[#198760] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30 disabled:cursor-wait disabled:opacity-60 md:w-auto"
              >
                <option value="all">Semua gerai</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <Store className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#198760]" aria-hidden="true" />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8b9991]" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
