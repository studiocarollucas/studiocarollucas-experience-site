import { notFound } from "next/navigation";
import { getShootById } from "@/domain/shoots/service";
import { getPreparationTasksByShootId } from "@/domain/preparation/service";
import { summarizePreparationProgress } from "@/domain/preparation/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Checklist } from "./checklist";

type Params = Promise<{ id: string }>;

export default async function PreparationPage({ params }: { params: Params }) {
  const { id } = await params;
  const shoot = await getShootById(id);
  if (!shoot) notFound();

  const tasks = await getPreparationTasksByShootId(id);
  const progress = summarizePreparationProgress(tasks);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Checklist de preparação"
        description={`${progress.done}/${progress.total} concluídas${progress.nextTaskTitle ? ` · próximo: ${progress.nextTaskTitle}` : ""}`}
      />
      <Card className="p-0">
        <div className="h-1 bg-champ">
          <div className="h-1 bg-ink" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="p-6">
          <Checklist
            shootId={id}
            tasks={tasks.map((t) => ({
              id: t.id,
              type: t.type,
              title: t.title,
              status: t.status,
              visibleToClient: t.visibleToClient,
              clientActionable: t.clientActionable,
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
