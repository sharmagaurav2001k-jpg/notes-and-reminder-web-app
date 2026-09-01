import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  let token = null;

  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch (error) {
    console.error("Middleware auth check error:", error);
  }

  const { pathname } = req.nextUrl;

  // Define public auth pages
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");

  // Define public API routes (auth, webhooks)
  const isPublicApi =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/api/webhooks/whatsapp");

  // Allow public API routes without interference
  if (isPublicApi) {
    return NextResponse.next();
  }

  // 1. If user is NOT logged in and tries to access protected pages -> redirect to /login
  if (!token && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If user IS logged in and tries to access auth pages (/login, /signup) -> redirect to /dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image formats (.svg, .png, .jpg, .webp, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
