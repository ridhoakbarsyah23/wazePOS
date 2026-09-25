"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, History, LayoutDashboard, Repeat2 } from "lucide-react";
import { cn } from "@/lib/shared/utils";

const links = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "Daftar usaha", icon: Building2, exact: false },
  { href: "/admin/subscriptions", label: "Langganan", icon: Repeat2, exact: false },
  { href: "/admin/payments", label: "Pembayaran", icon: CreditCard, exact: false },
  { href: "/admin/audit", label: "Audit", icon: History, exact: false },
];

export function PlatformAdminNav() {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav aria-label="Navigasi Platform Admin" className="w-full">
      <ul className="flex w-full items-center gap-2 overflow-x-auto">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-extrabold transition sm:h-9",
                  isActive
                    ? "border-[#198760] bg-[#198760] text-white shadow-sm hover:bg-[#147554]"
                    : "border-[#dfe8e3] bg-white text-[#527066] hover:border-[#9ac3b0] hover:text-[#106348]",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
