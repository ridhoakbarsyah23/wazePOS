import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/onboarding", "/products", "/inventory", "/pos", "/reports", "/sales", "/subscription", "/staff"];
const guestRoutes = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(getSessionCookie(request));
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isGuestRoute = guestRoutes.includes(pathname);

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/pos/:path*",
    "/reports/:path*",
    "/sales/:path*",
    "/subscription/:path*",
    "/staff/:path*",
    "/login",
    "/register",
  ],
};
