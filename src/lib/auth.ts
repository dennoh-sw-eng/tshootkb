import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logAudit } from "./audit";
import { Role } from "./types";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8-hour sessions
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.disabled) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        await logAudit({ userId: user.id, action: "LOGIN", targetType: "User", targetId: user.id });

        return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      } else if (token.id) {
        // Re-check disabled status on each token refresh so a disabled
        // user's existing session stops working promptly.
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (!fresh || fresh.disabled) {
          return {};
        }
        token.role = fresh.role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      } else {
        // Invalidated token (disabled user) -> empty session
        session.user = undefined as any;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
