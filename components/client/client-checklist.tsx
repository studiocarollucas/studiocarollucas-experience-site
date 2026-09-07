"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setClientTaskStatus,
  type ClientTaskStatus,
} from "@/domain/portal/checklist";
import type { PortalTask } from "@/domain/portal/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { Select } from "@/components/ui/select";

const STATUS_LABEL = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
} as const;

type ClientChecklistTask = Pick<
  PortalTask,
  "id" | "title" | "status" | "dueAt" | "clientActionable"
>;

type ConfirmedStatus = {
  baselineStatus: ClientTaskStatus;
  status: ClientTaskStatus;
};

export function ClientChecklist({ tasks }: { tasks: ClientChecklistTask[] }) {
  const router = useRouter();
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [confirmedStatuses, setConfirmedStatuses] = useState<Record<string, ConfirmedStatus>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(
    taskId: string,
    baselineStatus: ClientTaskStatus,
    status: ClientTaskStatus,
  ) {
    setError(null);
    setPendingTaskId(taskId);
    try {
      const confirmed = await setClientTaskStatus(client, taskId, status);
      setConfirmedStatuses((current) => ({
        ...current,
        [taskId]: { baselineStatus, status: confirmed.status },
      }));
      router.refresh();
    } catch {
      setError("Não foi possível atualizar esta tarefa.");
    } finally {
      setPendingTaskId(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="border border-line bg-white px-5 py-8">
        <p className="font-serif text-2xl font-light text-ink">Tudo tranquilo por aqui.</p>
        <p className="mt-2 font-sans text-sm leading-6 text-muted">
          Quando houver uma etapa de preparação, ela aparecerá neste checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="border border-danger px-4 py-3 font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-line border-y border-line">
        {tasks.map((task) => {
          const isPending = pendingTaskId === task.id;
          const confirmed = confirmedStatuses[task.id];
          const displayedStatus =
            confirmed && task.status === confirmed.baselineStatus ? confirmed.status : task.status;

          return (
            <li key={task.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
              <div className="min-w-0">
                <p className="font-serif text-xl leading-tight font-light text-ink">{task.title}</p>
                {task.dueAt ? (
                  <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.16em] text-muted">
                    Até {formatDateTime(task.dueAt)}
                  </p>
                ) : null}
              </div>

              {task.clientActionable ? (
                <div className="flex flex-col gap-1.5">
                  <Select
                    aria-label={`Status de ${task.title}`}
                    value={displayedStatus}
                    disabled={pendingTaskId !== null}
                    onChange={(event) =>
                      void changeStatus(
                        task.id,
                        task.status,
                        event.target.value as ClientTaskStatus,
                      )
                    }
                    className="min-h-11"
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <p aria-live="polite" className="min-h-4 font-sans text-xs text-muted">
                    {isPending ? "Atualizando status…" : "Você pode atualizar esta etapa"}
                  </p>
                </div>
              ) : (
                <div className="border-l-2 border-line pl-3">
                  <p className="font-sans text-xs font-medium text-ink">
                    {STATUS_LABEL[task.status]}
                  </p>
                  <p className="mt-1 font-sans text-xs text-muted">Acompanhada pelo estúdio</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
