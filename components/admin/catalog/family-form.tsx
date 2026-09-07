"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createExperienceFamilyAction, updateExperienceFamilyAction } from "@/domain/catalog/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type FamilyInitialValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  published: boolean;
};

export function FamilyForm({ initialValues }: { initialValues?: FamilyInitialValues }) {
  const router = useRouter();
  const action = initialValues ? updateExperienceFamilyAction : createExperienceFamilyAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, formData: FormData) => {
      const result = await toFormAction(action, {
        numbers: ["sortOrder"],
        booleans: ["active", "published"],
      })(prev, formData);
      if (result.ok) router.push("/admin/pacotes/familias");
      return result;
    },
    null,
  );
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {initialValues ? <input name="id" type="hidden" value={initialValues.id} /> : null}
      <FormStatus state={state} />
      <Field label="Nome da família" htmlFor="name" error={error("name")}>
        <Input id="name" name="name" required defaultValue={initialValues?.name} />
      </Field>
      <Field label="Slug" htmlFor="slug" hint="Ex.: 15-anos" error={error("slug")}>
        <Input id="slug" name="slug" required defaultValue={initialValues?.slug} />
      </Field>
      <Field label="Descrição interna" htmlFor="description" error={error("description")}>
        <Textarea id="description" name="description" defaultValue={initialValues?.description ?? ""} />
      </Field>
      <Field label="Ordem de exibição" htmlFor="sortOrder" error={error("sortOrder")}>
        <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={initialValues?.sortOrder ?? 0} />
      </Field>
      <fieldset className="grid grid-cols-2 gap-3 border border-line p-4">
        <legend className="px-1 font-sans text-xs uppercase tracking-[0.12em] text-muted">Disponibilidade</legend>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="active" type="checkbox" defaultChecked={initialValues?.active ?? true} /> Ativa no Studio OS</label>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="published" type="checkbox" defaultChecked={initialValues?.published} /> Publicada no site</label>
      </fieldset>
      <SubmitButton>{initialValues ? "Salvar família" : "Criar família"}</SubmitButton>
    </form>
  );
}
