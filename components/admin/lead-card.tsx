import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { LeadListRow } from "@/domain/leads/queries";

export function LeadCard({ lead }: { lead: LeadListRow }) {
  return (
    <div className="space-y-1">
      <Link href={`/admin/leads/${lead.id}`} className="font-medium text-ink underline-offset-2 hover:underline">
        {lead.name ?? "Lead sem nome"}
      </Link>
      <p className="text-xs text-muted">{[lead.phone, lead.email].filter(Boolean).join(" · ") || "Sem contato informado"}</p>
      <div className="flex flex-wrap gap-1 pt-1">
        <Badge tone="active">{lead.status}</Badge>
        <Badge>{lead.source}</Badge>
      </div>
    </div>
  );
}
