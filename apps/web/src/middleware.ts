import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/super-admin-login",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/api/auth/signup",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))) {
    return NextResponse.next();
  }
  const hasRefreshToken = request.cookies.get("refreshToken")?.value;
  if (!hasRefreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/super-admin") ? "/super-admin-login" : "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
