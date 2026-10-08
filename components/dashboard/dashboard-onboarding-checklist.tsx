"use client";

import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function DashboardOnboardingChecklist({
  hasCategories,
  hasProducts,
  hasSales,
  outletSlug,
}: {
  hasCategories: boolean;
  hasProducts: boolean;
  hasSales: boolean;
  outletSlug: string;
}) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || (hasCategories && hasProducts && hasSales)) return null;

  const progress = ((1 + (hasCategories ? 1 : 0) + (hasProducts ? 1 : 0) + (hasSales ? 1 : 0)) / 4) * 100;

  return (
    <div className="mb-6 overflow-hidden rounded-[24px] border border-[#dceae3] bg-gradient-to-br from-[#f2faf5] to-[#f8fcfa] shadow-[0_12px_40px_rgba(10,67,48,.04)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between border-b border-[#e5f1ea] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-black tracking-tight text-[#15211d]">Langkah Memulai wazePOS</h2>
          <p className="mt-0.5 text-xs font-semibold text-[#627069]">Selesaikan langkah berikut agar toko Anda siap beroperasi.</p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="text-right">
            <span className="block text-[11px] font-black text-[#198760]">{Math.round(progress)}% Selesai</span>
          </div>
          <div className="relative flex h-2 w-24 overflow-hidden rounded-full bg-[#dceae3]">
            <div className="absolute h-full rounded-full bg-gradient-to-r from-[#198760] to-[#20a375] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <button onClick={() => setIsVisible(false)} className="ml-2 rounded-full p-1 text-[#9aa69f] hover:bg-[#e5f1ea] hover:text-[#15211d]">
            <X className="size-4" />
          </button>
        </div>
      </div>
      
      <div className="grid gap-px bg-[#e5f1ea] sm:grid-cols-2 xl:grid-cols-4">
        {/* Step 1: Profil (Always Done) */}
        <div className="bg-white p-5 transition-colors sm:px-6">
          <div className="flex items-start gap-3">
            <div className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eaf5ef] text-[#198760]">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#15211d]">1. Profil Usaha</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#627069]">Toko Anda sudah berhasil dibuat dan siap dikonfigurasi.</p>
            </div>
          </div>
        </div>

        {/* Step 2: Tambah Kategori */}
        <div className="bg-white p-5 transition-colors sm:px-6">
          <div className="flex items-start gap-3">
            <div className={`grid size-6 shrink-0 place-items-center rounded-full ${hasCategories ? 'bg-[#eaf5ef] text-[#198760]' : 'bg-[#f0f4f2] text-[#9aa69f]'}`}>
              {hasCategories ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#15211d]">2. Tambah Kategori</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#627069]">Buat kategori menu agar produk mudah dicari dan laporan lebih rapi.</p>
              {!hasCategories && (
                <Link href="/categories" className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#198760] to-[#147554] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(25,135,96,.25)] transition hover:scale-105 hover:from-[#1ba36f] hover:to-[#147554]">
                  Tambah <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Tambah Produk */}
        <div className="bg-white p-5 transition-colors sm:px-6">
          <div className="flex items-start gap-3">
            <div className={`grid size-6 shrink-0 place-items-center rounded-full ${hasProducts ? 'bg-[#eaf5ef] text-[#198760]' : 'bg-[#f0f4f2] text-[#9aa69f]'}`}>
              {hasProducts ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#15211d]">3. Tambah Produk</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#627069]">Masukkan minimal 1 produk dalam kategori agar bisa dijual di kasir.</p>
              {!hasProducts && hasCategories && (
                <Link href="/products?add=1" className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#198760] to-[#147554] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(25,135,96,.25)] transition hover:scale-105 hover:from-[#1ba36f] hover:to-[#147554]">
                  Tambah <ArrowRight className="size-3" />
                </Link>
              )}
              {!hasProducts && !hasCategories && (
                <p className="mt-3.5 text-[10px] font-semibold italic text-[#9aa69f]">
                  (Tambah kategori dulu)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Lakukan Transaksi */}
        <div className="bg-white p-5 transition-colors sm:px-6">
          <div className="flex items-start gap-3">
            <div className={`grid size-6 shrink-0 place-items-center rounded-full ${hasSales ? 'bg-[#eaf5ef] text-[#198760]' : 'bg-[#f0f4f2] text-[#9aa69f]'}`}>
              {hasSales ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#15211d]">4. Transaksi Kasir</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#627069]">Coba lakukan 1 transaksi penjualan pertama Anda.</p>
              {!hasSales && hasProducts && (
                <Link href={`/pos/${outletSlug}`} className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-[#dceae3] bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#15211d] shadow-[0_2px_8px_rgba(0,0,0,.04)] transition hover:border-[#198760] hover:bg-[#f8fcfa]">
                  Buka Kasir <ArrowRight className="size-3" />
                </Link>
              )}
              {!hasSales && !hasProducts && (
                <p className="mt-3.5 text-[10px] font-semibold italic text-[#9aa69f]">
                  (Tambah produk dulu)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
