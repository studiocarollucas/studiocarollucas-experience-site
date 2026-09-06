"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction } from "@/domain/finance/expense-actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function ExpenseForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(createExpenseAction, { booleans: ["recurring"] })(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormStatus state={state} />
      {state && state.ok ? <p className="font-sans text-sm text-[#1e7d4f]">Despesa registrada.</p> : null}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data" htmlFor="date" error={err("date")}>
          <Input id="date" name="date" type="date" required />
        </Field>
        <Field label="Tipo" htmlFor="type" error={err("type")}>
          <Select id="type" name="type" defaultValue="custo">
            <option value="custo">Custo</option>
            <option value="investimento">Investimento</option>
            <option value="funcionario">Funcionário</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria" htmlFor="category" error={err("category")}>
          <Input id="category" name="category" />
        </Field>
        <Field label="Valor" htmlFor="amount" hint="Ex.: 900.00" error={err("amount")}>
          <Input id="amount" name="amount" inputMode="decimal" required />
        </Field>
      </div>
      <Field label="Forma de pagamento" htmlFor="method" error={err("method")}>
        <Input id="method" name="method" />
      </Field>
      <Field label="Comprovante (URL)" htmlFor="proofUrl" error={err("proofUrl")}>
        <Input id="proofUrl" name="proofUrl" type="url" />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" />
      </Field>
      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input type="checkbox" name="recurring" />
        Despesa recorrente
      </label>
      <div>
        <SubmitButton>Registrar despesa</SubmitButton>
      </div>
    </form>
  );
}
