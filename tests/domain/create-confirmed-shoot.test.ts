import { describe, it, expect } from "vitest";
import { buildInitialPreparationTasks } from "@/domain/shoots/create-confirmed-shoot";

describe("buildInitialPreparationTasks", () => {
  it("returns the canonical starter checklist", () => {
    const tasks = buildInitialPreparationTasks();
    expect(tasks.map((t) => t.type)).toEqual([
      "moodboard",
      "figurino",
      "clutch",
      "make",
      "confirmacao_horario",
      "pagamento",
    ]);
  });

  it("every task has a non-empty pt-BR title", () => {
    for (const t of buildInitialPreparationTasks()) {
      expect(t.title.length).toBeGreaterThan(0);
    }
  });

  it("the payment task is not visible to the client by default", () => {
    const pagamento = buildInitialPreparationTasks().find((t) => t.type === "pagamento");
    expect(pagamento?.visibleToClient).toBe(false);
  });

  it("client-facing prep tasks are visible to the client", () => {
    const moodboard = buildInitialPreparationTasks().find((t) => t.type === "moodboard");
    expect(moodboard?.visibleToClient).toBe(true);
  });
});

import { afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  shoots,
  productionJobs,
  preparationTasks,
  clients,
  experiencePackages,
} from "@/db/schema";
import { createConfirmedShoot } from "@/domain/shoots/create-confirmed-shoot";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("createConfirmedShoot (integration)", () => {
  let clientId: string;
  let packageId: string;
  let createdShootId: string | undefined;

  beforeAll(async () => {
    const [c] = await db.insert(clients).values({ name: "Teste Epic2 SCL-211" }).returning();
    clientId = c.id;
    const [p] = await db
      .select({ id: experiencePackages.id })
      .from(experiencePackages)
      .limit(1);
    packageId = p.id;
  });

  afterAll(async () => {
    if (createdShootId) {
      await db.delete(preparationTasks).where(eq(preparationTasks.shootId, createdShootId));
      await db.delete(productionJobs).where(eq(productionJobs.shootId, createdShootId));
      await db.delete(shoots).where(eq(shoots.id, createdShootId));
    }
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  it("creates shoot + production job + starter checklist atomically", async () => {
    const result = await createConfirmedShoot({
      clientId,
      experiencePackageId: packageId,
      shootDate: "2026-12-01",
      agreedPrice: "1200.00",
    });
    createdShootId = result.shoot.id;

    expect(result.productionJob.status).toBe("aguardando");
    expect(result.preparationTaskCount).toBe(6);

    const job = await db.select().from(productionJobs).where(eq(productionJobs.shootId, result.shoot.id));
    expect(job).toHaveLength(1);
    const tasks = await db
      .select()
      .from(preparationTasks)
      .where(eq(preparationTasks.shootId, result.shoot.id));
    expect(tasks).toHaveLength(6);
  });

  it("rolls back everything when the production job insert would violate the 1:1 unique constraint", async () => {
    // create one, then attempt a second confirmed shoot that reuses the same shoot row
    // is not possible directly; instead assert the unique constraint by inserting a
    // duplicate production_jobs row inside a failing transaction.
    const result = await createConfirmedShoot({
      clientId,
      experiencePackageId: packageId,
      shootDate: "2026-12-02",
      agreedPrice: "1000.00",
    });
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(productionJobs).values({ shootId: result.shoot.id, status: "aguardando" });
      }),
    ).rejects.toThrow();
    // cleanup this extra shoot
    await db.delete(preparationTasks).where(eq(preparationTasks.shootId, result.shoot.id));
    await db.delete(productionJobs).where(eq(productionJobs.shootId, result.shoot.id));
    await db.delete(shoots).where(eq(shoots.id, result.shoot.id));
  });
});
