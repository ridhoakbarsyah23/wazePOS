import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/admin/platform-admin";

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
  await requirePlatformAdmin();

  return children;
}
