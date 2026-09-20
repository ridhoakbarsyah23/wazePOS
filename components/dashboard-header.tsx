"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Crown,
  RotateCw,
  ShoppingCart,
  Store,
} from "lucide-react";

export type PeriodKey = "today" | "7d" | "30d";

export function DashboardHeader({
  userName,
  businessName,
  activeOutletName,
  outlets,
  selectedOutletId,
  selectedPeriod,
  trialDaysRemaining,
  currentPlan = "tumbuh",
}: {
  userName: string;
  businessName: string;
  activeOutletName: string;
  outlets: Array<{ id: string; name: string }>;
  selectedOutletId: string;
  selectedPeriod: PeriodKey;
  trialDaysRemaining?: number | null;
  currentPlan?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

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
    selectedOutletId !== "all"
      ? `/pos?outlet=${encodeURIComponent(selectedOutletId)}`
      : "/pos";

  return (
    <div className="space-y-4 animate-page-enter">
      {/* Top Cockpit Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#dfe8e3] bg-gradient-to-br from-white via-[#fbfdfc] to-[#f2faf6] p-6 sm:p-7 shadow-[0_8px_30px_rgba(16,65,48,.05)]">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 size-48 rounded-full bg-teal-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          {/* Greeting & Store Meta */}
          <div className="space-y-2">
            {/* Meta Tags Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-xs font-bold text-emerald-800">
                <Store className="size-3.5 text-emerald-600" />
                <span>{businessName}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe5df] bg-white px-3 py-1 text-xs font-medium text-[#627069]">
                <Calendar className="size-3.5 text-[#8b9991]" />
                <span>{todayFormatted}</span>
              </span>

              {trialDaysRemaining !== null && trialDaysRemaining !== undefined ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
                  <Crown className="size-3.5 text-amber-600" />
                  <span>Paket {currentPlan.toUpperCase()} · Trial {trialDaysRemaining} hari</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Paket {currentPlan.toUpperCase()} Aktif</span>
                </span>
              )}
            </div>

            {/* Main Greeting */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#15211d]">
                Halo, {userName} <span className="inline-block animate-wave">👋</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#627069]">
                Ringkasan performa penjualan dan operasional gerai Anda di{" "}
                <strong className="text-[#15211d] font-bold">
                  {selectedOutletId === "all" ? "Semua Gerai Usaha" : activeOutletName}
                </strong>.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={handleRefresh}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dbe5df] bg-white px-4 text-xs font-bold text-[#627069] shadow-xs transition hover:bg-[#f7faf8] hover:text-[#15211d] hover:border-[#b8d6c7] active:scale-95 disabled:opacity-60"
              title="Perbarui data terbaru"
            >
              <RotateCw className={`size-3.5 ${isPending ? "animate-spin text-[#198760]" : ""}`} />
              <span>{isPending ? "Memuat..." : "Perbarui"}</span>
            </button>

            <Link
              href={cashierHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#198760] to-[#147554] px-5 text-xs font-extrabold text-white shadow-[0_4px_16px_rgba(25,135,96,.35)] transition-all hover:shadow-[0_6px_22px_rgba(25,135,96,.45)] hover:scale-[1.02] active:scale-95"
            >
              <ShoppingCart className="size-4" />
              <span>Buka Kasir POS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Reactive Filter Toolbar (No 'Terapkan' button needed!) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe8e3] bg-white p-2.5 sm:px-4 shadow-xs">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-[#dbe5df] bg-[#f8faf9] p-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => navigateFilter("today", selectedOutletId)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedPeriod === "today"
                ? "bg-white text-[#198760] shadow-xs border border-[#cce4d7]"
                : "text-[#627069] hover:text-[#15211d]"
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => navigateFilter("7d", selectedOutletId)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedPeriod === "7d"
                ? "bg-white text-[#198760] shadow-xs border border-[#cce4d7]"
                : "text-[#627069] hover:text-[#15211d]"
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => navigateFilter("30d", selectedOutletId)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedPeriod === "30d"
                ? "bg-white text-[#198760] shadow-xs border border-[#cce4d7]"
                : "text-[#627069] hover:text-[#15211d]"
            }`}
          >
            30 Hari Terakhir
          </button>
        </div>

        {/* Outlet Switcher (Immediate on-change) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#627069] hidden md:inline">
            Pilih Gerai:
          </span>
          <div className="relative">
            <select
              value={selectedOutletId}
              disabled={isPending}
              onChange={(e) => navigateFilter(selectedPeriod, e.target.value)}
              className="h-10 appearance-none rounded-xl border border-[#dbe5df] bg-[#f8faf9] pl-9 pr-8 text-xs font-bold text-[#15211d] transition hover:border-[#198760] focus:border-[#198760] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#198760]/20 cursor-pointer disabled:opacity-60"
            >
              <option value="all">Semua Gerai Usaha</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <Store className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#198760]" />
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#8b9991]" />
          </div>
        </div>
      </div>
    </div>
  );
}
