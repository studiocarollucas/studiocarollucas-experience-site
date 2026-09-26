"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUpsellProductAction } from "@/domain/upsell/actions";

export function DeleteUpsellProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!window.confirm("Excluir este produto? Pedidos já feitos mantêm o que foi pedido.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUpsellProductAction({ id: productId });
      if (result.ok) router.push("/admin/upsells");
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="self-start border border-danger px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-danger hover:bg-danger hover:text-white disabled:opacity-50"
      >
        {pending ? "Excluindo…" : "Excluir produto"}
      </button>
      {error ? (
        <p role="alert" className="font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
