"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Crown,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

type AppHeaderProps = {
  businessName: string;
  outletName?: string;
  outlets?: { id: string; name: string }[];
  activeOutletId?: string;
  role?: "owner" | "admin" | "cashier";
  trialDaysRemaining?: number | null;
};

export function AppHeader({
  businessName,
  outletName,
  outlets = [],
  activeOutletId,
  role = "owner",
  trialDaysRemaining,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setNavigatingTo(null);
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["owner", "admin"],
    },
    {
      href: "/pos",
      label: "Kasir",
      icon: ShoppingCart,
      roles: ["owner", "admin", "cashier"],
    },
    {
      href: "/products",
      label: "Produk",
      icon: Package,
      roles: ["owner", "admin"],
    },
    {
      href: "/inventory",
      label: "Stok",
      icon: Boxes,
      roles: ["owner", "admin"],
    },
    {
      href: "/reports",
      label: "Laporan",
      icon: BarChart3,
      roles: ["owner", "admin"],
    },
    {
      href: "/staff",
      label: "Karyawan",
      icon: Users,
      roles: ["owner", "admin"],
    },
    {
      href: "/subscription",
      label: "Paket",
      icon: Crown,
      roles: ["owner"],
    },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(role));

  function changeOutlet(nextOutletId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextOutletId) {
      params.set("outlet", nextOutletId);
    } else {
      params.delete("outlet");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#dfe8e3] bg-white/95 backdrop-blur-xl transition-all">
      {/* Top Animated Route Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden bg-transparent z-50 pointer-events-none">
        {navigatingTo && (
          <div className="h-full w-full bg-gradient-to-r from-[#23a473] via-[#198760] to-[#073d2f] animate-nav-progress shadow-[0_0_10px_rgba(35,164,115,0.8)]" />
        )}
      </div>

      {/* Trial Countdown Banner */}
      {typeof trialDaysRemaining === "number" && trialDaysRemaining > 0 && (
        <aside
          aria-label="Pemberitahuan Masa Uji Coba"
          className="border-b border-amber-200/80 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-1.5 text-xs text-amber-900 print:hidden"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
              <span>
                Masa uji coba gratis (Trial) gerai Anda tersisa <strong>{trialDaysRemaining} hari lagi</strong>.
              </span>
            </div>
            {role === "owner" && (
              <Link
                href="/subscription"
                className="inline-flex items-center gap-1 font-bold text-amber-800 underline hover:text-amber-950 transition"
              >
                <span>Pilih & Aktifkan Paket</span>
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </aside>
      )}

      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo & Business Info */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            onClick={() => {
              if (pathname !== "/dashboard") setNavigatingTo("/dashboard");
            }}
            className="flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02] active:scale-95 hover:opacity-90"
            aria-label="Dashboard wazePOS"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#198760] text-white shadow-sm transition-transform duration-200 group-hover:rotate-3">
              <LayoutDashboard className="size-4" />
            </span>
            <div className="min-w-0">
              <span className="block text-base font-extrabold leading-none tracking-[-0.6px] text-[#15211d]">
                waze<span className="text-[#198760]">POS</span>
              </span>
              <span className="mt-1 block truncate text-[11px] font-medium text-[#627069]">
                {businessName}
                {outletName ? ` · ${outletName}` : ""}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav
            className="hidden md:flex items-center gap-1.5"
            aria-label="Navigasi Menu Cepat"
          >
            {visibleNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const isPendingNav = navigatingTo === item.href;
              const Icon = item.icon;
              const itemHref =
                activeOutletId && activeOutletId !== "all"
                  ? `${item.href}?outlet=${encodeURIComponent(activeOutletId)}`
                  : item.href;

              return (
                <Link
                  key={item.href}
                  href={itemHref}
                  onClick={() => {
                    if (!isActive) {
                      setNavigatingTo(item.href);
                    }
                  }}
                  className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                    isActive
                      ? "bg-[#198760] text-white shadow-md shadow-[#198760]/25 scale-[1.02]"
                      : "text-[#4d5e57] hover:bg-[#198760]/10 hover:text-[#147554] hover:scale-[1.02]"
                  } ${isPendingNav ? "opacity-80 ring-2 ring-[#23a473]/40" : ""}`}
                >
                  <Icon
                    className={`size-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "scale-105" : ""
                    } ${isPendingNav ? "animate-pulse" : ""}`}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="size-1.5 rounded-full bg-white/90 animate-pulse shadow-sm" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {outlets.length > 1 && activeOutletId && (
            <label className="flex items-center gap-2 text-xs font-bold text-[#627069]">
              <span className="sr-only">Pilih gerai aktif</span>
              <select
                value={activeOutletId}
                onChange={(event) => changeOutlet(event.target.value)}
                className="max-w-44 rounded-xl border border-[#dfe8e3] bg-[#f7faf8] px-3 py-2 text-xs font-bold text-[#29453a] outline-none transition focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/20"
                aria-label="Pilih gerai aktif"
              >
                {outlets.map((item) => (
                  <option key={item.id} value={item.id}>
                    Gerai: {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Right Action: Logout */}
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Horizontal Scrollable Quick Bar */}
      <div className="flex md:hidden border-t border-[#edf3f0] bg-[#fafcfb] px-3 py-2 overflow-x-auto scrollbar-none gap-1.5">
        {visibleNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const isPendingNav = navigatingTo === item.href;
          const Icon = item.icon;
          const itemHref =
            activeOutletId && activeOutletId !== "all"
              ? `${item.href}?outlet=${encodeURIComponent(activeOutletId)}`
              : item.href;

          return (
            <Link
              key={item.href}
              href={itemHref}
              onClick={() => {
                if (!isActive) {
                  setNavigatingTo(item.href);
                }
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                isActive
                  ? "bg-[#198760] text-white shadow-sm scale-[1.02]"
                  : "bg-white text-[#4d5e57] border border-[#e2ece6] hover:bg-[#198760]/10 hover:text-[#147554]"
              } ${isPendingNav ? "opacity-80 ring-2 ring-[#23a473]/30" : ""}`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <span className="size-1 rounded-full bg-white/90 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
