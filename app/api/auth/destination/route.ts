import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { getPostLoginDestination } from "@/shared/admin/platform-admin-access";

export async function GET() {
  const requestHeaders = await headers();
  let session;
  try {
    session = await auth.api.getSession({ headers: requestHeaders });
  } catch (error) {
    console.error(
      "[AUTH_DESTINATION_LOOKUP_FAILED]",
      error instanceof Error ? error.message : "Unknown session lookup error",
    );
    return NextResponse.json(
      { message: "Layanan autentikasi sedang tidak tersedia." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!session) {
    return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  }

  return NextResponse.json({
    destination: getPostLoginDestination(session.user, process.env.PLATFORM_ADMIN_EMAILS),
  });
}
