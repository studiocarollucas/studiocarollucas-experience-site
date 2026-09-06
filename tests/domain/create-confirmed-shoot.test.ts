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

  it("aborts the whole transaction when a row insert fails (nothing partially commits)", async () => {
    // The previous version of this case never called createConfirmedShoot in a
    // failing path — it inserted a duplicate production_jobs row in a throwaway
    // transaction and asserted that threw, which says nothing about whether
    // createConfirmedShoot rolls back. This one drives the real function into a
    // failure: a syntactically valid v4 UUID that is not in experience_packages,
    // so shoots' FK rejects the insert inside the transaction.
    //
    // A dedicated client, so "zero rows for this client" is an exact assertion
    // rather than a count relative to the other cases in this describe.
    const [victim] = await db
      .insert(clients)
      .values({ name: "Teste Epic2 SCL-211 rollback" })
      .returning();

    try {
      await expect(
        createConfirmedShoot({
          clientId: victim.id,
          experiencePackageId: "00000000-0000-4000-8000-0000000000bb",
          shootDate: "2026-12-05",
          agreedPrice: "1000.00",
        }),
      ).rejects.toThrow();

      const leftoverShoots = await db
        .select({ id: shoots.id })
        .from(shoots)
        .where(eq(shoots.clientId, victim.id));
      expect(leftoverShoots).toEqual([]);

      // No shoot exists, so no child row can either — assert it directly rather
      // than inferring it, in case a future change decouples them.
      for (const s of leftoverShoots) {
        expect(await db.select().from(productionJobs).where(eq(productionJobs.shootId, s.id))).toEqual([]);
        expect(await db.select().from(preparationTasks).where(eq(preparationTasks.shootId, s.id))).toEqual([]);
      }
    } finally {
      // finally, so a failed assertion above still leaves the database clean.
      const rows = await db.select({ id: shoots.id }).from(shoots).where(eq(shoots.clientId, victim.id));
      for (const r of rows) {
        await db.delete(preparationTasks).where(eq(preparationTasks.shootId, r.id));
        await db.delete(productionJobs).where(eq(productionJobs.shootId, r.id));
        await db.delete(shoots).where(eq(shoots.id, r.id));
      }
      await db.delete(clients).where(eq(clients.id, victim.id));
    }
  });
});
