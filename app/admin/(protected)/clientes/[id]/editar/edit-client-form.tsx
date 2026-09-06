"use client";

import { useRouter } from "next/navigation";
import { updateClientAction } from "@/domain/clients/actions";
import { ClientForm } from "@/components/admin/client-form";
import type { ActionResult } from "@/lib/auth/action-result";

type Values = React.ComponentProps<typeof ClientForm>["initialValues"];

export function EditClientForm({ id, initialValues }: { id: string; initialValues: Values }) {
  const router = useRouter();

  async function action(raw: unknown): Promise<ActionResult<{ id: string }>> {
    const result = await updateClientAction(raw);
    if (result.ok) router.push(`/admin/clientes/${id}`);
    return result;
  }

  return <ClientForm action={action} initialValues={initialValues} submitLabel="Salvar" hiddenId={id} />;
}
