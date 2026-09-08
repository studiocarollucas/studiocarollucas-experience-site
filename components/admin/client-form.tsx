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
  cpf?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
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
  showContractFields = false,
}: {
  action: (raw: unknown) => Promise<ActionResult<{ id: string }>>;
  initialValues?: Values;
  submitLabel?: string;
  hiddenId?: string;
  showContractFields?: boolean;
}) {
  const [state, formAction] = useActionState(
    toFormAction(action, { booleans: ["marketingConsent"] }),
    null
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
      <Field label="Instagram" htmlFor="instagramHandle" error={fieldError("instagramHandle")}>
        <Input
          id="instagramHandle"
          name="instagramHandle"
          defaultValue={initialValues?.instagramHandle ?? ""}
        />
      </Field>
      <Field label="Origem" htmlFor="source" error={fieldError("source")}>
        <Input id="source" name="source" defaultValue={initialValues?.source ?? ""} />
      </Field>
      <Field label="Perfil de estilo" htmlFor="styleProfile" error={fieldError("styleProfile")}>
        <Input
          id="styleProfile"
          name="styleProfile"
          defaultValue={initialValues?.styleProfile ?? ""}
        />
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

      {showContractFields ? (
        <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
          <legend className="font-serif text-xl text-ink">Dados para contrato</legend>
          <Field label="CPF" htmlFor="cpf" error={fieldError("cpf")}>
            <Input id="cpf" name="cpf" autoComplete="off" defaultValue={initialValues?.cpf ?? ""} />
          </Field>
          <Field
            label="Aniversário"
            htmlFor="birthday"
            hint="AAAA-MM-DD"
            error={fieldError("birthday")}
          >
            <Input
              id="birthday"
              name="birthday"
              type="date"
              autoComplete="bday"
              defaultValue={initialValues?.birthday ?? ""}
            />
          </Field>
          <Field label="CEP" htmlFor="addressPostalCode" error={fieldError("addressPostalCode")}>
            <Input
              id="addressPostalCode"
              name="addressPostalCode"
              autoComplete="postal-code"
              defaultValue={initialValues?.addressPostalCode ?? ""}
            />
          </Field>
          <Field label="Logradouro" htmlFor="addressStreet" error={fieldError("addressStreet")}>
            <Input
              id="addressStreet"
              name="addressStreet"
              autoComplete="address-line1"
              defaultValue={initialValues?.addressStreet ?? ""}
            />
          </Field>
          <Field label="Número" htmlFor="addressNumber" error={fieldError("addressNumber")}>
            <Input
              id="addressNumber"
              name="addressNumber"
              defaultValue={initialValues?.addressNumber ?? ""}
            />
          </Field>
          <Field
            label="Complemento"
            htmlFor="addressComplement"
            error={fieldError("addressComplement")}
          >
            <Input
              id="addressComplement"
              name="addressComplement"
              autoComplete="address-line2"
              defaultValue={initialValues?.addressComplement ?? ""}
            />
          </Field>
          <Field
            label="Bairro"
            htmlFor="addressNeighborhood"
            error={fieldError("addressNeighborhood")}
          >
            <Input
              id="addressNeighborhood"
              name="addressNeighborhood"
              defaultValue={initialValues?.addressNeighborhood ?? ""}
            />
          </Field>
          <Field label="Cidade" htmlFor="addressCity" error={fieldError("addressCity")}>
            <Input
              id="addressCity"
              name="addressCity"
              autoComplete="address-level2"
              defaultValue={initialValues?.addressCity ?? ""}
            />
          </Field>
          <Field label="Estado" htmlFor="addressState" error={fieldError("addressState")}>
            <Input
              id="addressState"
              name="addressState"
              autoComplete="address-level1"
              defaultValue={initialValues?.addressState ?? ""}
            />
          </Field>
        </fieldset>
      ) : null}

      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
