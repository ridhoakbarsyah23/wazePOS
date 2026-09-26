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

      <div className="mx-auto w-full min-w-0 max-w-[1440px] px-3 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-5 sm:pt-8 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:px-6 lg:pt-10 lg:pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </main>
  );
}
