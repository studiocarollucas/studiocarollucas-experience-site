"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { registerPaymentAction } from "@/domain/payments/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function PaymentForm({ shootId }: { shootId: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ shootId: string }> | null, fd: FormData) => {
      const local = fd.get("paidAtLocal");
      fd.delete("paidAtLocal");
      if (typeof local === "string" && local !== "") {
        // "2026-10-18T14:30" -> "2026-10-18T14:30:00Z" (Z is an accepted offset)
        fd.set("paidAt", local.length === 16 ? `${local}:00Z` : `${local}Z`);
      }
      const result = await toFormAction(registerPaymentAction)(prev, fd);
      if (result.ok) router.push(`/admin/agenda/${result.data.shootId}`);
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormStatus state={state} />
      <input type="hidden" name="shootId" value={shootId} />

      <Field label="Valor" htmlFor="amount" hint="Ex.: 400.00" error={err("amount")}>
        <Input id="amount" name="amount" inputMode="decimal" required />
      </Field>
      <Field label="Status" htmlFor="status" error={err("status")}>
        <Select id="status" name="status" defaultValue="confirmado">
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
          <option value="estornado">Estornado</option>
        </Select>
      </Field>
      <Field label="Forma de pagamento" htmlFor="method" error={err("method")}>
        <Input id="method" name="method" placeholder="Pix, cartão, dinheiro…" />
      </Field>
      <Field label="Data do pagamento" htmlFor="paidAtLocal" hint="Opcional" error={err("paidAt")}>
        <Input id="paidAtLocal" name="paidAtLocal" type="datetime-local" />
      </Field>
      <Field label="Comprovante (URL)" htmlFor="proofUrl" error={err("proofUrl")}>
        <Input id="proofUrl" name="proofUrl" type="url" />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" />
      </Field>

      <div>
        <SubmitButton>Registrar</SubmitButton>
      </div>
    </form>
  );
}
