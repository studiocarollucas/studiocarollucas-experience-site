"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";
import { issueContractAction } from "@/domain/contracts/actions";
import { toFormAction } from "@/lib/auth/action-result";
import Link from "next/link";

type CivilData = {
  cpf: string | null;
  birthday: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
};

export function ContractIssuePanel({
  shootId,
  contractorConfigured,
  initialCivilData,
}: {
  shootId: string;
  contractorConfigured: boolean;
  initialCivilData: CivilData;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(toFormAction(issueContractAction), null);
  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;
  const issued = state?.ok ? state.data : null;

  useEffect(() => {
    if (issued) router.refresh();
  }, [issued, router]);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <FormStatus state={state} />
      <input type="hidden" name="shootId" value={shootId} />

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-xl text-ink">Dados civis no contrato</legend>
        <Field label="CPF" htmlFor="cpf" error={fieldError("cpf")}>
          <Input id="cpf" name="cpf" required autoComplete="off" defaultValue={initialCivilData.cpf ?? ""} />
        </Field>
        <Field label="Data de nascimento" htmlFor="birthday" error={fieldError("birthday")}>
          <Input id="birthday" name="birthday" type="date" required defaultValue={initialCivilData.birthday ?? ""} />
        </Field>
        <Field label="CEP" htmlFor="addressPostalCode" error={fieldError("addressPostalCode")}>
          <Input id="addressPostalCode" name="addressPostalCode" required autoComplete="postal-code" defaultValue={initialCivilData.addressPostalCode ?? ""} />
        </Field>
        <Field label="Logradouro" htmlFor="addressStreet" error={fieldError("addressStreet")}>
          <Input id="addressStreet" name="addressStreet" required autoComplete="address-line1" defaultValue={initialCivilData.addressStreet ?? ""} />
        </Field>
        <Field label="Número" htmlFor="addressNumber" error={fieldError("addressNumber")}>
          <Input id="addressNumber" name="addressNumber" required defaultValue={initialCivilData.addressNumber ?? ""} />
        </Field>
        <Field label="Complemento" htmlFor="addressComplement" error={fieldError("addressComplement")}>
          <Input id="addressComplement" name="addressComplement" autoComplete="address-line2" defaultValue={initialCivilData.addressComplement ?? ""} />
        </Field>
        <Field label="Bairro" htmlFor="addressNeighborhood" error={fieldError("addressNeighborhood")}>
          <Input id="addressNeighborhood" name="addressNeighborhood" required defaultValue={initialCivilData.addressNeighborhood ?? ""} />
        </Field>
        <Field label="Cidade" htmlFor="addressCity" error={fieldError("addressCity")}>
          <Input id="addressCity" name="addressCity" required autoComplete="address-level2" defaultValue={initialCivilData.addressCity ?? ""} />
        </Field>
        <Field label="Estado" htmlFor="addressState" error={fieldError("addressState")}>
          <Input id="addressState" name="addressState" required maxLength={2} autoComplete="address-level1" defaultValue={initialCivilData.addressState ?? ""} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-2 border-t border-line pt-5">
        <legend className="font-serif text-xl text-ink">Uso de imagem no contrato</legend>
        <label className="flex items-center gap-2 font-sans text-sm text-ink">
          <input required type="radio" name="imageUsage" value="authorized" /> Autorizo o uso de imagem
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-ink">
          <input required type="radio" name="imageUsage" value="not_authorized" /> Não autorizo o uso de imagem
        </label>
        {fieldError("imageUsage") ? <p role="alert" className="font-sans text-xs text-danger">{fieldError("imageUsage")}</p> : null}
      </fieldset>

      {contractorConfigured ? <SubmitButton>Emitir contrato</SubmitButton> : <p role="alert">Cadastre a contratante antes de emitir o contrato. <Link href="/admin/configuracoes/contratante" className="underline">Configurar contratante</Link></p>}

      {issued ? (
        <a href={`/api/admin/contracts/${issued.id}/download`} className="underline underline-offset-2">
          Baixar PDF {issued.contractNumber}
        </a>
      ) : null}
    </form>
  );
}
