import { redirect } from "next/navigation";
import { ContractorProfileForm } from "./contractor-profile-form";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { getActiveContractorProfile } from "@/domain/contractor-profile/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function ContractorProfilePage() {
  const user = await getCurrentUser();

  if (!user || !hasMinimumRole(user.role, "staff")) {
    redirect("/admin/login");
  }

  const profile = await getActiveContractorProfile();

  return (
    <>
      <PageHeader
        title="Contratante"
        description="Defina os dados que aparecerão nos próximos contratos emitidos."
      />
      <Card className="max-w-xl">
        <ContractorProfileForm initialProfile={profile} />
      </Card>
    </>
  );
}
