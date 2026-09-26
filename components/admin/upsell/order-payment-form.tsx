"use client";

import { useActionState } from "react";
import { registerUpsellPaymentAction } from "@/domain/upsell/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type Result = ActionResult<{ orderId: string; balance: string; paymentStatus: string }>;

// Same fields as the Shoot payment form (agenda/[id]/pagamento): the receipt is
// an ordinary Payment of the order's Shoot, tagged with the order.
export function UpsellOrderPaymentForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState(async (prev: Result | null, fd: FormData) => {
    const local = fd.get("paidAtLocal");
    fd.delete("paidAtLocal");
    if (typeof local === "string" && local !== "") {
      // datetime-local is wall-clock time without offset; toISOString() yields the
      // instant with an explicit offset (docs/DECISIONS.md, 2026-09-06).
      fd.set("paidAt", new Date(local).toISOString());
    }
    return toFormAction(registerUpsellPaymentAction)(prev, fd);
  }, null);
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormStatus state={state} />
      {state?.ok ? (
        <p role="status" className="font-sans text-sm text-[#1e7d4f]">
          Pagamento registrado.
        </p>
      ) : null}
      <input type="hidden" name="orderId" value={orderId} />
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
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" />
      </Field>
      <div>
        <SubmitButton>Registrar pagamento</SubmitButton>
      </div>
    </form>
  );
}
