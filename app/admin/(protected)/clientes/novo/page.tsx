"use client";

import { useRouter } from "next/navigation";
import { createClientAction } from "@/domain/clients/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ClientForm } from "@/components/admin/client-form";
import type { ActionResult } from "@/lib/auth/action-result";

export default function NewClientPage() {
  const router = useRouter();

  async function action(raw: unknown): Promise<ActionResult<{ id: string }>> {
    const result = await createClientAction(raw);
    if (result.ok) router.push(`/admin/clientes/${result.data.id}`);
    return result;
  }

  return (
    <div>
      <PageHeader title="Nova cliente" description="Cadastro CRM — pode ser criado antes do primeiro ensaio." />
      <Card>
        <ClientForm action={action} submitLabel="Cadastrar" />
      </Card>
    </div>
  );
}
