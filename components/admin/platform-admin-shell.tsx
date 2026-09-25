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
      className="min-h-dvh overflow-x-hidden bg-[#f3f7f5] text-[#15211d] focus:outline-none"
    >
      <a href="#admin-content" className="skip-link">
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30 border-b border-[#dfe8e3] bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex min-h-16 w-[min(1440px,calc(100%-24px))] items-center justify-between gap-3 sm:w-[min(1440px,calc(100%-40px))] sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/admin" className="flex shrink-0 items-center" aria-label="Platform Admin wazePOS">
              <Image src="/logo.png" alt="wazePOS" width={108} height={32} className="h-6 w-auto sm:h-7" priority />
            </Link>
            <span className="hidden h-7 w-px bg-[#dfe8e3] sm:block" />
            <div className="hidden min-w-0 min-[360px]:block">
              <p className="m-0 text-xs font-extrabold text-[#106348]">Platform Admin</p>
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
        <div className="mx-auto w-[min(1440px,calc(100%-24px))] pb-3 sm:w-[min(1440px,calc(100%-40px))]">
          <PlatformAdminNav />
        </div>
      </header>

      <div className="mx-auto w-[min(1440px,calc(100%-24px))] pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[min(1440px,calc(100%-40px))] sm:pt-8 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pt-10 lg:pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </main>
  );
}
