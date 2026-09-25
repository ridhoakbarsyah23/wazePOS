"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Settings, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardThemeToggle } from "@/components/dashboard/dashboard-theme-toggle";

type DashboardAccountFooterProps = {
  roleLabel: string;
  userName?: string;
  outletName: string;
  roleIcon: React.ComponentType<{ className?: string }>;
  allowDarkMode: boolean;
  showSettings: boolean;
  onNavigate?: (href: string) => void;
};

export function DashboardAccountFooter({
  roleLabel,
  userName,
  outletName,
  roleIcon: RoleIcon,
  allowDarkMode,
  showSettings,
  onNavigate,
}: DashboardAccountFooterProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <div ref={menuRef} className="relative border-t border-[#edf3f0] bg-[#fafcfb] p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
          <RoleIcon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-xs font-extrabold text-[#15211d]" title={userName ?? roleLabel}>
            {userName ?? roleLabel}
          </p>
          <p className="m-0 mt-0.5 truncate text-[11px] text-[#71857c]" title={`${roleLabel} - ${outletName}`}>
            {roleLabel} - {outletName}
          </p>
        </div>

        <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Buka menu akun"
            aria-haspopup="menu"
            aria-controls={menuOpen ? menuId : undefined}
            aria-expanded={menuOpen}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#dbe5df] bg-white text-[#52645c] transition hover:border-[#9ac3b0] hover:bg-[#eef6f2] hover:text-[#198760] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30"
          >
            <MoreHorizontal className="size-4" />
        </button>
      </div>

      {menuOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Menu akun"
          onKeyDown={handleMenuKeyDown}
          className="absolute inset-x-3.5 bottom-full z-50 mb-2 min-w-0 rounded-2xl border border-[#dbe5df] bg-white p-1.5 shadow-[0_16px_45px_rgba(0,0,0,.24)]"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onNavigate?.("/profile");
            }}
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-xs font-bold text-[#34443d] transition hover:bg-[#eef6f2] hover:text-[#198760]"
          >
            <UserRound className="size-4" />
            <span>Profil akun</span>
          </Link>

          {showSettings && (
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onNavigate?.("/settings");
              }}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-xs font-bold text-[#34443d] transition hover:bg-[#eef6f2] hover:text-[#198760]"
            >
              <Settings className="size-4" />
              <span>Pengaturan</span>
            </Link>
          )}

          {allowDarkMode && (
            <div className="mt-1 flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-[#34443d] transition hover:bg-[#eef6f2]">
              <div className="min-w-0">
                <p className="m-0 text-xs font-bold">Mode tampilan</p>
                <p className="m-0 text-[10px] text-[#82928a]">Gelap atau terang</p>
              </div>
              <DashboardThemeToggle enabled asMenuItem />
            </div>
          )}
        </div>
      )}

      <LogoutButton
        onOpen={() => setMenuOpen(false)}
        className="mt-3 min-h-11 w-full justify-center gap-2 rounded-xl border border-rose-100 bg-white px-3 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
      />
    </div>
  );
}
