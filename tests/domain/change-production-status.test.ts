import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { canTransitionProductionStatus } from "@/domain/production/status";

// Hoisted by Vitest. The integration block below drives changeProductionStatusAction
// (not just the service) so the audit wiring is covered too, and that needs a
// CurrentUser and a no-op revalidatePath — there is no Next request context here.
const currentUser = vi.hoisted(() => ({
  value: null as { id: string; email: string; role: "admin" } | null,
}));
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getCurrentUser: async () => currentUser.value };
});
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Pure-rule coverage lives in tests/domain/production-status.test.ts already.
// This file adds the "which options does the UI offer" helper contract.
import { allowedProductionTransitions } from "@/domain/production/status";

describe("allowedProductionTransitions", () => {
  it("from aguardando offers only iniciado", () => {
    expect(allowedProductionTransitions("aguardando")).toEqual(["iniciado"]);
  });

  it("from iniciado offers parcial and finalizado (skip allowed)", () => {
    expect(allowedProductionTransitions("iniciado").sort()).toEqual(["finalizado", "parcial"]);
  });

  it("from entregue offers nothing (terminal)", () => {
    expect(allowedProductionTransitions("entregue")).toEqual([]);
  });

  it("every offered transition passes canTransitionProductionStatus", () => {
    for (const from of ["aguardando", "iniciado", "parcial", "finalizado", "entregue"] as const) {
      for (const to of allowedProductionTransitions(from)) {
        expect(canTransitionProductionStatus(from, to)).toBe(true);
      }
    }
  });
});

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  shoots,
  productionJobs,
  preparationTasks,
  clients,
  experiencePackages,
  profiles,
  auditLog,
} from "@/db/schema";
import { changeProductionJobStatus, createProductionJob } from "@/domain/production/service";
import { changeProductionStatusAction } from "@/domain/production/actions";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("changeProductionJobStatus (integration)", () => {
  let clientId: string;
  let packageId: string;
  // shoot 1 is walked up the pipeline to "edicao" so the reflection is legal;
  // shoot 2 stays at the "reserva" default so the reflection must be skipped;
  // shoot 3 exists only to exercise the action (and its audit write).
  let shootAtEdicao: string;
  let shootAtReserva: string;
  let shootForAction: string;
  let jobA: string;
  let jobB: string;
  let jobC: string;

  beforeAll(async () => {
    const [c] = await db.insert(clients).values({ name: "Teste Epic2 SCL-231" }).returning();
    clientId = c.id;
    const [p] = await db.select({ id: experiencePackages.id }).from(experiencePackages).limit(1);
    packageId = p.id;

    // audit_log.actor_user_id has an FK to profiles, so the acting user has to be a
    // real profile row. We borrow an existing one rather than creating an auth user.
    const [profile] = await db.select({ id: profiles.id }).from(profiles).limit(1);
    currentUser.value = { id: profile.id, email: "teste-epic2@local", role: "admin" };

    const inserted = await db
      .insert(shoots)
      .values([
        { clientId, experiencePackageId: packageId, shootDate: "2026-12-10", agreedPrice: "1000.00" },
        { clientId, experiencePackageId: packageId, shootDate: "2026-12-11", agreedPrice: "1000.00" },
        { clientId, experiencePackageId: packageId, shootDate: "2026-12-12", agreedPrice: "1000.00" },
      ])
      .returning({ id: shoots.id });
    [shootAtEdicao, shootAtReserva, shootForAction] = inserted.map((s) => s.id);

    // Direct db.update for setup, not changeShootStatusAction: the action is an
    // authorization boundary and stepping reserva→preparacao→realizado→edicao
    // through it would be four round trips of setup noise. What is under test here
    // is the production→shoot reflection, not the shoot state machine (that has its
    // own pure coverage in tests/domain/shoot-status.test.ts).
    await db.update(shoots).set({ status: "edicao" }).where(eq(shoots.id, shootAtEdicao));

    jobA = (await createProductionJob({ shootId: shootAtEdicao })).id;
    jobB = (await createProductionJob({ shootId: shootAtReserva })).id;
    jobC = (await createProductionJob({ shootId: shootForAction })).id;
  }, 30_000);

  afterAll(async () => {
    const shootIds = [shootAtEdicao, shootAtReserva, shootForAction].filter(Boolean);
    const jobIds = [jobA, jobB, jobC].filter(Boolean);
    if (jobIds.length) await db.delete(auditLog).where(inArray(auditLog.entityId, jobIds));
    if (shootIds.length) {
      await db.delete(preparationTasks).where(inArray(preparationTasks.shootId, shootIds));
      await db.delete(productionJobs).where(inArray(productionJobs.shootId, shootIds));
      await db.delete(shoots).where(inArray(shoots.id, shootIds));
    }
    if (clientId) await db.delete(clients).where(eq(clients.id, clientId));
  }, 30_000);

  it(
    "reflects finalizado onto a shoot whose own state machine allows the hop",
    async () => {
      await changeProductionJobStatus(jobA, "iniciado");
      const { job, previousStatus, shootStatusChanged } = await changeProductionJobStatus(
        jobA,
        "finalizado",
      );

      expect(job.status).toBe("finalizado");
      expect(previousStatus).toBe("iniciado");
      expect(shootStatusChanged).toBe("finalizado");

      const [shoot] = await db.select({ status: shoots.status }).from(shoots).where(eq(shoots.id, shootAtEdicao));
      expect(shoot.status).toBe("finalizado");
    },
    30_000,
  );

  it(
    "skips the reflection when the shoot's own state machine forbids the hop",
    async () => {
      await changeProductionJobStatus(jobB, "iniciado");
      const { job, shootStatusChanged } = await changeProductionJobStatus(jobB, "finalizado");

      expect(job.status).toBe("finalizado");
      // canTransitionShootStatus("reserva", "finalizado") is false, so the shoot is
      // left exactly where it was rather than being force-advanced.
      expect(shootStatusChanged).toBeNull();

      const [shoot] = await db.select({ status: shoots.status }).from(shoots).where(eq(shoots.id, shootAtReserva));
      expect(shoot.status).toBe("reserva");
    },
    30_000,
  );

  it(
    "changeProductionStatusAction writes an audit_log row carrying the real before-status",
    async () => {
      const result = await changeProductionStatusAction({ jobId: jobC, to: "iniciado" });
      expect(result.ok).toBe(true);

      const entries = await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entityId, jobC), eq(auditLog.action, "production_job.status_changed")));

      expect(entries).toHaveLength(1);
      expect(entries[0].entityType).toBe("production_job");
      expect(entries[0].before).toEqual({ status: "aguardando" });
      expect(entries[0].after).toMatchObject({ status: "iniciado" });
    },
    30_000,
  );
});
