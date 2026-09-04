import { db } from "@/db/client";
import { preparationTasks, type PreparationTask } from "@/db/schema";
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
