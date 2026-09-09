"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
  deactivateInventoryItemAction,
  uploadInventoryMediaAction,
  removeInventoryMediaAction,
  setInventoryMediaCoverAction,
} from "@/app/admin/(protected)/inventario/actions";
import { type ActionResult, toFormAction } from "@/lib/auth/action-result";
import type { InventoryListRow } from "@/domain/inventory/queries";
import { inventoryItemTypeValues, inventoryItemStatusValues } from "@/domain/inventory/schema";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";
import { inventoryTypeLabels, inventoryStatusLabels } from "@/components/admin/inventory-labels";

export function InventoryItemForm({
  initialValues,
}: {
  initialValues?: Omit<InventoryListRow, "futureReservations">;
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    code: initialValues?.code ?? "",
    name: initialValues?.name ?? "",
    type: initialValues?.type ?? "outfit",
    status: initialValues?.status ?? "available",
    color: initialValues?.color ?? "",
    size: initialValues?.size ?? "",
    description: initialValues?.description ?? "",
    internalPrice: initialValues?.internalPrice ?? "",
  });
  const [active, setActive] = useState(initialValues?.active ?? true);
  const field = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((previous) => ({ ...previous, [key]: event.target.value })),
  });
  const [state, action] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, data: FormData) => {
      const result = initialValues
        ? await updateInventoryItemAction({
            ...Object.fromEntries(data),
            active: data.has("active"),
            internalPrice: data.get("internalPrice") || null,
          })
        : await toFormAction(createInventoryItemAction, { booleans: ["active"] })(prev, data);
      if (result.ok && !initialValues) router.push(`/admin/inventario/${result.data.id}`);
      return result;
    },
    null
  );
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);
  return (
    <form action={action} className="grid gap-5">
      <FormStatus state={state} />
      {state?.ok ? (
        <p role="status" className="font-sans text-sm">
          Item salvo.
        </p>
      ) : null}
      {initialValues ? <input type="hidden" name="id" value={initialValues.id} /> : null}
      <p className="font-sans text-sm text-muted">
        A foto é opcional. Você pode adicionar imagens após salvar o item.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" htmlFor="item-code" error={error("code")}>
          <Input id="item-code" name="code" required {...field("code")} />
        </Field>
        <Field label="Nome" htmlFor="item-name" error={error("name")}>
          <Input id="item-name" name="name" required {...field("name")} />
        </Field>
        <Field label="Tipo do item" htmlFor="item-type" error={error("type")}>
          <Select id="item-type" name="type" {...field("type")}>
            {inventoryItemTypeValues.map((type) => (
              <option key={type} value={type}>
                {inventoryTypeLabels[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status do item" htmlFor="item-status" error={error("status")}>
          <Select id="item-status" name="status" {...field("status")}>
            {inventoryItemStatusValues.map((status) => (
              <option key={status} value={status}>
                {inventoryStatusLabels[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cor do item" htmlFor="item-color" error={error("color")}>
          <Input id="item-color" name="color" {...field("color")} />
        </Field>
        <Field label="Tamanho do item" htmlFor="item-size" error={error("size")}>
          <Input id="item-size" name="size" {...field("size")} />
        </Field>
      </div>
      <Field label="Descrição interna" htmlFor="item-description" error={error("description")}>
        <Textarea id="item-description" name="description" {...field("description")} />
      </Field>
      <Field
        label="Preço interno"
        htmlFor="item-price"
        hint="Opcional, em reais. Ex.: 300.00"
        error={error("internalPrice")}
      >
        <Input
          id="item-price"
          name="internalPrice"
          inputMode="decimal"
          {...field("internalPrice")}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-2 font-sans text-sm">
        <input
          name="active"
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />{" "}
        Ativo no acervo
      </label>
      <div>
        <SubmitButton>{initialValues ? "Salvar item" : "Criar item"}</SubmitButton>
      </div>
    </form>
  );
}

export function InventoryDeactivateForm({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(toFormAction(deactivateInventoryItemAction), null);
  if (!active || state?.ok)
    return (
      <p role="status" className="font-sans text-sm text-muted">
        Item inativo. As reservas existentes permanecem no histórico.
      </p>
    );
  return (
    <form action={action} className="mt-6 grid gap-3 border-t border-line pt-5">
      <FormStatus state={state} />
      <input type="hidden" name="id" value={id} />
      <p className="font-sans text-sm text-muted">
        Inativar impede novas seleções. As reservas já registradas são preservadas.
      </p>
      <div>
        <SubmitButton>Inativar item</SubmitButton>
      </div>
    </form>
  );
}

type Media = { id: string; signedUrl: string; isCover: boolean };

function MediaControl({
  itemId,
  mediaId,
  cover,
}: {
  itemId: string;
  mediaId: string;
  cover?: boolean;
}) {
  const [state, action] = useActionState(
    toFormAction(cover ? setInventoryMediaCoverAction : removeInventoryMediaAction),
    null
  );
  return (
    <form action={action} className="grid gap-2">
      <FormStatus state={state} />
      <input type="hidden" name="inventoryItemId" value={itemId} />
      <input type="hidden" name="mediaId" value={mediaId} />
      <SubmitButton>{cover ? "Definir como capa" : "Remover foto"}</SubmitButton>
    </form>
  );
}

export function InventoryMediaManager({
  itemId,
  name,
  media,
}: {
  itemId: string;
  name: string;
  media: Media[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [state, action] = useActionState(
    async (_prev: ActionResult<{ id: string }> | null, data: FormData) => {
      if (!file || file.size > 4 * 1024 * 1024)
        return { ok: false as const, error: "Selecione uma foto de até 4 MB." };
      data.set("file", file);
      const result = await uploadInventoryMediaAction({
        inventoryItemId: itemId,
        file: data.get("file"),
      });
      if (result.ok) setFile(null);
      return result;
    },
    null
  );
  return (
    <div className="space-y-5">
      <p className="font-sans text-sm text-muted">
        Fotos privadas, disponíveis apenas para a equipe. JPEG, PNG ou WebP, até 4 MB por foto.
      </p>
      {!media.length ? (
        <p className="font-sans text-sm text-muted">Sem foto cadastrada.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {media.map((photo) => (
            <div key={photo.id} className="space-y-3 border border-line p-3">
              {/* Signed private URLs must not be cached by the public image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.signedUrl}
                alt={name}
                className="aspect-square w-full object-cover"
                referrerPolicy="no-referrer"
              />
              {photo.isCover ? (
                <p className="font-sans text-xs">Capa</p>
              ) : (
                <MediaControl itemId={itemId} mediaId={photo.id} cover />
              )}
              <MediaControl itemId={itemId} mediaId={photo.id} />
            </div>
          ))}
        </div>
      )}
      <form action={action} className="grid gap-3">
        <FormStatus state={state} />
        {state?.ok ? <p role="status">Foto adicionada.</p> : null}
        <Field
          label="Adicionar foto"
          htmlFor="inventory-photo"
          error={state && !state.ok ? state.fieldErrors?.file?.[0] : undefined}
        >
          <Input
            id="inventory-photo"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <div>
          <SubmitButton>Enviar foto</SubmitButton>
        </div>
      </form>
    </div>
  );
}
