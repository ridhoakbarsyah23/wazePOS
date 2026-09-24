import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isPlatformAdminEmail } from "@/lib/platform-admin-access";

export async function getPlatformAdminRequestSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    session,
    allowed: isPlatformAdminEmail(session?.user.email, process.env.PLATFORM_ADMIN_EMAILS),
  };
}
