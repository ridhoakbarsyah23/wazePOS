"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Contact,
  Crown,
  History,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  User,
  Users,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

export type AppHeaderProps = {
  businessName: string;
  outletName?: string;
  outlets?: { id: string; name: string; slug?: string }[];
  activeOutletId?: string;
  role?: "owner" | "admin" | "cashier";
  trialDaysRemaining?: number | null;
  children?: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<"owner" | "admin" | "cashier">;
  badge: string | null;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["owner", "admin"],
    badge: null,
  },
  {
    href: "/pos",
    label: "Kasir POS",
    icon: ShoppingCart,
    roles: ["owner", "admin", "cashier"],
    badge: "Terminal",
  },
  {
    href: "/transactions",
    label: "Riwayat",
    icon: History,
    roles: ["owner", "admin", "cashier"],
    badge: null,
  },
  {
    href: "/products",
    label: "Produk",
    icon: Package,
    roles: ["owner", "admin"],
    badge: null,
  },
  {
    href: "/inventory",
    label: "Stok",
    icon: Boxes,
    roles: ["owner", "admin"],
    badge: null,
  },
  {
    href: "/reports",
    label: "Laporan",
    icon: BarChart3,
    roles: ["owner", "admin"],
    badge: null,
  },
  {
    href: "/customers",
    label: "Pelanggan",
    icon: Contact,
    roles: ["owner", "admin"],
    badge: null,
  },
  {
    href: "/staff",
    label: "Karyawan",
    icon: Users,
    roles: ["owner", "admin"],
    badge: null,
  },
  {
    href: "/subscription",
    label: "Paket",
    icon: Crown,
    roles: ["owner"],
    badge: null,
  },
  {
    href: "/settings",
    label: "Pengaturan",
    icon: Settings,
    roles: ["owner", "admin"],
    badge: null,
  },
];

