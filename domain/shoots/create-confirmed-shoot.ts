import { db } from "@/db/client";
import { shoots, productionJobs, preparationTasks, type Shoot, type ProductionJob } from "@/db/schema";
import { createShootSchema, type CreateShootInput } from "./schema";

type ConfirmedShootCreation = {
  shoot: Shoot;
  productionJob: ProductionJob;
  preparationTaskCount: number;
};

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type CreateConfirmedShootOptions = {
  portalEnabled?: boolean;
  onCreated?: (creation: ConfirmedShootCreation, tx: DatabaseTransaction) => Promise<unknown>;
};

/**
 * PRD §6.2 / §7.4.2 "Criação de ensaio confirmado" — the checklist every confirmed
 * shoot starts with. Kept as one pure function so the set is reviewable and testable
 * without a database. `visibleToClient` mirrors what belongs in Minha Experiência
 * (Epic 3): styling-facing tasks yes; the internal payment-tracking task no.
 */
export function buildInitialPreparationTasks(): {
  type: string;
  title: string;
  visibleToClient: boolean;
  clientActionable: boolean;
}[] {
  return [
    { type: "moodboard", title: "Definir moodboard e referências", visibleToClient: true, clientActionable: true },
    { type: "figurino", title: "Escolher figurinos", visibleToClient: true, clientActionable: true },
    { type: "clutch", title: "Selecionar clutch e acessórios", visibleToClient: true, clientActionable: true },
    { type: "make", title: "Enviar referência de maquiagem", visibleToClient: true, clientActionable: true },
    { type: "confirmacao_horario", title: "Confirmar data e horário do ensaio", visibleToClient: true, clientActionable: true },
    { type: "pagamento", title: "Acompanhar pagamento do ensaio", visibleToClient: false, clientActionable: false },
  ];
}

export async function createConfirmedShoot(
  input: CreateShootInput,
  opts: CreateConfirmedShootOptions = {},
): Promise<ConfirmedShootCreation> {
  const parsed = createShootSchema.parse(input);
  const starter = buildInitialPreparationTasks();

  return db.transaction(async (tx) => {
    const [shoot] = await tx
      .insert(shoots)
      .values({ ...parsed, portalEnabled: opts.portalEnabled ?? parsed.portalEnabled ?? false })
      .returning();

    const [productionJob] = await tx
      .insert(productionJobs)
      .values({ shootId: shoot.id, status: "aguardando" })
      .returning();

    await tx.insert(preparationTasks).values(
      starter.map((t) => ({
        shootId: shoot.id,
        type: t.type,
        title: t.title,
        visibleToClient: t.visibleToClient,
        clientActionable: t.clientActionable,
      })),
    );

    const creation = { shoot, productionJob, preparationTaskCount: starter.length };
    await opts.onCreated?.(creation, tx);
    return creation;
  });
}
