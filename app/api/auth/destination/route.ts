import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPostLoginDestination } from "@/lib/platform-admin-access";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  }

  return NextResponse.json({
    destination: getPostLoginDestination(session.user.email, process.env.PLATFORM_ADMIN_EMAILS),
  });
}
