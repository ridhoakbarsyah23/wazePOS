import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { PlatformAdminShell } from "@/components/admin/platform-admin-shell";
import { PlatformAdminThemeProvider } from "@/components/admin/platform-admin-theme";
import { requirePlatformAdmin } from "@/server/admin/platform-admin";
import {
  platformAdminThemeCookie,
  type PlatformAdminTheme,
} from "@/shared/admin/platform-admin-theme";

/**
 * Guard route-level untuk seluruh segment /admin.
 *
 * Proxy hanya melakukan pemeriksaan awal berdasarkan cookie. Guard ini
 * memvalidasi session Better Auth, email terverifikasi, dan allowlist email
 * di server sebelum children (halaman dan komponen route) dirender. Cookie
 * yang dibuat manual atau session kedaluwarsa tidak cukup untuk membuka area
 * internal.
 * Endpoint API admin tetap memakai guard session terpisah.
 */
export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const session = await requirePlatformAdmin();
  const cookieStore = await cookies();
  const initialTheme: PlatformAdminTheme =
    cookieStore.get(platformAdminThemeCookie)?.value === "dark" ? "dark" : "light";

  return (
    <PlatformAdminThemeProvider initialTheme={initialTheme}>
      <PlatformAdminShell adminEmail={session.user.email}>{children}</PlatformAdminShell>
    </PlatformAdminThemeProvider>
  );
}
