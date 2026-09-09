"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  createShootInventoryReservationAction,
  cancelShootInventoryReservationAction,
  searchInventoryItemsAction,
} from "@/app/admin/(protected)/agenda/[id]/inventory-actions";
import { inventoryStatusLabels, inventoryTypeLabels } from "@/components/admin/inventory-labels";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { DetailSection } from "@/components/admin/detail-section";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type Reservation = {
  id: string;
  itemName: string;
  itemCode: string;
  itemType: string;
  startsOn: string;
  endsOn: string;
  status: string;
  overrideReason: string | null;
};

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  released: "Liberada",
};

function ReservationCancelForm({
  reservationId,
  shootId,
}: {
  reservationId: string;
  shootId: string;
}) {
  const [state, formAction] = useActionState(
    toFormAction(cancelShootInventoryReservationAction),
    null as ActionResult<{ id: string }> | null
  );
  if (state?.ok) return null;
  return (
    <form action={formAction} className="mt-2">
      <FormStatus state={state} />
      <input type="hidden" name="reservationId" value={reservationId} />
      <input type="hidden" name="shootId" value={shootId} />
      <button
        type="submit"
        className="font-sans text-xs text-danger underline-offset-2 hover:underline"
      >
        Cancelar reserva
      </button>
    </form>
  );
}

