"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createShootAction } from "@/domain/shoots/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function NewShootForm({
  clients,
  packages,
}: {
  clients: { id: string; name: string }[];
  packages: { id: string; name: string; familyName: string }[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(createShootAction, {
        numbers: ["participantCount"],
        booleans: ["portalEnabled"],
      })(prev, fd);
      if (result.ok) router.push(`/admin/agenda/${result.data.id}`);
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <FormStatus state={state} />

      <Field label="Cliente" htmlFor="clientId" error={err("clientId")}>
        <Select id="clientId" name="clientId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Experiência" htmlFor="experiencePackageId" error={err("experiencePackageId")}>
        <Select id="experiencePackageId" name="experiencePackageId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {Object.entries(Object.groupBy(packages, (packageItem) => packageItem.familyName)).map(
            ([familyName, familyPackages]) => (
              <optgroup key={familyName} label={familyName}>
                {familyPackages?.map((packageItem) => (
                  <option key={packageItem.id} value={packageItem.id}>
                    {packageItem.name}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data" htmlFor="shootDate" error={err("shootDate")}>
          <Input id="shootDate" name="shootDate" type="date" required />
        </Field>
        <Field label="Horário" htmlFor="startTime" hint="HH:MM" error={err("startTime")}>
          <Input id="startTime" name="startTime" type="time" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor acordado" htmlFor="agreedPrice" hint="Ex.: 1200.00" error={err("agreedPrice")}>
          <Input id="agreedPrice" name="agreedPrice" inputMode="decimal" required />
        </Field>
        <Field label="Participantes" htmlFor="participantCount" error={err("participantCount")}>
          <Input id="participantCount" name="participantCount" type="number" min={1} />
        </Field>
      </div>

      <Field label="Ocasião" htmlFor="occasion" error={err("occasion")}>
        <Input id="occasion" name="occasion" />
      </Field>
      <Field label="Local" htmlFor="locationName" error={err("locationName")}>
        <Input id="locationName" name="locationName" />
      </Field>
      <Field
        label="Endereço / ponto de encontro"
        htmlFor="locationAddress"
        error={err("locationAddress")}
      >
        <Input id="locationAddress" name="locationAddress" />
      </Field>
      <Field
        label="Orientações para a cliente"
        htmlFor="clientGuidance"
        error={err("clientGuidance")}
      >
        <Textarea id="clientGuidance" name="clientGuidance" />
      </Field>
      <Field label="Indicação / origem" htmlFor="referral" error={err("referral")}>
        <Input id="referral" name="referral" />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" />
      </Field>

      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input type="checkbox" name="portalEnabled" defaultChecked />
        Liberar acesso da cliente ao portal (Minha Experiência)
      </label>

      <div>
        <SubmitButton>Criar ensaio</SubmitButton>
      </div>
    </form>
  );
}
