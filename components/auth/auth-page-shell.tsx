import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
  children: ReactNode;
};

export function AuthPageShell({
  eyebrow,
  title,
  description,
  footerText,
  footerLinkLabel,
  footerHref,
  children,
}: AuthPageShellProps) {
  return (
    <main className="auth-responsive-page relative isolate min-h-dvh overflow-x-hidden bg-[#f2f8f5] px-3 py-3 text-[#15211d] min-[380px]:px-4 min-[380px]:py-5 sm:px-6 sm:py-8 lg:grid lg:place-items-center">
      <div aria-hidden="true" className="absolute -left-24 -top-24 -z-10 size-72 rounded-full bg-[#8ee0b6]/25 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 -z-10 size-80 rounded-full bg-[#198760]/12 blur-3xl" />

      <section className="auth-responsive-shell mx-auto grid min-w-0 w-full max-w-[1040px] overflow-hidden rounded-[20px] border border-[#d9e7e0] bg-white shadow-[0_28px_80px_rgba(15,74,53,.13)] min-[380px]:rounded-[24px] lg:grid-cols-[0.88fr_1.12fr] lg:rounded-[32px]">
        <aside className="auth-responsive-aside relative hidden min-h-[720px] overflow-hidden bg-[linear-gradient(150deg,#073d2f_0%,#106348_58%,#198760_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div aria-hidden="true" className="absolute -right-24 -top-16 size-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-28 -left-20 size-72 rounded-full bg-white/6" />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:34px_34px]" />

          <Link href="/#beranda" className="relative inline-flex w-fit items-center gap-3 text-2xl font-extrabold tracking-[-1px] text-white">
            <span className="relative size-10 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-black/10">
              <Image src="/logo.png" alt="" fill sizes="40px" className="object-cover" priority />
            </span>
            <span>waze<span className="text-[#9ce4bf]">POS</span></span>
          </Link>

          <div className="relative max-w-[330px]">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#bdebd3]">
              Sistem kasir untuk UMKM
            </span>
            <h2 className="mb-4 mt-5 text-[36px] font-extrabold leading-[1.08] tracking-[-1.8px] text-white">
              Operasional lebih rapi, keputusan lebih pasti.
            </h2>
            <p className="m-0 text-sm leading-7 text-[#cce5da]">
              Kelola transaksi, stok, dan laporan usaha melalui satu ruang kerja yang sederhana.
            </p>

            <div className="mt-8 grid gap-3">
              {["Transaksi tercatat otomatis", "Stok lebih mudah dipantau", "Laporan siap ditinjau"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-xs font-bold text-[#e3f4ec]">
                  <span className="grid size-6 place-items-center rounded-full bg-white/12 text-[#a9e6c9]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="relative m-0 text-[11px] font-semibold tracking-wide text-[#a9cdbd]">
            Penjualan / Inventori / Laporan
          </p>
        </aside>

        <div className="auth-responsive-content min-w-0 p-4 min-[380px]:p-5 sm:p-9 lg:p-11 xl:px-14 xl:py-12">
          <div className="flex items-center justify-between gap-4">
            <Link href="/#beranda" aria-label="Kembali ke beranda" className="grid size-10 place-items-center rounded-xl border border-[#dce7e1] bg-white text-[#607068] transition hover:border-[#9fcbb5] hover:bg-[#f1f8f4] hover:text-[#147554] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
            <Link href="/#beranda" className="auth-responsive-mobile-brand inline-flex items-center gap-2 text-xl font-extrabold tracking-[-.8px] text-[#15211d] lg:hidden">
              <span className="relative size-8 overflow-hidden rounded-lg">
                <Image src="/logo.png" alt="" fill sizes="32px" className="object-cover" />
              </span>
              waze<span className="text-[#198760]">POS</span>
            </Link>
          </div>

          <header className="mt-7 lg:mt-8">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#198760]">{eyebrow}</span>
            <h1 className="mb-2.5 mt-2.5 text-[27px] font-extrabold leading-tight tracking-[-1.3px] text-[#14231d] min-[380px]:text-[30px] sm:text-[34px]">{title}</h1>
            <p className="m-0 max-w-md text-sm leading-6 text-[#66756e]">{description}</p>
          </header>

          {children}

          <p className="mb-0 mt-6 border-t border-[#e7ede9] pt-5 text-center text-xs leading-5 text-[#6a7770] sm:text-sm">
            {footerText}{" "}
            <Link href={footerHref} className="font-extrabold text-[#147554] underline decoration-[#9bcab2] underline-offset-4 transition hover:text-[#0d5e42]">
              {footerLinkLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
