import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPostLoginDestination } from "@/lib/admin/platform-admin-access";

export default async function AuthContinuePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  redirect(
    getPostLoginDestination(session.user, process.env.PLATFORM_ADMIN_EMAILS),
  );
}
