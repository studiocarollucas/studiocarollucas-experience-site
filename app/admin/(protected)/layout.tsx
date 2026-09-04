import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || !hasMinimumRole(user.role, "staff")) {
    redirect("/admin/login");
  }

  return <div className="min-h-screen bg-white text-ink">{children}</div>;
}
