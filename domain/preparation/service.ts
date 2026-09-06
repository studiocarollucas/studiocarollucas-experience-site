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
  return db.select().from(preparationTasks).where(eq(preparationTasks.shootId, shootId));
}

type PrepStatus = (typeof preparationTaskStatusEnum.enumValues)[number];

export async function setPreparationTaskStatus(
  taskId: string,
  status: PrepStatus,
): Promise<PreparationTask> {
  const [row] = await db
    .update(preparationTasks)
    .set({
      status,
      completedAt: status === "concluida" ? new Date().toISOString() : null,
    })
    .where(eq(preparationTasks.id, taskId))
    .returning();
  return row;
}

export async function addPreparationTask(
  input: CreatePreparationTaskInput,
): Promise<PreparationTask> {
  return createPreparationTask(input);
}
