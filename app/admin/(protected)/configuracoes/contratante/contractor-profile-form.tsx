"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { saveContractorProfileAction } from "@/domain/contractor-profile/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type PersonType = "individual" | "company";

type InitialProfile = {
  personType: PersonType;
  legalName: string;
  document: string;
  address: string;
} | null;

export function ContractorProfileForm({ initialProfile }: { initialProfile: InitialProfile }) {
  const router = useRouter();
  const [personType, setPersonType] = useState<PersonType>(initialProfile?.personType ?? "individual");
  const [state, formAction] = useActionState(
    async (previousState: ActionResult<{ id: string }> | null, formData: FormData) => {
      const result = await toFormAction(saveContractorProfileAction)(previousState, formData);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );
  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;
  const isCompany = personType === "company";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormStatus state={state} />
      {state?.ok ? <p className="font-sans text-sm text-[#1e7d4f]">Dados da contratante salvos.</p> : null}
      <Field label="Tipo de pessoa" htmlFor="personType" error={fieldError("personType")}>
        <Select
          id="personType"
          name="personType"
          value={personType}
          onChange={(event) => setPersonType(event.target.value as PersonType)}
        >
          <option value="individual">Pessoa física</option>
          <option value="company">Pessoa jurídica</option>
        </Select>
      </Field>
      <Field label={isCompany ? "Razão social" : "Nome completo"} htmlFor="legalName" error={fieldError("legalName")}>
        <Input id="legalName" name="legalName" required defaultValue={initialProfile?.legalName ?? ""} />
      </Field>
      <Field label={isCompany ? "CNPJ" : "CPF"} htmlFor="document" error={fieldError("document")}>
        <Input id="document" name="document" required inputMode="numeric" defaultValue={initialProfile?.document ?? ""} />
      </Field>
      <Field label="Endereço" htmlFor="address" error={fieldError("address")}>
        <Textarea id="address" name="address" required defaultValue={initialProfile?.address ?? ""} />
      </Field>
      <div>
        <SubmitButton>Salvar dados da contratante</SubmitButton>
      </div>
    </form>
  );
}
