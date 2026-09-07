"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createExperiencePackageAction, updateExperiencePackageAction } from "@/domain/catalog/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type FamilyOption = { id: string; name: string; active: boolean };

type PackageInitialValues = {
  id: string;
  familyId: string | null;
  name: string;
  description: string | null;
  basePrice: string;
  includedPhotos: number;
  durationMinutes: number;
  outfitsLimit: number | null;
  sceneCount: number | null;
  participantLimit: number | null;
  videoCount: number;
  makeIncluded: boolean;
  hairIncluded: boolean;
  clutchIncluded: boolean;
  paletteEligible: boolean;
  sortOrder: number;
  active: boolean;
  published: boolean;
  quizEligible: boolean;
};

export function PackageForm({
  families,
  initialValues,
}: {
  families: FamilyOption[];
  initialValues?: PackageInitialValues;
}) {
  const router = useRouter();
  const action = initialValues ? updateExperiencePackageAction : createExperiencePackageAction;
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, formData: FormData) => {
      const result = await toFormAction(action, {
        numbers: [
          "includedPhotos",
          "durationMinutes",
          "outfitsLimit",
          "sceneCount",
          "participantLimit",
          "videoCount",
          "sortOrder",
        ],
        booleans: [
          "makeIncluded",
          "hairIncluded",
          "clutchIncluded",
          "paletteEligible",
          "active",
          "published",
          "quizEligible",
        ],
      })(prev, formData);
      if (result.ok) router.push("/admin/pacotes");
      return result;
    },
    null,
  );
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {initialValues ? <input name="id" type="hidden" value={initialValues.id} /> : null}
      <FormStatus state={state} />
      <Field label="Família" htmlFor="familyId" error={error("familyId")}>
        <Select id="familyId" name="familyId" required defaultValue={initialValues?.familyId ?? ""}>
          <option value="" disabled>Selecione…</option>
          {families
            .filter((family) => family.active || family.id === initialValues?.familyId)
            .map((family) => <option key={family.id} value={family.id}>{family.name}{family.active ? "" : " (inativa)"}</option>)}
        </Select>
      </Field>
      <Field label="Nome do pacote" htmlFor="name" error={error("name")}>
        <Input id="name" name="name" required defaultValue={initialValues?.name} />
      </Field>
      <Field label="Descrição interna" htmlFor="description" error={error("description")}>
        <Textarea id="description" name="description" defaultValue={initialValues?.description ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Preço-base interno" htmlFor="basePrice" hint="Ex.: 599.00" error={error("basePrice")}>
          <Input id="basePrice" name="basePrice" inputMode="decimal" required defaultValue={initialValues?.basePrice} />
        </Field>
        <Field label="Duração (minutos)" htmlFor="durationMinutes" error={error("durationMinutes")}>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={1} required defaultValue={initialValues?.durationMinutes} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fotos incluídas" htmlFor="includedPhotos" error={error("includedPhotos")}>
          <Input id="includedPhotos" name="includedPhotos" type="number" min={1} required defaultValue={initialValues?.includedPhotos} />
        </Field>
        <Field label="Limite de looks / trocas" htmlFor="outfitsLimit" error={error("outfitsLimit")}>
          <Input id="outfitsLimit" name="outfitsLimit" type="number" min={1} defaultValue={initialValues?.outfitsLimit ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Cenários" htmlFor="sceneCount" error={error("sceneCount")}>
          <Input id="sceneCount" name="sceneCount" type="number" min={1} defaultValue={initialValues?.sceneCount ?? ""} />
        </Field>
        <Field label="Acompanhantes" htmlFor="participantLimit" error={error("participantLimit")}>
          <Input id="participantLimit" name="participantLimit" type="number" min={1} defaultValue={initialValues?.participantLimit ?? ""} />
        </Field>
        <Field label="Vídeos" htmlFor="videoCount" error={error("videoCount")}>
          <Input id="videoCount" name="videoCount" type="number" min={0} defaultValue={initialValues?.videoCount ?? 0} />
        </Field>
      </div>
      <Field label="Ordem de exibição" htmlFor="sortOrder" error={error("sortOrder")}>
        <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={initialValues?.sortOrder ?? 0} />
      </Field>
      <fieldset className="grid grid-cols-2 gap-3 border border-line p-4">
        <legend className="px-1 font-sans text-xs uppercase tracking-[0.12em] text-muted">Inclusões e visibilidade</legend>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="makeIncluded" type="checkbox" defaultChecked={initialValues?.makeIncluded} /> Make incluída</label>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="hairIncluded" type="checkbox" defaultChecked={initialValues?.hairIncluded} /> Cabelo incluído</label>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="clutchIncluded" type="checkbox" defaultChecked={initialValues?.clutchIncluded} /> Clutch incluída</label>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="paletteEligible" type="checkbox" defaultChecked={initialValues?.paletteEligible} /> Permite paleta inicial</label>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="active" type="checkbox" defaultChecked={initialValues?.active ?? true} /> Ativo no Studio OS</label>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm"><input name="published" type="checkbox" defaultChecked={initialValues?.published} /> Publicado no site</label>
        <label className="col-span-2 flex min-h-11 items-center gap-2 font-sans text-sm"><input name="quizEligible" type="checkbox" defaultChecked={initialValues?.quizEligible} /> Disponível no quiz</label>
      </fieldset>
      <SubmitButton>{initialValues ? "Salvar pacote" : "Criar pacote"}</SubmitButton>
    </form>
  );
}
