import "server-only";

import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/auth-session";
import { isPlatformAdminUser } from "@/shared/admin/platform-admin-access";

export async function requirePlatformAdmin() {
  const session = await requireSession();

  if (!isPlatformAdminUser(session.user, process.env.PLATFORM_ADMIN_EMAILS)) {
    notFound();
  }

  return session;
}
