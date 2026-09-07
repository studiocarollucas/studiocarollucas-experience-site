export type ClientTaskStatus = "pendente" | "em_andamento" | "concluida";

type UpdateChain = {
  from(table: "preparation_tasks"): {
    update(values: { status: ClientTaskStatus }): {
      eq(column: "id", value: string): {
        select(columns: "id,status,completed_at"): {
          single(): PromiseLike<{
            data: {
              id: string;
              status: ClientTaskStatus;
              completed_at: string | null;
            } | null;
            error: unknown;
          }>;
        };
      };
    };
  };
};

export async function setClientTaskStatus(
  client: UpdateChain,
  taskId: string,
  status: ClientTaskStatus,
) {
  const { data, error } = await client
    .from("preparation_tasks")
    .update({ status })
    .eq("id", taskId)
    .select("id,status,completed_at")
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar esta tarefa.");

  return {
    id: data.id,
    status: data.status,
    completedAt: data.completed_at,
  };
}
