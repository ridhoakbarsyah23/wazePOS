import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { PlatformAdminNav } from "@/components/admin/platform-admin-nav";
import { PlatformAdminThemeToggle } from "@/components/admin/platform-admin-theme";

export function PlatformAdminShell({
  adminEmail,
  children,
}: {
  adminEmail?: string | null;
  children: ReactNode;
}) {
  return (
    <main
      id="admin-content"
      tabIndex={-1}
      className="min-h-dvh w-full max-w-full overflow-x-clip bg-[#f3f7f5] text-[#15211d] focus:outline-none"
    >
      <a href="#admin-content" className="skip-link">
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30 border-b border-[#dfe8e3] bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full min-w-0 max-w-[1440px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link href="/admin" className="flex min-w-0 shrink-0 items-center" aria-label="Platform Admin wazePOS">
              <Image src="/logo.png" alt="wazePOS" width={108} height={32} className="h-6 w-auto max-w-full sm:h-7" priority />
            </Link>
            <span className="hidden h-7 w-px shrink-0 bg-[#dfe8e3] sm:block" />
            <div className="hidden min-w-0 min-[360px]:block">
              <p className="m-0 truncate text-xs font-extrabold text-[#106348]">Platform Admin</p>
              {adminEmail && (
                <p className="m-0 hidden max-w-48 truncate text-[11px] text-[#627069] min-[480px]:block">
                  {adminEmail}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <PlatformAdminThemeToggle />
            <LogoutButton
              compact
              className="h-10 gap-2 rounded-xl px-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 sm:h-9 sm:px-3"
            />
          </div>
        </div>
        <div className="mx-auto w-full min-w-0 max-w-[1440px] px-3 pb-3 sm:px-5 lg:px-6">
          <PlatformAdminNav />
        </div>
      </header>

      <div className="mx-auto w-full min-w-0 max-w-[1440px] px-3 pt-5 pb-6 sm:px-5 sm:pt-8 lg:px-6 lg:pt-10">
        {children}
      </div>

      <footer className="border-t border-[#dfe8e3] bg-white/60">
        <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col items-center justify-between gap-1.5 px-3 py-4 text-xs text-[#75857e] sm:flex-row sm:px-5 lg:px-6">
          <p className="m-0 flex flex-wrap items-center justify-center gap-1.5">
            <span className="font-black tracking-tight text-[#15211d]">
              waze<span className="text-[#198760]">POS</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Platform Admin</span>
            <span aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()}</span>
          </p>
          <nav aria-label="Navigasi footer admin" className="flex flex-wrap items-center justify-center gap-1 font-semibold">
            <Link
              href="/admin"
              className="rounded-lg px-2 py-1 text-[#556961] transition-colors hover:bg-[#eaf7f0] hover:text-[#198760]"
            >
              Ringkasan
            </Link>
            <Link
              href="/privacy"
              className="rounded-lg px-2 py-1 text-[#556961] transition-colors hover:bg-[#eaf7f0] hover:text-[#198760]"
            >
              Privasi
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
