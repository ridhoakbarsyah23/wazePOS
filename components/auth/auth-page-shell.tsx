import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

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
    <main className="auth-responsive-page auth-pro-max relative isolate flex min-h-dvh flex-col items-center overflow-x-clip bg-[#eef5f1] px-3 py-6 text-[#15211d] min-[380px]:px-4 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="absolute -left-24 -top-24 -z-10 size-72 rounded-full bg-[#8ee0b6]/30 blur-3xl motion-reduce:hidden" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 -z-10 size-80 rounded-full bg-[#198760]/15 blur-3xl motion-reduce:hidden" />

      <section className="auth-responsive-shell auth-pro-max-card m-auto grid w-full min-w-0 max-w-[480px] overflow-hidden rounded-[20px] border border-[#d9e7e0] bg-white shadow-[0_28px_80px_rgba(15,74,53,.13)] min-[380px]:max-w-[520px] min-[380px]:rounded-[24px] lg:max-w-[1040px] lg:grid-cols-[0.9fr_1.1fr] lg:rounded-[32px]">
        <aside className="auth-responsive-aside relative hidden min-w-0 overflow-hidden bg-[linear-gradient(150deg,#073d2f_0%,#106348_58%,#198760_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between lg:gap-10 xl:p-12">
          <div aria-hidden="true" className="absolute -right-24 -top-16 size-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-28 -left-20 size-72 rounded-full bg-white/6" />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:34px_34px]" />

          <Link href="/#beranda" className="relative inline-flex w-fit min-w-0 items-center gap-3 text-2xl font-extrabold tracking-[-1px] text-white">
            <Image src="/logo.png" alt="" width={40} height={40} sizes="40px" className="size-10 shrink-0 rounded-[11px] object-contain shadow-lg shadow-black/10" priority />
            <span className="auth-brand">waze<span className="text-[#9ce4bf]">POS</span></span>
          </Link>

          <div className="relative max-w-[330px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#bdebd3]">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Sistem kasir untuk UMKM
            </span>
            <h2 className="auth-display mb-4 mt-5 text-[36px] font-normal leading-[1.08] tracking-[-0.5px] text-white">
              Operasional lebih rapi, keputusan lebih pasti.
            </h2>
            <p className="m-0 text-sm leading-7 text-[#cce5da]">
              Kelola transaksi, stok, dan laporan usaha melalui satu ruang kerja yang sederhana.
            </p>

            <div className="mt-8 grid gap-3">
              {["Transaksi tercatat otomatis", "Stok lebih mudah dipantau", "Laporan siap ditinjau"].map((item) => (
                <div key={item} className="auth-check flex items-center gap-3 text-xs font-bold text-[#e3f4ec]">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/12 text-[#a9e6c9]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="auth-mono relative m-0 text-[11px] font-semibold tracking-wide text-[#a9cdbd]">
            Penjualan / Inventori / Laporan
          </p>
        </aside>

        <div className="auth-responsive-content mx-auto w-full min-w-0 max-w-[520px] p-5 min-[380px]:p-6 sm:p-8 lg:mx-0 lg:max-w-none lg:p-10">
          <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 lg:flex lg:justify-start">
            <Link href="/#beranda" aria-label="Kembali ke beranda" className="auth-pro-max-back grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-[#dce7e1] bg-white text-[#607068] transition duration-200 hover:-translate-y-px hover:border-[#9fcbb5] hover:bg-[#f1f8f4] hover:text-[#147554] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15 motion-reduce:transform-none">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
            <Link href="/#beranda" className="auth-responsive-mobile-brand flex min-w-0 items-center justify-center gap-2 text-xl font-extrabold tracking-[-.8px] text-[#15211d] lg:hidden">
              <Image src="/logo.png" alt="" width={32} height={32} sizes="32px" className="size-8 shrink-0 rounded-lg object-contain" />
              <span className="truncate">waze<span className="text-[#198760]">POS</span></span>
            </Link>
            <span aria-hidden="true" className="size-10 shrink-0 lg:hidden" />
          </div>

          <header className="mt-6 min-w-0">
            <span className="auth-kicker inline-flex min-w-0 items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#198760] min-[380px]:tracking-[0.14em]">
              <span className="auth-kicker-dot" aria-hidden="true" />
              <span className="min-w-0">{eyebrow}</span>
            </span>
            <h1 className="auth-display mb-2.5 mt-2.5 min-w-0 text-balance text-[26px] font-normal leading-tight tracking-[-0.5px] text-[#14231d] min-[380px]:text-[28px] sm:text-[30px] lg:text-[32px]">{title}</h1>
            <p className="m-0 min-w-0 max-w-md text-pretty text-sm leading-6 text-[#66756e]">{description}</p>
          </header>

          {children}

          <p className="mb-0 mt-5 min-w-0 border-t border-[#e7ede9] pt-5 text-center text-xs leading-5 text-[#6a7770] sm:mt-6 sm:text-sm">
            {footerText}{" "}
            <Link href={footerHref} className="font-extrabold text-[#147554] underline decoration-[#9bcab2] underline-offset-4 transition duration-200 hover:text-[#0d5e42]">
              {footerLinkLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
