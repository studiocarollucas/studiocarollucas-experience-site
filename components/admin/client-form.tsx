"use client";

import { useActionState } from "react";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type Values = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  instagramHandle?: string | null;
  birthday?: string | null;
  source?: string | null;
  styleProfile?: string | null;
  notes?: string | null;
  marketingConsent?: boolean;
};

export function ClientForm({
  action,
  initialValues,
  submitLabel = "Salvar",
  hiddenId,
}: {
  action: (raw: unknown) => Promise<ActionResult<{ id: string }>>;
  initialValues?: Values;
  submitLabel?: string;
  hiddenId?: string;
}) {
  const [state, formAction] = useActionState(
    toFormAction(action, { booleans: ["marketingConsent"] }),
    null,
  );
  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <FormStatus state={state} />
      {hiddenId ? <input type="hidden" name="id" value={hiddenId} /> : null}

      <Field label="Nome" htmlFor="name" error={fieldError("name")}>
        <Input id="name" name="name" required defaultValue={initialValues?.name ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefone" htmlFor="phone" error={fieldError("phone")}>
          <Input id="phone" name="phone" defaultValue={initialValues?.phone ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={fieldError("email")}>
          <Input id="email" name="email" type="email" defaultValue={initialValues?.email ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Instagram" htmlFor="instagramHandle" error={fieldError("instagramHandle")}>
          <Input id="instagramHandle" name="instagramHandle" defaultValue={initialValues?.instagramHandle ?? ""} />
        </Field>
        <Field label="Aniversário" htmlFor="birthday" hint="AAAA-MM-DD" error={fieldError("birthday")}>
          <Input id="birthday" name="birthday" type="date" defaultValue={initialValues?.birthday ?? ""} />
        </Field>
      </div>
      <Field label="Origem" htmlFor="source" error={fieldError("source")}>
        <Input id="source" name="source" defaultValue={initialValues?.source ?? ""} />
      </Field>
      <Field label="Perfil de estilo" htmlFor="styleProfile" error={fieldError("styleProfile")}>
        <Input id="styleProfile" name="styleProfile" defaultValue={initialValues?.styleProfile ?? ""} />
      </Field>
      <Field label="Observações" htmlFor="notes" error={fieldError("notes")}>
        <Textarea id="notes" name="notes" defaultValue={initialValues?.notes ?? ""} />
      </Field>
      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input
          type="checkbox"
          name="marketingConsent"
          defaultChecked={initialValues?.marketingConsent ?? false}
        />
        Consentimento de marketing
      </label>

      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
