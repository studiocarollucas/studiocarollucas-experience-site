import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

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

  return (
    <div className="flex min-h-screen bg-cream text-ink">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-line bg-white p-6">
        <div>
          <p className="font-serif text-lg font-light">Studio OS</p>
          <p className="mb-8 font-sans text-[10px] uppercase tracking-[0.16em] text-muted">
            Stúdio Carol Lucas
          </p>
          <AdminNav />
        </div>
        <div className="flex flex-col gap-2">
          <p className="truncate font-sans text-xs text-muted">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-10">{children}</main>
    </div>
  );
}
