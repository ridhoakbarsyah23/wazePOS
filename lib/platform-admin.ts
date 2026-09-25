import "server-only";

import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { isPlatformAdminUser } from "@/lib/platform-admin-access";

export async function requirePlatformAdmin() {
  const session = await requireSession();

  if (!isPlatformAdminUser(session.user, process.env.PLATFORM_ADMIN_EMAILS)) {
    notFound();
  }

  return session;
}
