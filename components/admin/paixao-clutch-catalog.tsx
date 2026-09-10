"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { updatePaixaoClutchAction, reorderPaixaoClutchAction } from "@/app/admin/(protected)/paixao-clutch/actions";
import type { PaixaoClutchAdminFilters } from "@/domain/inventory/clutch-schema";
import { type ActionResult, toFormAction } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export type PaixaoClutchCatalogItem = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  status: "available" | "maintenance" | "retired";
  rentalPrice: string | null;
  replacementValue: string | null;
  copy: string | null;
  publicImagePath: string | null;
  published: boolean;
  featured: boolean;
  sortOrder: number;
};

const statusLabels = {
  available: "Disponível para operação",
  maintenance: "Em manutenção",
  retired: "Retirada do acervo",
} as const;

function ClutchEditor({ item }: { item: PaixaoClutchCatalogItem }) {
  const [values, setValues] = useState({
    rentalPrice: item.rentalPrice ?? "",
    replacementValue: item.replacementValue ?? "",
    copy: item.copy ?? "",
    publicImagePath: item.publicImagePath ?? "",
  });
  const [published, setPublished] = useState(item.published);
  const [featured, setFeatured] = useState(item.featured);
  const [state, action] = useActionState(
    toFormAction(updatePaixaoClutchAction, {
      booleans: ["published", "featured"],
    }),
    null
  );
  const field = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value })),
  });
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);
  const operationalStatus = !item.active ? "Item inativo" : statusLabels[item.status];

  return (
    <article className="border border-line bg-white p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-ink">{item.name}</h2>
          <p className="font-sans text-xs text-muted">{item.code}</p>
        </div>
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted">
          {operationalStatus}
        </p>
      </div>
      <form action={action} className="grid gap-4">
        <FormStatus state={state} />
        {state?.ok ? (
          <p role="status" className="font-sans text-sm">
            Curadoria salva.
          </p>
        ) : null}
        <input type="hidden" name="itemId" value={item.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Preço de aluguel"
            htmlFor={`${item.id}-rental-price`}
            error={error("rentalPrice")}
            hint="Opcional, em reais. Ex.: 120.00"
          >
            <Input
              id={`${item.id}-rental-price`}
              name="rentalPrice"
              inputMode="decimal"
              {...field("rentalPrice")}
            />
          </Field>
          <Field
            label="Valor de reposição"
            htmlFor={`${item.id}-replacement-value`}
            error={error("replacementValue")}
            hint="Uso administrativo, em reais."
          >
            <Input
              id={`${item.id}-replacement-value`}
              name="replacementValue"
              inputMode="decimal"
              {...field("replacementValue")}
            />
          </Field>
        </div>
        <Field
          label="Copy curta"
          htmlFor={`${item.id}-copy`}
          error={error("copy")}
          hint="Até 280 caracteres."
        >
          <Textarea id={`${item.id}-copy`} name="copy" maxLength={280} {...field("copy")} />
        </Field>
        <Field
          label="Referência da imagem pública"
          htmlFor={`${item.id}-public-image`}
          error={error("publicImagePath")}
          hint="Imagem pública própria: /images/paixao-clutch/nome-do-arquivo.jpg (ou png/webp). A referência não envia nem publica arquivos."
        >
          <Input
            id={`${item.id}-public-image`}
            name="publicImagePath"
            {...field("publicImagePath")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-end gap-3 pb-1">
            <label className="flex min-h-11 items-center gap-2 font-sans text-sm">
              <input
                name="published"
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
              />
              Publicar na Paixão Clutch
            </label>
            <label className="flex min-h-11 items-center gap-2 font-sans text-sm">
              <input
                name="featured"
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
              />
              Destacar na curadoria
            </label>
          </div>
        </div>
        <div>
          <SubmitButton>Salvar curadoria</SubmitButton>
        </div>
      </form>
    </article>
  );
}

function PublishedOrder({ items }: { items: PaixaoClutchCatalogItem[] }) {
  const [ordered, setOrdered] = useState(items);
  const [state, action, pending] = useActionState(
    async (_previous: ActionResult<{ reordered: boolean }> | null, formData: FormData) =>
      reorderPaixaoClutchAction({ itemIds: formData.getAll("itemIds") }),
    null,
  );
  function move(index: number, offset: number) {
    setOrdered((current) => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  return (
    <form action={action} className="space-y-4 border border-line bg-white p-5">
      <h2 className="font-serif text-xl text-ink">Ordem dos publicados</h2>
      <p className="font-sans text-sm text-muted">Toda a coleção publicada, independentemente dos filtros abaixo.</p>
      <FormStatus state={state} />
      {state?.ok ? <p role="status">Ordem salva.</p> : null}
      <ol className="space-y-3">
        {ordered.map((item, index) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 font-sans text-sm">
            <input type="hidden" name="itemIds" value={item.id} />
            <span className="flex-1">{index + 1}. {item.name} · {item.code}</span>
            <button type="button" aria-label={`Subir ${item.name}`} disabled={pending || index === 0}
              onClick={() => move(index, -1)} className="min-h-11 border border-line px-3 disabled:opacity-40">Subir</button>
            <button type="button" aria-label={`Descer ${item.name}`} disabled={pending || index === ordered.length - 1}
              onClick={() => move(index, 1)} className="min-h-11 border border-line px-3 disabled:opacity-40">Descer</button>
          </li>
        ))}
      </ol>
      {ordered.length ? <SubmitButton>Salvar ordem dos publicados</SubmitButton>
        : <p className="font-sans text-sm text-muted">Nenhuma clutch publicada.</p>}
    </form>
  );
}

export function PaixaoClutchCatalog({
  items,
  publishedItems = [],
  filters = {},
}: {
  items: PaixaoClutchCatalogItem[];
  publishedItems?: PaixaoClutchCatalogItem[];
  filters?: PaixaoClutchAdminFilters;
}) {
  return (
    <div className="space-y-5">
      <PublishedOrder
        key={publishedItems.map((item) => `${item.id}:${item.sortOrder}`).join(",")}
        items={publishedItems.filter((item) => item.published)}
      />
      <form
        method="get"
        action="/admin/paixao-clutch"
        className="grid gap-4 border border-line bg-white p-5 sm:grid-cols-4"
      >
        <Field label="Atividade" htmlFor="clutch-active">
          <Select
            id="clutch-active"
            name="active"
            defaultValue={filters.active === undefined ? "" : String(filters.active)}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </Select>
        </Field>
        <Field label="Publicação" htmlFor="clutch-published">
          <Select
            id="clutch-published"
            name="published"
            defaultValue={filters.published === undefined ? "" : String(filters.published)}
          >
            <option value="">Todos</option>
            <option value="true">Publicados</option>
            <option value="false">Não publicados</option>
          </Select>
        </Field>
        <Field label="Destaque" htmlFor="clutch-featured">
          <Select
            id="clutch-featured"
            name="featured"
            defaultValue={filters.featured === undefined ? "" : String(filters.featured)}
          >
            <option value="">Todos</option>
            <option value="true">Em destaque</option>
            <option value="false">Sem destaque</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <button type="submit" className="border border-ink px-5 py-3 font-sans text-sm">
            Filtrar
          </button>
        </div>
      </form>
      <p className="font-sans text-sm text-muted">
        {items.length} {items.length === 1 ? "clutch encontrada" : "clutches encontradas"}
      </p>
      {items.length ? (
        <div className="grid gap-5">
          {items.map((item) => (
            <ClutchEditor key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="border border-line bg-white p-5 font-sans text-sm text-muted">
          Nenhuma clutch encontrada para estes filtros.
        </p>
      )}
    </div>
  );
}
