import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth-session";
import { getPostLoginDestination } from "@/lib/platform-admin-access";

export default async function AuthContinuePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  redirect(
    getPostLoginDestination(session.user.email, process.env.PLATFORM_ADMIN_EMAILS),
  );
}
