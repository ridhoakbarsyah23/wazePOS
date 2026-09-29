import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyPolicyContent } from "@/components/shared/privacy-policy-content";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — wazePOS",
  description:
    "Kebijakan privasi wazePOS: data yang dikumpulkan, cara penggunaan, penyimpanan, keamanan, dan hak pengguna.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#f7fcf9] text-[#15211d]">
      <div className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce7e1] bg-white px-3 text-xs font-extrabold text-[#147554] transition hover:border-[#9fcbb5] hover:bg-[#f1f8f4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20"
        >
          <span aria-hidden="true">←</span> Kembali ke beranda
        </Link>

        <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#198760]">
          Kebijakan Privasi
        </p>
        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Pengelolaan dan Perlindungan Data Anda
        </h1>
        <PrivacyPolicyContent />

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#dceae3] pt-5 text-xs text-[#75857e]">
          <span>
            <span className="font-black tracking-tight text-[#15211d]">
              waze<span className="text-[#198760]">POS</span>
            </span>{" "}
            · © {new Date().getFullYear()}
          </span>
          <span className="flex flex-wrap items-center gap-3 font-semibold">
            <Link href="/" className="underline underline-offset-4 hover:text-[#147554]">
              Beranda
            </Link>
            <Link href="/login" className="underline underline-offset-4 hover:text-[#147554]">
              Masuk
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
