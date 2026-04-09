import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/register", "/verify-email", "/forgot-password"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("bc_token")?.value;

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Unauthenticated user trying to access a protected route
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated user trying to access auth pages
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)"],
};
