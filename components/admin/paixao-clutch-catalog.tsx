"use client";

import { useActionState, useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { studioDate } from "@/domain/portal/countdown";
import type { FutureInventoryReservation } from "@/domain/inventory/queries";
import { updatePaixaoClutchAction, reorderPaixaoClutchAction, uploadInventoryPublicMediaAction, promoteInventoryMediaAction, removeInventoryPublicMediaAction, readPaixaoClutchPrivateMediaAction } from "@/app/admin/(protected)/paixao-clutch/actions";
import { publicInventoryMediaFileSchema, type PaixaoClutchAdminFilters } from "@/domain/inventory/clutch-schema";
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
  eligible: boolean;
  futureReservations: FutureInventoryReservation[];
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

function PublicMediaEditor({ item, onRemove, onRemoveFailure }: {
  item: PaixaoClutchCatalogItem;
  onRemove: () => void;
  onRemoveFailure: () => void;
}) {
  const [publicPath, setPublicPath] = useState(item.publicImagePath);
  const [serverPublicPath, setServerPublicPath] = useState(item.publicImagePath);
  const [file, setFile] = useState<File | null>(null);
  const uploadForm = useRef<HTMLFormElement>(null);
  const [photos, setPhotos] = useState<Array<{ id: string; signedUrl: string }> | null>(null);
  const [state, setState] = useState<ActionResult<{ publicPath: string | null }> | null>(null);
  const [pending, startTransition] = useTransition();
  const buttonClass = "min-h-11 border border-line px-4 py-2 font-sans text-sm disabled:opacity-40";
  if (serverPublicPath !== item.publicImagePath) {
    setServerPublicPath(item.publicImagePath);
    setPublicPath(item.publicImagePath);
  }

  function changeMedia(
    change: () => Promise<ActionResult<{ publicPath: string | null }>>,
    onFailure?: () => void,
  ) {
    startTransition(async () => {
      setState(null);
      try {
        const result = await change();
        setState(result);
        if (result.ok) {
          setPublicPath(result.data.publicPath);
          if (!result.data.publicPath) onRemove();
        } else {
          onFailure?.();
        }
      } catch {
        setState({ ok: false, error: "Não foi possível concluir a operação. Tente novamente." });
        onFailure?.();
      }
    });
  }

  return (
    <section aria-label={`Imagem pública de ${item.name}`} className="mb-5 space-y-4 border border-line p-4">
      <h3 className="font-serif text-lg">Imagem pública</h3>
      <p className="font-sans text-sm text-muted">A imagem enviada ou escolhida ficará acessível publicamente. As demais fotos internas continuam disponíveis apenas para a equipe.</p>
      {publicPath ? (
        // eslint-disable-next-line @next/next/no-img-element -- Public media preview does not need optimization.
        <img src={publicPath} alt={`Imagem pública de ${item.name}`} className="h-48 w-48 object-contain" />
      ) : <p className="font-sans text-sm text-muted">Sem imagem pública.</p>}
      <FormStatus state={state} />
      {state?.ok ? <p role="status" className="font-sans text-sm">{state.data.publicPath ? "Imagem pública salva." : "Imagem pública removida e item despublicado."}</p> : null}
      {state && !state.ok && state.fieldErrors?.file ? <p role="alert" className="font-sans text-sm text-red-700">{state.fieldErrors.file[0]}</p> : null}
      <form ref={uploadForm} onSubmit={(event) => {
        event.preventDefault();
        if (!file || !publicInventoryMediaFileSchema.safeParse(file).success) {
          setState({ ok: false, error: "Envie uma imagem JPEG, PNG ou WebP de até 4 MB." });
          return;
        }
        changeMedia(async () => {
          const result = await uploadInventoryPublicMediaAction({ itemId: item.id, file });
          if (result.ok) {
            setFile(null);
            uploadForm.current?.reset();
          }
          return result;
        });
      }} className="grid gap-3">
        <Field label="Enviar imagem pública" htmlFor={`${item.id}-public-upload`} hint="JPEG, PNG ou WebP, até 4 MB.">
          <Input id={`${item.id}-public-upload`} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </Field>
        <div><button type="submit" disabled={pending || !file} className={buttonClass}>{publicPath ? "Substituir imagem pública" : "Salvar imagem pública"}</button></div>
      </form>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={pending} className={buttonClass} onClick={() => startTransition(async () => {
          setState(null);
          try {
            const result = await readPaixaoClutchPrivateMediaAction({ itemId: item.id });
            if (result.ok) setPhotos(result.data);
            else setState(result);
          } catch {
            setState({ ok: false, error: "Não foi possível carregar as fotos internas. Tente novamente." });
          }
        })}>Usar foto interna</button>
        <button type="button" disabled={pending} className={buttonClass}
          onClick={() => changeMedia(() => removeInventoryPublicMediaAction({ itemId: item.id }), onRemoveFailure)}>Remover imagem pública</button>
      </div>
      <p className="font-sans text-xs text-muted">Remover a imagem também despublica a clutch. Se uma remoção falhar, use o botão novamente.</p>
      {pending ? <p role="status" className="font-sans text-sm">Processando imagem…</p> : null}
      {photos ? <div className="space-y-3">
        <p className="font-sans text-sm">Fotos internas deste item. Escolha uma foto para criar a cópia pública.</p>
        {!photos.length ? <p className="font-sans text-sm text-muted">Este item ainda não tem fotos internas.</p> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => <div key={photo.id} className="space-y-2 border border-line p-3">
            {/* Signed private URLs must bypass the public image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.signedUrl} alt={`Foto interna ${index + 1} de ${item.name}`} referrerPolicy="no-referrer" className="h-32 w-full object-contain" />
            <button type="button" disabled={pending} className={buttonClass}
              onClick={() => changeMedia(() => promoteInventoryMediaAction({ itemId: item.id, mediaId: photo.id }))}>Tornar pública a foto {index + 1}</button>
          </div>)}
        </div>
      </div> : null}
    </section>
  );
}

function ClutchEditor({ item, onRemoveFailure, onRemoveSuccess }: {
  item: PaixaoClutchCatalogItem;
  onRemoveFailure: () => void;
  onRemoveSuccess: () => void;
}) {
  const [values, setValues] = useState({
    rentalPrice: item.rentalPrice ?? "",
    replacementValue: item.replacementValue ?? "",
    copy: item.copy ?? "",
  });
  const [published, setPublished] = useState(item.published);
  const [serverPublished, setServerPublished] = useState(item.published);
  if (serverPublished !== item.published) {
    setServerPublished(item.published);
    setPublished(item.published);
  }
  const [eligible, setEligible] = useState(item.eligible);
  const [featured, setFeatured] = useState(item.featured);
  const [state, action] = useActionState(
    toFormAction(updatePaixaoClutchAction, {
      booleans: ["published", "featured", "eligible"],
    }),
    null
  );
  const field = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value })),
  });
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);
  const today = studioDate();
  const reservedNow = item.futureReservations.some((reservation) =>
    reservation.startsOn <= today && reservation.endsOn >= today);
  const operationalStatus = !item.active ? "Item inativo"
    : item.status !== "available" ? statusLabels[item.status]
    : reservedNow ? "Reservada no momento" : statusLabels.available;

  return (
    <article className="border border-line bg-white p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-ink">{item.name}</h2>
          <p className="font-sans text-xs text-muted">{item.code}</p>
          <Link href={`/admin/inventario/${item.id}`} className="inline-flex min-h-11 items-center font-sans text-sm underline">Abrir ficha do item</Link>
        </div>
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted">
          {operationalStatus}
        </p>
      </div>
      {item.futureReservations.length ? (
        <div className="mb-5 font-sans text-sm">
          <p>Reservas em curso e futuras</p>
          <ul className="mt-1 space-y-1 text-muted">
            {item.futureReservations.map((reservation) => (
              <li key={reservation.id}>{reservation.startsOn} a {reservation.endsOn} · {reservation.status === "confirmed" ? "Confirmada" : "Pendente"}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <PublicMediaEditor item={item} onRemove={() => {
        setPublished(false);
        onRemoveSuccess();
      }} onRemoveFailure={onRemoveFailure} />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-end gap-3 pb-1">
            <label className="flex min-h-11 items-center gap-2 font-sans text-sm">
              <input name="eligible" type="checkbox" checked={eligible} onChange={(event) => {
                setEligible(event.target.checked);
                if (!event.target.checked) setPublished(false);
              }} />
              Habilitar na Paixão Clutch
            </label>
            <label className="flex min-h-11 items-center gap-2 font-sans text-sm">
              <input
                name="published"
                type="checkbox"
                checked={published}
                disabled={!eligible}
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
  const [failedRemovalItem, setFailedRemovalItem] = useState<PaixaoClutchCatalogItem | null>(null);
  const visibleItems = failedRemovalItem && !items.some((item) => item.id === failedRemovalItem.id)
    ? [failedRemovalItem, ...items]
    : items;

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
        {visibleItems.length} {visibleItems.length === 1 ? "clutch encontrada" : "clutches encontradas"}
      </p>
      {visibleItems.length ? (
        <div className="grid gap-5">
          {visibleItems.map((item) => (
            <ClutchEditor
              key={item.id}
              item={item}
              onRemoveFailure={() => setFailedRemovalItem(item)}
              onRemoveSuccess={() => setFailedRemovalItem((current) => current?.id === item.id ? null : current)}
            />
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
