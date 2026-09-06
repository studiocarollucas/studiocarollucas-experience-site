"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateShootAction } from "@/domain/shoots/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function EditShootPanel({
  id,
  initialValues,
}: {
  id: string;
  initialValues: {
    startTime: string;
    agreedPrice: string;
    participantCount?: number;
    occasion: string;
    referral: string;
    notes: string;
    portalEnabled: boolean;
  };
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(updateShootAction, {
        numbers: ["participantCount"],
        booleans: ["portalEnabled"],
      })(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormStatus state={state} />
      {state && state.ok ? <p className="font-sans text-sm text-[#1e7d4f]">Ensaio atualizado.</p> : null}
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Horário" htmlFor="startTime" error={err("startTime")}>
          <Input id="startTime" name="startTime" type="time" defaultValue={initialValues.startTime} />
        </Field>
        <Field label="Valor acordado" htmlFor="agreedPrice" error={err("agreedPrice")}>
          <Input id="agreedPrice" name="agreedPrice" inputMode="decimal" defaultValue={initialValues.agreedPrice} />
        </Field>
      </div>
      <Field label="Participantes" htmlFor="participantCount" error={err("participantCount")}>
        <Input id="participantCount" name="participantCount" type="number" min={1} defaultValue={initialValues.participantCount ?? ""} />
      </Field>
      <Field label="Ocasião" htmlFor="occasion" error={err("occasion")}>
        <Input id="occasion" name="occasion" defaultValue={initialValues.occasion} />
      </Field>
      <Field label="Indicação / origem" htmlFor="referral" error={err("referral")}>
        <Input id="referral" name="referral" defaultValue={initialValues.referral} />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" defaultValue={initialValues.notes} />
      </Field>
      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input type="checkbox" name="portalEnabled" defaultChecked={initialValues.portalEnabled} />
        Portal liberado
      </label>
      <div>
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}
