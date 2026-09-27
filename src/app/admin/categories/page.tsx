import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canManageCategories } from "@/lib/rbac";
import CategoriesAdmin from "@/components/CategoriesAdmin";

export default async function CategoriesAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (!canManageCategories(role)) redirect("/");

  return <CategoriesAdmin />;
}
