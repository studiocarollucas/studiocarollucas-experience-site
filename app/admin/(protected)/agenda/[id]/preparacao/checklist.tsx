"use client";

import { useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  addPreparationTaskAction,
  setPreparationTaskStatusAction,
} from "@/domain/preparation/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type Task = {
  id: string;
  type: string;
  title: string;
  status: string;
  visibleToClient: boolean;
  clientActionable: boolean;
};

const NEXT: Record<string, string> = { pendente: "em_andamento", em_andamento: "concluida", concluida: "pendente" };
const LABEL: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída" };

export function Checklist({ shootId, tasks }: { shootId: string; tasks: Task[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cycleError, setCycleError] = useState<string | null>(null);

  function cycle(task: Task) {
    setCycleError(null);
    startTransition(async () => {
      const result = await setPreparationTaskStatusAction({
        taskId: task.id,
        shootId,
        status: NEXT[task.status],
      });
      if (result.ok) router.refresh();
      else setCycleError(result.error);
    });
  }

  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(addPreparationTaskAction, {
        booleans: ["visibleToClient", "clientActionable"],
      })(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <FormStatus state={cycleError ? { ok: false, error: cycleError } : null} />
      <ul className="flex flex-col divide-y divide-line border border-line">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-sans text-sm text-ink">{task.title}</p>
              <p className="font-sans text-xs text-muted">
                {task.type}
                {task.clientActionable
                  ? " · editável pela cliente"
                  : task.visibleToClient
                    ? " · visível somente"
                    : " · interno"}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => cycle(task)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center disabled:opacity-50"
            >
              <Badge tone={task.status === "concluida" ? "success" : task.status === "em_andamento" ? "warning" : "neutral"}>
                {LABEL[task.status]}
              </Badge>
            </button>
          </li>
        ))}
        {tasks.length === 0 ? <li className="px-4 py-3 font-sans text-sm text-muted">Nenhuma tarefa.</li> : null}
      </ul>

      <form action={formAction} className="flex flex-col gap-3 border-t border-line pt-6">
        <FormStatus state={state} />
        <input type="hidden" name="shootId" value={shootId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="type" error={state && !state.ok ? state.fieldErrors?.type?.[0] : undefined}>
            <Input id="type" name="type" placeholder="figurino, make…" required />
          </Field>
          <Field label="Título" htmlFor="title" error={state && !state.ok ? state.fieldErrors?.title?.[0] : undefined}>
            <Input id="title" name="title" required />
          </Field>
        </div>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm text-ink">
          <input type="checkbox" name="visibleToClient" defaultChecked />
          Visível para a cliente
        </label>
        <label className="flex min-h-11 items-center gap-2 font-sans text-sm text-ink">
          <input type="checkbox" name="clientActionable" />
          A cliente pode alterar o status
        </label>
        <div>
          <SubmitButton>Adicionar tarefa</SubmitButton>
        </div>
      </form>
    </div>
  );
}
