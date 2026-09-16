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
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#f2f8f5] px-4 py-8 text-[#15211d] sm:px-6">
      <div aria-hidden="true" className="absolute -left-24 -top-24 size-64 rounded-full bg-[#8ee0b6]/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-28 -right-20 size-72 rounded-full bg-[#198760]/10 blur-3xl" />

      <section className="relative w-full max-w-[480px] rounded-[24px] border border-[#deebe4] bg-white p-6 shadow-[0_22px_65px_rgba(16,79,57,.11)] sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <Link href="/#beranda" aria-label="Kembali ke beranda" className="grid size-10 place-items-center rounded-xl border border-[#e0e9e4] text-[#607068] transition hover:border-[#b8d5c6] hover:bg-[#f1f8f4] hover:text-[#147554] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <Link href="/#beranda" className="inline-flex items-center text-xl font-extrabold tracking-[-.8px] text-[#15211d]">
            waze<span className="text-[#198760]">POS</span>
          </Link>
        </div>

        <header className="mt-8">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#198760]">{eyebrow}</span>
          <h1 className="mb-2 mt-2 text-[30px] font-extrabold tracking-[-1.3px] sm:text-[34px]">{title}</h1>
          <p className="m-0 text-sm leading-6 text-[#6a7770]">{description}</p>
        </header>

        {children}

        <p className="mb-0 mt-6 border-t border-[#e7ede9] pt-5 text-center text-sm text-[#6a7770]">
          {footerText}{" "}
          <Link href={footerHref} className="font-extrabold text-[#147554] underline decoration-[#9bcab2] underline-offset-4 transition hover:text-[#0d5e42]">
            {footerLinkLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
