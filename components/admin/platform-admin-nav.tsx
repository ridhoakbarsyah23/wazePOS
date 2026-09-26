"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, History, LayoutDashboard, Repeat2 } from "lucide-react";
import { cn } from "@/shared/utils";

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
    <nav aria-label="Navigasi Platform Admin" className="w-full min-w-0">
      <ul className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <li key={link.href} className="min-w-0 last:odd:col-span-2 sm:last:odd:col-span-1">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/30 sm:h-9 sm:w-auto sm:min-w-[104px] sm:justify-start sm:px-3.5 motion-reduce:transition-none",
                  isActive
                    ? "border-[#0b503d] bg-gradient-to-b from-[#198760] to-[#147554] text-white shadow-[0_8px_20px_rgba(20,117,84,0.3)] hover:from-[#1ba36f] hover:to-[#147554]"
                    : "border-[#dfe8e3] bg-white text-[#527066] hover:-translate-y-px hover:border-[#9ac3b0] hover:text-[#106348] hover:shadow-[0_8px_20px_rgba(16,65,48,0.1)] motion-reduce:transform-none",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
