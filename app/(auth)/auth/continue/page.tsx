import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/auth-session";
import { getPostLoginDestination } from "@/shared/admin/platform-admin-access";

export default async function AuthContinuePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Pendaftar manual yang belum menyelesaikan OTP tidak boleh lolos ke
  // dashboard/onboarding — kembalikan ke halaman verifikasi.
  if (!session.user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
  }

  redirect(
    getPostLoginDestination(session.user, process.env.PLATFORM_ADMIN_EMAILS),
  );
}
