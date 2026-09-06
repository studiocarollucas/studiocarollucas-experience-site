import { db } from "@/db/client";
import { preparationTasks, preparationTaskStatusEnum, type PreparationTask } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPreparationTaskSchema, type CreatePreparationTaskInput } from "./schema";

export async function createPreparationTask(input: CreatePreparationTaskInput): Promise<PreparationTask> {
  const parsed = createPreparationTaskSchema.parse(input);
  const [row] = await db.insert(preparationTasks).values(parsed).returning();
  return row;
}

export async function getPreparationTasksByShootId(shootId: string): Promise<PreparationTask[]> {
  // Explicit order: without it the checklist re-ordered itself on every render as
  // Postgres returned rows in whatever order it liked.
  return db
    .select()
    .from(preparationTasks)
    .where(eq(preparationTasks.shootId, shootId))
    .orderBy(preparationTasks.createdAt);
}

type PrepStatus = (typeof preparationTaskStatusEnum.enumValues)[number];

export async function setPreparationTaskStatus(
  taskId: string,
  status: PrepStatus,
): Promise<{ task: PreparationTask; previousStatus: PrepStatus }> {
  // Load first: a bad taskId used to fall through to `row === undefined` and blow
  // up with a TypeError at the caller. It also gives the action a real audit
  // `before` without a second round trip.
  const [current] = await db
    .select()
    .from(preparationTasks)
    .where(eq(preparationTasks.id, taskId))
    .limit(1);
  if (!current) throw new Error("tarefa inexistente");

  const [row] = await db
    .update(preparationTasks)
    .set({
      status,
      completedAt: status === "concluida" ? new Date().toISOString() : null,
    })
    .where(eq(preparationTasks.id, taskId))
    .returning();
  return { task: row, previousStatus: current.status };
}

export async function addPreparationTask(
  input: CreatePreparationTaskInput,
): Promise<PreparationTask> {
  return createPreparationTask(input);
}
