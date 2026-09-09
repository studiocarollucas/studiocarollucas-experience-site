import { notFound, redirect } from "next/navigation";
import { LeadDetail } from "@/components/admin/lead-detail";
import { PageHeader } from "@/components/ui/page-header";
import { listActivePackages } from "@/domain/catalog/queries";
import { findLeadClientCandidates } from "@/domain/leads/conversion";
import { getLeadDetail } from "@/domain/leads/detail";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) redirect("/admin/login");

  const { id } = await params;
  const lead = await getLeadDetail(id);
  if (!lead) notFound();
  const [candidates, packages] = lead.status === "ganho"
    ? await Promise.all([findLeadClientCandidates(lead.id), listActivePackages()])
    : [[], []];

  return (
    <div>
      <PageHeader title={lead.name ?? "Lead sem nome"} description="Ficha comercial e histórico do Lead." />
      <LeadDetail lead={lead} candidates={candidates} packages={packages} />
    </div>
  );
}