function SidebarNavLinks({
  visibleNav,
  pathname,
  navigatingTo,
  activeOutletId,
  activeOutletSlug,
  onNavigate,
  onWarm,
  onItemClick,
}: {
  visibleNav: NavItem[];
  pathname: string;
  navigatingTo: string | null;
  activeOutletId?: string;
  activeOutletSlug?: string;
  onNavigate: (href: string) => void;
  onWarm: (href: string) => void;
  onItemClick?: () => void;
}) {
  return (
    <nav className="space-y-1 px-3 py-2" aria-label="Navigasi Menu">
      {visibleNav.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const isPendingNav = navigatingTo === item.href;
        const Icon = item.icon;
        const itemHref =
          item.href === "/pos" && activeOutletSlug
            ? `/pos/${encodeURIComponent(activeOutletSlug)}`
            : activeOutletId && activeOutletId !== "all"
              ? `${item.href}?outlet=${encodeURIComponent(activeOutletId)}`
              : item.href;

        return (
          <Link
            key={item.href}
            href={itemHref}
            onPointerEnter={() => onWarm(itemHref)}
            onFocus={() => onWarm(itemHref)}
            onPointerDown={() => onWarm(itemHref)}
            onClick={() => {
              if (!isActive) onNavigate(item.href);
              if (onItemClick) onItemClick();
            }}
            className={`group relative flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-bold transition-all duration-150 active:scale-[0.98] ${
              isActive
                ? "bg-[#198760] text-white shadow-md shadow-[#198760]/20 scale-[1.01]"
                : "text-[#455850] hover:bg-[#eef6f2] hover:text-[#147554]"
            } ${isPendingNav ? "opacity-80 ring-2 ring-[#23a473]/30" : ""}`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`grid size-7 place-items-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-[#f2f7f4] text-[#198760] group-hover:bg-[#198760] group-hover:text-white"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span>{item.label}</span>
            </div>

            {/* Badges or active dot */}
            {item.badge ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[#eaf7f0] text-[#198760] group-hover:bg-[#198760]/10"
                }`}
              >
                {item.badge}
              </span>
            ) : isActive ? (
              <span className="size-2 rounded-full bg-white animate-pulse" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppHeader({
  businessName,
  outletName,
  outlets = [],
  activeOutletId,
  role = "owner",
  trialDaysRemaining,
  children,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpenAt, setMobileOpenAt] = useState(pathname);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const warmedRoutes = useRef(new Set<string>());

  // Reset status turunan saat render (pola resmi React "adjusting state when props change"):
  // drawer tertutup & progress bar dibersihkan begitu pindah halaman.
  if (mobileOpen && mobileOpenAt !== pathname) {
    setMobileOpen(false);
  }
  if (
    navigatingTo &&
    (pathname === navigatingTo || (navigatingTo !== "/dashboard" && pathname.startsWith(navigatingTo)))
  ) {
    setNavigatingTo(null);
  }

  const visibleNav = navItems.filter((item) => item.roles.includes(role));
  const activeOutletSlug = outlets.find((item) => item.id === activeOutletId)?.slug;
  const cashierHref = activeOutletSlug
    ? `/pos/${encodeURIComponent(activeOutletSlug)}`
    : activeOutletId && activeOutletId !== "all"
      ? `/pos?outlet=${encodeURIComponent(activeOutletId)}`
      : "/pos";

  function handleNavigate(href: string) {
    setNavigatingTo(href);
  }

  function warmRoute(href: string) {
    if (warmedRoutes.current.has(href)) return;
    warmedRoutes.current.add(href);
    router.prefetch(href);
  }

  function openMobileDrawer() {
    setMobileOpen(true);
    setMobileOpenAt(pathname);
  }

  function changeOutlet(nextOutletId: string) {
    if (pathname === "/pos" || pathname.startsWith("/pos/")) {
      const nextOutlet = outlets.find((item) => item.id === nextOutletId);
      router.push(nextOutlet?.slug ? `/pos/${encodeURIComponent(nextOutlet.slug)}` : "/pos");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (nextOutletId && nextOutletId !== "all") {
      params.set("outlet", nextOutletId);
    } else {
      params.delete("outlet");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const roleLabel = {
    owner: "Pemilik Usaha",
    admin: "Admin Gerai",
    cashier: "Kasir",
  }[role];

  const roleIcon = {
    owner: Crown,
    admin: Shield,
    cashier: User,
  }[role];
  const RoleIcon = roleIcon;

  // Reset status navigasi saat pindah halaman ditangani di atas (render-phase).

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-[#f4faf7] text-[#15211d]">
      {/* Top Animated Route Progress Bar */}
      {navigatingTo && (
        <div className="fixed top-0 left-0 right-0 h-[2.5px] overflow-hidden bg-transparent z-[100] pointer-events-none">
          <div className="h-full w-full bg-linear-to-r from-[#23a473] via-[#198760] to-[#073d2f] animate-nav-progress shadow-[0_0_10px_rgba(35,164,115,0.8)]" />
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. DESKTOP PERMANENT SIDEBAR (>= 1024px)                  */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-40 border-r border-[#dfe8e3] bg-white shadow-[2px_0_12px_rgba(16,65,48,0.03)]">
        {/* Brand Header */}
        <div className="px-4 py-4 border-b border-[#edf3f0]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-95"
            aria-label="Dashboard wazePOS"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#198760] text-white shadow-sm shadow-[#198760]/30">
              <LayoutDashboard className="size-4.5" />
            </span>
            <div className="min-w-0">
              <span className="block text-lg font-extrabold leading-tight tracking-[-0.6px] text-[#15211d]">
                waze<span className="text-[#198760]">POS</span>
              </span>
              <span className="block truncate text-xs font-semibold text-[#627069]">
                {businessName}
              </span>
            </div>
          </Link>

          {/* Outlet Switcher (if multi-outlet available) */}
          {outlets.length > 1 && (
            <div className="mt-3.5">
              <label className="text-[11px] font-bold text-[#71857c] uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Store className="size-3 text-[#198760]" /> Gerai Aktif
              </label>
              <select
                value={activeOutletId ?? "all"}
                onChange={(e) => changeOutlet(e.target.value)}
                className="w-full h-9 rounded-xl border border-[#dbe5df] bg-[#f7faf8] px-2.5 text-xs font-bold text-[#15211d] outline-none transition focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10"
              >
                <option value="all">Semua Gerai</option>
                {outlets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto py-1.5">
          <div className="px-4 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8fa199]">
            Menu Utama
          </div>
          <SidebarNavLinks
            visibleNav={visibleNav}
            pathname={pathname}
            navigatingTo={navigatingTo}
            activeOutletId={activeOutletId}
            activeOutletSlug={activeOutletSlug}
            onNavigate={handleNavigate}
            onWarm={warmRoute}
          />

          {/* Trial Alert Card in Desktop Sidebar */}
          {typeof trialDaysRemaining === "number" && trialDaysRemaining > 0 && (
            <div className="mx-3 mb-3 mt-2 rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-50 to-orange-50/60 p-2.5 text-amber-900 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Masa Uji Coba Trial</span>
              </div>
              <p className="mt-1 text-xs text-amber-800 leading-snug">
                Tersisa <strong>{trialDaysRemaining} hari lagi</strong>. Aktifkan paket untuk operasional tanpa jeda.
              </p>
              {role === "owner" && (
                <Link
                  href="/subscription"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#8c5b24] hover:underline"
                >
                  <span>Pilih Paket</span>
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Bottom User & Logout Profile Footer */}
        <div className="p-3.5 border-t border-[#edf3f0] bg-[#fafcfb]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760] font-extrabold text-sm">
                <RoleIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate text-xs font-bold text-[#15211d]">
                  {roleLabel}
                </p>
                <p className="m-0 truncate text-[11px] text-[#71857c]">
                  {outletName ?? "Gerai Utama"}
                </p>
              </div>
            </div>

            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MOBILE TOP NAV BAR (< 1024px)                          */}
      {/* ========================================================= */}
      <header className="lg:hidden sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dfe8e3] bg-white/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openMobileDrawer()}
            className="h-10 w-10 p-0 text-[#15211d] hover:bg-[#eaf7f0]"
            aria-label="Buka menu navigasi"
          >
            <Menu className="size-6 text-[#198760]" />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#198760] text-white shadow-xs">
              <LayoutDashboard className="size-4" />
            </span>
            <div className="min-w-0">
              <span className="block text-base font-extrabold leading-none tracking-[-0.6px] text-[#15211d]">
                waze<span className="text-[#198760]">POS</span>
              </span>
              <span className="block truncate text-[10px] font-semibold text-[#627069]">
                {businessName}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Kasir POS button on mobile */}
          <Button asChild size="sm" className="h-8 gap-1 text-xs">
            <Link href={cashierHref}>
              <ShoppingCart className="size-3.5" />
              <span>Kasir</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Mobile Trial Top Warning Bar */}
      {typeof trialDaysRemaining === "number" && trialDaysRemaining > 0 && (
        <aside className="lg:hidden border-b border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Trial sisa {trialDaysRemaining} hari</span>
          </div>
          {role === "owner" && (
            <Link href="/subscription" className="font-bold underline text-amber-950">
              Upgrade
            </Link>
          )}
        </aside>
      )}

      {/* ========================================================= */}
      {/* 3. MOBILE SLIDE-OVER DRAWER SHEET                         */}
      {/* ========================================================= */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex w-64 max-w-[84vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#edf3f0] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-[#198760] text-white shadow-xs">
                  <LayoutDashboard className="size-4" />
                </span>
                <div>
                  <span className="block text-base font-extrabold tracking-tight text-[#15211d]">
                    waze<span className="text-[#198760]">POS</span>
                  </span>
                  <span className="block truncate text-[11px] text-[#627069]">
                    {businessName}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 p-0 text-[#627069]"
                aria-label="Tutup menu"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Drawer Outlet Switcher */}
            {outlets.length > 1 && (
              <div className="px-4 py-2 border-b border-[#edf3f0]">
                <label className="text-[11px] font-bold text-[#71857c] uppercase tracking-wider block mb-1">
                  Gerai
                </label>
                <select
                  value={activeOutletId ?? "all"}
                  onChange={(e) => {
                    changeOutlet(e.target.value);
                    setMobileOpen(false);
                  }}
                  className="w-full h-9 rounded-xl border border-[#dbe5df] bg-[#f7faf8] px-2.5 text-xs font-bold text-[#15211d] outline-none"
                >
                  <option value="all">Semua Gerai</option>
                  {outlets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto py-2">
              <SidebarNavLinks
                visibleNav={visibleNav}
                pathname={pathname}
                navigatingTo={navigatingTo}
                activeOutletId={activeOutletId}
                activeOutletSlug={activeOutletSlug}
                onNavigate={handleNavigate}
                onWarm={warmRoute}
                onItemClick={() => setMobileOpen(false)}
              />
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-[#edf3f0] px-4 py-3 bg-[#fafcfb]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 truncate text-xs font-bold text-[#15211d]">
                    {roleLabel}
                  </p>
                  <p className="m-0 truncate text-[11px] text-[#71857c]">
                    {outletName ?? "Gerai Utama"}
                  </p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MAIN PAGE CONTENT (with offset on desktop: lg:pl-64)   */}
      {/* ========================================================= */}
      <div className="flex-1 lg:pl-64 min-w-0 flex flex-col min-h-dvh">
        {children}
      </div>
    </div>
  );
}

export { AppHeader as AppShell };