export function InventoryReservations({
  shootId,
  shootDate,
  reservations = [],
}: {
  shootId: string;
  shootDate: string;
  reservations?: Reservation[];
}) {
  const listId = useId();
  type Item = { id: string; code: string; name: string; type: string; status: string };
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [results, setResults] = useState<Item[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [startsOn, setStartsOn] = useState(shootDate);
  const [endsOn, setEndsOn] = useState(shootDate);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      sequence.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function search(value: string) {
    const request = ++sequence.current;
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
    setResults([]);
    setHighlight(-1);
    setSearching(true);
    setSearchError("");
    timer.current = setTimeout(async () => {
      try {
        const result = await searchInventoryItemsAction({ query: value, shootId });
        if (request !== sequence.current) return;
        if (result.ok) setResults(result.data);
        else setSearchError(result.error);
      } catch {
        if (request === sequence.current)
          setSearchError("Não foi possível buscar os itens. Tente novamente.");
      } finally {
        if (request === sequence.current) setSearching(false);
      }
    }, 200);
  }

  function choose(item: Item) {
    sequence.current += 1;
    if (timer.current) clearTimeout(timer.current);
    setSelected(item);
    setQuery(`${item.code} · ${item.name}`);
    setOpen(false);
    setSearching(false);
    setHighlight(-1);
  }

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, data: FormData) => {
      if (!selected)
        return {
          ok: false as const,
          error: "Selecione um item do acervo.",
          fieldErrors: { inventoryItemId: ["Selecione um resultado da busca."] },
        };
      data.set("inventoryItemId", selected.id);
      const result = await toFormAction(createShootInventoryReservationAction, {
        booleans: ["overrideConflict"],
      })(prev, data);
      if (result.ok) {
        sequence.current += 1;
        setSelected(null);
        setQuery("");
        setResults([]);
        setOpen(false);
        setOverride(false);
        setReason("");
      }
      return result;
    },
    null as ActionResult<{ id: string }> | null
  );
  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;

  return (
    <DetailSection title="Acervo reservado">
      <div className="space-y-3">
        {reservations.length === 0 ? (
          <p className="font-sans text-sm text-muted">Nenhum item reservado para este ensaio.</p>
        ) : null}
        {reservations.map((reservation) => (
          <div
            key={reservation.id}
            className="border-b border-line pb-3 font-sans text-sm last:border-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-ink">
                <span className="text-muted">{reservation.itemCode}</span> · {reservation.itemName}{" "}
                <span className="text-muted">
                  ({inventoryTypeLabels[reservation.itemType] ?? reservation.itemType})
                </span>
              </p>
              <Badge
                tone={
                  reservation.status === "confirmed"
                    ? "success"
                    : reservation.status === "cancelled"
                      ? "danger"
                      : "neutral"
                }
              >
                {statusLabel[reservation.status] ?? reservation.status}
              </Badge>
            </div>
            <p className="mt-1 text-muted">
              Período: {reservation.startsOn} a {reservation.endsOn}
            </p>
            {reservation.status === "cancelled" ? (
              <p className="mt-1 text-danger">Reserva cancelada</p>
            ) : null}
            {reservation.overrideReason ? (
              <p className="mt-1 text-muted">Exceção: {reservation.overrideReason}</p>
            ) : null}
            {reservation.status !== "cancelled" && reservation.status !== "released" ? (
              <ReservationCancelForm reservationId={reservation.id} shootId={shootId} />
            ) : null}
          </div>
        ))}
      </div>

      <form action={formAction} className="mt-5 grid gap-4 border-t border-line pt-5">
        <FormStatus state={state} />
        {state?.ok ? (
          <p role="status" className="font-sans text-sm">
            Reserva adicionada. Selecione outro item para continuar.
          </p>
        ) : null}
        <input type="hidden" name="shootId" value={shootId} />
        <input type="hidden" name="inventoryItemId" value={selected?.id ?? ""} />
        <Field
          label="Item do acervo"
          htmlFor="inventoryItemSearch"
          hint="Busque por código ou nome e selecione um resultado."
          error={fieldError("inventoryItemId")}
        >
          <Input
            id="inventoryItemSearch"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && highlight >= 0 ? `${listId}-${highlight}` : undefined}
            autoComplete="off"
            maxLength={120}
            required
            disabled={pending}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
              search(event.target.value);
            }}
            onFocus={() => {
              if (!selected) search(query);
            }}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                return;
              }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                setHighlight((index) =>
                  results.length
                    ? ((index < 0 && event.key === "ArrowUp" ? 0 : index) +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        results.length) %
                      results.length
                    : -1
                );
              }
              if (event.key === "Enter" && open) {
                event.preventDefault();
                if (results[highlight]) choose(results[highlight]);
              }
            }}
          />
          {open ? (
            <div className="border border-line bg-white p-2">
              <p role="status" className="p-2 font-sans text-xs text-muted">
                {searching
                  ? "Buscando itens…"
                  : searchError ||
                    (results.length
                      ? "Selecione um item. A disponibilidade no período será verificada ao reservar."
                      : "Nenhum item disponível encontrado.")}
              </p>
              <ul
                id={listId}
                role="listbox"
                aria-label="Itens do acervo"
                className="max-h-60 overflow-y-auto"
              >
                {results.map((item, index) => (
                  <li
                    key={item.id}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={highlight === index}
                    className={`cursor-pointer p-3 font-sans text-sm ${highlight === index ? "bg-champ" : "hover:bg-champ"}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(item)}
                  >
                    {item.code} · {item.name} · {inventoryTypeLabels[item.type]} ·{" "}
                    {inventoryStatusLabels[item.status]}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início" htmlFor="startsOn" error={fieldError("startsOn")}>
            <Input
              id="startsOn"
              name="startsOn"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              required
            />
          </Field>
          <Field label="Fim" htmlFor="endsOn" error={fieldError("endsOn")}>
            <Input
              id="endsOn"
              name="endsOn"
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              required
            />
          </Field>
        </div>
        <label className="flex items-start gap-2 font-sans text-sm text-ink">
          <input
            id="overrideConflict"
            name="overrideConflict"
            type="checkbox"
            className="mt-1"
            checked={override}
            onChange={(event) => setOverride(event.target.checked)}
          />
          <span>Registrar exceção por conflito</span>
        </label>
        <Field
          label="Motivo da exceção"
          htmlFor="overrideReason"
          hint="Obrigatório quando houver exceção"
          error={fieldError("overrideReason")}
        >
          <Textarea
            id="overrideReason"
            name="overrideReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required={override}
          />
        </Field>
        <div>
          <SubmitButton>Reservar item</SubmitButton>
        </div>
      </form>
    </DetailSection>
  );
}
