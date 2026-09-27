import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import UsersAdmin from "@/components/UsersAdmin";

export default async function UsersAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (!canManageUsers(role)) redirect("/");

  return <UsersAdmin currentUserId={(session.user as any).id} />;
}
