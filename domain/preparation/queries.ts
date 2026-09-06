export type PreparationProgress = {
  total: number;
  done: number;
  pct: number;
  nextTaskTitle: string | null;
};

export function summarizePreparationProgress(
  tasks: { status: string; title: string; visibleToClient: boolean }[],
): PreparationProgress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "concluida").length;
  const next = tasks.find((t) => t.status !== "concluida");
  return {
    total,
    done,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    nextTaskTitle: next?.title ?? null,
  };
}
