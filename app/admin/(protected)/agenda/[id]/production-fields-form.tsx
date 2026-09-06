"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateProductionJobAction } from "@/domain/production/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

// `editorUserId` is deliberately absent: there is no user-picker component yet, and
// a free-text UUID field would be a data-entry trap. The action still accepts it —
// it is wired here as soon as a picker exists.
export function ProductionFieldsForm({
  jobId,
  initialValues,
}: {
  jobId: string;
  initialValues: {
    photosToEdit?: number;
    deliveryDueAt: string;
    selectionStatus: string;
    notes: string;
  };
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ jobId: string }> | null, fd: FormData) => {
      const result = await toFormAction(updateProductionJobAction, {
        numbers: ["photosToEdit"],
      })(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="mt-4 flex max-w-xl flex-col gap-4 border-t border-line pt-4">
      <FormStatus state={state} />
      {state && state.ok ? <p className="font-sans text-sm text-[#1e7d4f]">Produção atualizada.</p> : null}
      <input type="hidden" name="jobId" value={jobId} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fotos para editar" htmlFor="photosToEdit" error={err("photosToEdit")}>
          <Input id="photosToEdit" name="photosToEdit" type="number" min={1} defaultValue={initialValues.photosToEdit ?? ""} />
        </Field>
        <Field label="Prazo de entrega" htmlFor="deliveryDueAt" error={err("deliveryDueAt")}>
          <Input id="deliveryDueAt" name="deliveryDueAt" type="date" defaultValue={initialValues.deliveryDueAt} />
        </Field>
      </div>
      <Field label="Status da seleção" htmlFor="selectionStatus" error={err("selectionStatus")}>
        <Input id="selectionStatus" name="selectionStatus" placeholder="aguardando seleção, selecionadas…" defaultValue={initialValues.selectionStatus} />
      </Field>
      <Field label="Observações da produção" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" defaultValue={initialValues.notes} />
      </Field>
      <div>
        <SubmitButton>Salvar produção</SubmitButton>
      </div>
    </form>
  );
}
