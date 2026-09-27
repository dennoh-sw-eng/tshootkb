import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { SessionUser } from "./rbac";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as any;
  if (!u.id || !u.role) return null;
  return { id: u.id, role: u.role };
}
