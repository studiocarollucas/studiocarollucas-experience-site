"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createUpsellProductAction, updateUpsellProductAction } from "@/domain/upsell/actions";
import { upsellProductKindLabels, upsellProductKinds } from "@/domain/upsell/labels";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export type UpsellProductInitialValues = {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  internalNotes: string | null;
  price: string;
  active: boolean;
  sortOrder: number;
};

export function UpsellProductForm({ initialValues }: { initialValues?: UpsellProductInitialValues }) {
  const router = useRouter();
  const action = initialValues ? updateUpsellProductAction : createUpsellProductAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, formData: FormData) => {
      const result = await toFormAction(action, { numbers: ["sortOrder"], booleans: ["active"] })(prev, formData);
      if (result.ok) router.push("/admin/upsells");
      return result;
    },
    null,
  );
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {initialValues ? <input name="id" type="hidden" value={initialValues.id} /> : null}
      <FormStatus state={state} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo" htmlFor="kind" error={error("kind")}>
          <Select id="kind" name="kind" required defaultValue={initialValues?.kind ?? ""}>
            <option value="" disabled>
              Selecione…
            </option>
            {upsellProductKinds.map((kind) => (
              <option key={kind} value={kind}>
                {upsellProductKindLabels[kind]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Preço interno (por unidade)" htmlFor="price" hint="Ex.: 350.00" error={error("price")}>
          <Input id="price" name="price" inputMode="decimal" required defaultValue={initialValues?.price} />
        </Field>
      </div>
      <Field label="Nome" htmlFor="name" error={error("name")}>
        <Input id="name" name="name" required defaultValue={initialValues?.name} />
      </Field>
      <Field
        label="Descrição para a cliente"
        htmlFor="description"
        hint="Aparece na galeria da cliente."
        error={error("description")}
      >
        <Textarea id="description" name="description" defaultValue={initialValues?.description ?? ""} />
      </Field>
      <Field
        label="Notas internas"
        htmlFor="internalNotes"
        hint="Só a equipe vê (fornecedor, prazo, acabamento)."
        error={error("internalNotes")}
      >
        <Textarea id="internalNotes" name="internalNotes" defaultValue={initialValues?.internalNotes ?? ""} />
      </Field>
      <Field label="Ordem de exibição" htmlFor="sortOrder" error={error("sortOrder")}>
        <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={initialValues?.sortOrder ?? 0} />
      </Field>
      <label className="flex min-h-11 items-center gap-2 font-sans text-sm">
        <input name="active" type="checkbox" defaultChecked={initialValues?.active ?? true} /> Ativo (pode ser ofertado e
        pedido)
      </label>
      <SubmitButton>{initialValues ? "Salvar produto" : "Criar produto"}</SubmitButton>
    </form>
  );
}
