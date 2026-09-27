import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login, /setup (public auth pages)
     * - /api/auth/* (NextAuth handlers)
     * - /api/setup (owner-first setup, self-guards on user count)
     * - static assets, uploads, favicon
     */
    "/((?!login|setup|api/auth|api/setup|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
