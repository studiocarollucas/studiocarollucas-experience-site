"use client";

import { useActionState, useState } from "react";
import {
  previewInventoryImportAction,
  commitInventoryImportAction,
} from "@/app/admin/(protected)/inventario/actions";
import type { InventoryImportPreview } from "@/domain/inventory/import";
import type { ActionResult } from "@/lib/auth/action-result";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";

function ImportConfirmation({ preview }: { preview: InventoryImportPreview }) {
  const [state, action] = useActionState(
    async (_prev: ActionResult<{ created: number }> | null, data: FormData) =>
      commitInventoryImportAction({
        previewToken: preview.previewToken,
        selectedRowNumbers: data.getAll("selectedRowNumbers").map(Number),
      }),
    null
  );
  if (state?.ok)
    return (
      <p role="status" className="font-sans text-sm">
        {state.data.created} {state.data.created === 1 ? "item importado" : "itens importados"}.
        Gere outra prévia para continuar.
      </p>
    );
  return (
    <form action={action} className="space-y-4">
      <FormStatus state={state} />
      {state && !state.ok && state.fieldErrors?.selectedRowNumbers ? (
        <p role="alert" className="font-sans text-sm text-danger">
          Selecione ao menos uma linha válida.
        </p>
      ) : null}
      <p className="font-sans text-sm text-muted">
        Confira os dados e selecione as linhas válidas que deseja importar. Códigos existentes não
        serão sobrescritos.
      </p>
      <DataTable
        rows={preview.rows}
        rowKey={(row) => String(row.rowNumber)}
        columns={[
          {
            key: "select",
            header: "Importar",
            render: (row) => (
              <input
                type="checkbox"
                name="selectedRowNumbers"
                value={row.rowNumber}
                aria-label={`Importar linha ${row.rowNumber}`}
                disabled={row.errors.length > 0}
              />
            ),
          },
          { key: "line", header: "Linha", render: (row) => row.rowNumber },
          { key: "item", header: "Item", render: (row) => `${row.input.code} · ${row.input.name}` },
          {
            key: "details",
            header: "Dados",
            render: (row) => (
              <div className="space-y-1">
                <p>
                  {row.input.type} · {row.input.status ?? "available"} ·{" "}
                  {row.input.active === false ? "Inativo" : "Ativo"}
                </p>
                <p>
                  {[row.input.color, row.input.size, row.input.internalPrice]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {row.input.description ? <p>{row.input.description}</p> : null}
              </div>
            ),
          },
          {
            key: "errors",
            header: "Validação",
            render: (row) =>
              row.errors.length ? (
                <ul className="text-danger">
                  {row.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : (
                "Pronta para importar"
              ),
          },
        ]}
        empty={
          <p className="font-sans text-sm">
            A planilha não contém itens. Preencha o modelo e gere outra prévia.
          </p>
        }
      />
      {preview.rows.some((row) => row.errors.length === 0) ? (
        <SubmitButton>Confirmar importação</SubmitButton>
      ) : null}
    </form>
  );
}

export function InventoryImport() {
  const [file, setFile] = useState<File | null>(null);
  const [state, action, pending] = useActionState(
    async (): Promise<ActionResult<InventoryImportPreview>> => {
      if (!file || file.size > 4 * 1024 * 1024)
        return { ok: false as const, error: "Selecione uma planilha XLSX de até 4 MB." };
      return previewInventoryImportAction({ file });
    },
    null
  );
  return (
    <div className="space-y-5">
      <p className="font-sans text-sm text-muted">
        Use a aba Acervo do modelo. A prévia não grava itens e expira em 15 minutos.
      </p>
      <form action={action} className="grid gap-4">
        <FormStatus state={state} />
        <Field
          label="Planilha XLSX"
          htmlFor="inventory-xlsx"
          error={state && !state.ok ? state.fieldErrors?.file?.[0] : undefined}
        >
          <Input
            id="inventory-xlsx"
            name="file"
            type="file"
            accept=".xlsx"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <div>
          <SubmitButton>Gerar prévia</SubmitButton>
        </div>
      </form>
      {!pending && state?.ok ? (
        <ImportConfirmation key={state.data.previewToken} preview={state.data} />
      ) : null}
    </div>
  );
}
