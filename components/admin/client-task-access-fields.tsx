"use client";

import { useState } from "react";

type ClientTaskAccessFieldsProps = {
  fieldErrors?: Record<string, string[]>;
};

export function ClientTaskAccessFields({ fieldErrors }: ClientTaskAccessFieldsProps) {
  const visibilityError = fieldErrors?.visibleToClient?.[0];
  const actionableError = fieldErrors?.clientActionable?.[0];
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [clientActionable, setClientActionable] = useState(false);

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 font-sans text-xs font-medium text-muted">
        Acesso da cliente
      </legend>
      <label className="flex min-h-11 items-center gap-2 font-sans text-sm text-ink">
        <input
          type="checkbox"
          name="visibleToClient"
          checked={visibleToClient}
          onChange={(event) => {
            const visible = event.target.checked;
            setVisibleToClient(visible);
            if (!visible) setClientActionable(false);
          }}
          aria-invalid={visibilityError ? true : undefined}
          aria-describedby={visibilityError ? "visible-to-client-error" : undefined}
        />
        Visível para a cliente
      </label>
      {visibilityError ? (
        <p
          id="visible-to-client-error"
          role="alert"
          className="font-sans text-xs text-danger"
        >
          {visibilityError}
        </p>
      ) : null}

      <label className="flex min-h-11 items-center gap-2 font-sans text-sm text-ink">
        <input
          type="checkbox"
          name="clientActionable"
          checked={clientActionable}
          disabled={!visibleToClient}
          onChange={(event) => setClientActionable(event.target.checked)}
          aria-invalid={actionableError ? true : undefined}
          aria-describedby={actionableError ? "client-actionable-error" : undefined}
        />
        A cliente pode alterar o status
      </label>
      {actionableError ? (
        <p
          id="client-actionable-error"
          role="alert"
          className="font-sans text-xs text-danger"
        >
          {actionableError}
        </p>
      ) : null}
    </fieldset>
  );
}
