import { ClientChecklist } from "@/components/client/client-checklist";
import { getPortalChecklistSnapshot } from "@/domain/portal/server";

export default async function ClientChecklistPage() {
  const snapshot = await getPortalChecklistSnapshot();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">
          Preparação
        </p>
        <h1 className="mt-2 font-serif text-4xl font-light">Seu checklist</h1>
      </div>
      <ClientChecklist
        key={snapshot.tasks.map((task) => `${task.id}:${task.status}`).join("|")}
        tasks={snapshot.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          dueAt: task.dueAt,
          clientActionable: task.clientActionable,
        }))}
      />
    </section>
  );
}
