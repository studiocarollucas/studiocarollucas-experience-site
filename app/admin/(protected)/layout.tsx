import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Distinct from the anonymous case on purpose: every profile is created as "client" (see
  // 0002_handle_new_user_trigger.sql), so a staff member who has not been promoted yet would
  // otherwise log in successfully and bounce straight back to a blank form — an endless loop
  // that reads as a broken login rather than a permissions problem.
  if (!hasMinimumRole(user.role, "staff")) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Sua conta não tem permissão de acesso ao Studio OS.")}`,
    );
  }

  return <div className="min-h-screen bg-white text-ink">{children}</div>;
}
