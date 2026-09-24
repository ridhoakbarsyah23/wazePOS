import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedRoutes = ["/admin", "/auth/continue", "/dashboard", "/onboarding", "/products", "/inventory", "/pos", "/reports", "/sales", "/subscription", "/staff", "/transactions", "/customers", "/settings"];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(getSessionCookie(request));
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/auth/continue/:path*",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/pos/:path*",
    "/reports/:path*",
    "/sales/:path*",
    "/subscription/:path*",
    "/staff/:path*",
    "/transactions/:path*",
    "/customers/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
