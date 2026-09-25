import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isPlatformAdminUser } from "@/lib/platform-admin-access";

export async function getPlatformAdminRequestSession() {
  const requestHeaders = await headers();
  let session;
  try {
    session = await auth.api.getSession({ headers: requestHeaders });
  } catch (error) {
    console.error(
      "[PLATFORM_ADMIN_SESSION_LOOKUP_FAILED]",
      error instanceof Error ? error.message : "Unknown session lookup error",
    );
    return { session: null, allowed: false };
  }

  return {
    session,
    allowed: isPlatformAdminUser(session?.user, process.env.PLATFORM_ADMIN_EMAILS),
  };
}
