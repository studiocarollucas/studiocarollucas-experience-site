import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, clients, contracts, type ContractSnapshot } from "@/db/schema";
import { logger } from "@/lib/observability/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getContractorProfile } from "./contractor";
import { renderContractPdf, type ContractPdfInput } from "./pdf";
import { getContractIssueContext, type ContractIssueContext } from "./queries";
import { issueContractSchema } from "./schema";
import { buildContractSnapshot, CONTRACTS_BUCKET, CONTRACT_TEMPLATE_VERSION } from "./snapshot";

export type ContractStorage = {
  upload(path: string, body: Uint8Array, options: { contentType: "application/pdf"; upsert: false }): Promise<{ error: unknown | null }>;
  remove(paths: string[]): Promise<{ error: unknown | null }>;
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: unknown | null }>;
};

type CivilData = {
  cpf: string;
  birthday: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
};

type ContractInsert = {
  id: string;
  contractNumber: string;
  shootId: string;
  clientId: string;
  status: "issued";
  templateVersion: string;
  issuedByAuthUserId: string;
  issuedAt: Date;
  imageUsageAuthorized: boolean;
  snapshot: ContractSnapshot;
  pdfStoragePath: string;
};

type RedactedAuditEvent = {
  actorUserId: string;
  action: "contract.issued";
  entityType: "contract";
  entityId: string;
  before: null;
  after: {
    contractId: string;
    contractNumber: string;
    shootId: string;
    templateVersion: string;
    imageUsageAuthorized: boolean;
  };
};

type ContractIssuanceDatabase = {
  transaction<T>(operation: (transaction: ContractIssuanceDatabase) => Promise<T>): Promise<T>;
  updateClientCivilData(clientId: string, civilData: CivilData): Promise<void>;
  insertContract(contract: ContractInsert): Promise<void>;
  insertAuditEvent(event: RedactedAuditEvent): Promise<void>;
};

export type IssueContractDeps = {
  getContractorProfile: typeof getContractorProfile;
  getIssueContext(shootId: string): Promise<ContractIssueContext | null>;
  renderPdf(input: ContractPdfInput): Promise<Uint8Array>;
  storage: ContractStorage;
  db: ContractIssuanceDatabase;
  randomUUID(): string;
  now(): string;
};

type IssueContractRequest = {
  input: unknown;
  issuedByAuthUserId: string;
};

export type IssueContractResult = {
  id: string;
  contractNumber: string;
  status: "issued";
  issuedAt: string;
};

type IssuedContractInternalResult = IssueContractResult & {
  clientId: string;
  imageUsageAuthorized: boolean;
  pdfStoragePath: string;
};

function isDependencies(value: IssueContractDeps | IssueContractRequest): value is IssueContractDeps {
  return "getIssueContext" in value;
}

function createDatabaseAdapter(): ContractIssuanceDatabase {
  const adapter: ContractIssuanceDatabase = {
    transaction: async (operation) =>
      db.transaction(async (tx) => {
        const transactionAdapter: ContractIssuanceDatabase = {
          ...adapter,
          updateClientCivilData: async (clientId, civilData) => {
            await tx.update(clients).set(civilData).where(eq(clients.id, clientId));
          },
          insertContract: async (contract) => {
            await tx.insert(contracts).values(contract);
          },
          insertAuditEvent: async (event) => {
            await tx.insert(auditLog).values(event);
          },
        };
        return operation(transactionAdapter);
      }),
    updateClientCivilData: async () => {
      throw new Error("client civil data must be updated in a transaction");
    },
    insertContract: async () => {
      throw new Error("contract must be inserted in a transaction");
    },
    insertAuditEvent: async () => {
      throw new Error("audit event must be inserted in a transaction");
    },
  };
  return adapter;
}

async function createProductionDeps(): Promise<IssueContractDeps> {
  const supabase = await createSupabaseServerClient();
  const storage = supabase.storage.from(CONTRACTS_BUCKET);
  return {
    getContractorProfile,
    getIssueContext: getContractIssueContext,
    renderPdf: async (input) => new Uint8Array(await renderContractPdf(input)),
    storage: {
      upload: (path, body, options) => storage.upload(path, body, options),
      remove: (paths) => storage.remove(paths),
      createSignedUrl: (path, expiresIn) => storage.createSignedUrl(path, expiresIn),
    },
    db: createDatabaseAdapter(),
    randomUUID: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
  };
}

export async function issueContract(request: IssueContractRequest): Promise<IssueContractResult>;
export async function issueContract(deps: IssueContractDeps, request: IssueContractRequest): Promise<IssueContractResult>;
export async function issueContract(
  depsOrRequest: IssueContractDeps | IssueContractRequest,
  suppliedRequest?: IssueContractRequest,
): Promise<IssueContractResult> {
  const issued = await issueContractInternal(depsOrRequest, suppliedRequest);
  return {
    id: issued.id,
    contractNumber: issued.contractNumber,
    status: issued.status,
    issuedAt: issued.issuedAt,
  };
}

export async function issueContractForRevalidation(request: IssueContractRequest): Promise<{
  result: IssueContractResult;
  clientId: string;
}> {
  const issued = await issueContractInternal(request);
  return {
    result: {
      id: issued.id,
      contractNumber: issued.contractNumber,
      status: issued.status,
      issuedAt: issued.issuedAt,
    },
    clientId: issued.clientId,
  };
}

async function issueContractInternal(
  depsOrRequest: IssueContractDeps | IssueContractRequest,
  suppliedRequest?: IssueContractRequest,
): Promise<IssuedContractInternalResult> {
  const deps = isDependencies(depsOrRequest) ? depsOrRequest : await createProductionDeps();
  const request = isDependencies(depsOrRequest) ? suppliedRequest : depsOrRequest;
  if (!request) throw new Error("contract issuance failed");

  const input = issueContractSchema.parse(request.input);
  const contractor = deps.getContractorProfile();
  const context = await deps.getIssueContext(input.shootId);
  if (!context) throw new Error("shoot not found");

  const snapshot = buildContractSnapshot({
    contractor,
    client: { ...context.client, ...input },
    shoot: context.shoot,
    package: context.package,
    agreedPrice: context.shoot.agreedPrice,
    payments: context.payments,
    imageUsage: input.imageUsage,
  });
  const id = deps.randomUUID();
  const contractNumber = `SCL-${id.toUpperCase()}`;
  const pdfStoragePath = `contracts/${id}.pdf`;
  const issuedAt = deps.now();
  const imageUsageAuthorized = input.imageUsage === "authorized";
  const contract: ContractInsert = {
    id,
    contractNumber,
    shootId: context.shoot.id,
    clientId: context.client.id,
    status: "issued",
    templateVersion: CONTRACT_TEMPLATE_VERSION,
    issuedByAuthUserId: request.issuedByAuthUserId,
    issuedAt: new Date(issuedAt),
    imageUsageAuthorized,
    snapshot,
    pdfStoragePath,
  };

  let uploaded = false;
  try {
    const pdf = await deps.renderPdf({ contractNumber, issuedAt, snapshot });
    const upload = await deps.storage.upload(pdfStoragePath, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upload.error) throw new Error("storage upload failed");
    uploaded = true;

    await deps.db.transaction(async (transaction) => {
      await transaction.updateClientCivilData(context.client.id, {
        cpf: input.cpf,
        birthday: input.birthday,
        addressStreet: input.addressStreet,
        addressNumber: input.addressNumber,
        addressComplement: input.addressComplement,
        addressNeighborhood: input.addressNeighborhood,
        addressCity: input.addressCity,
        addressState: input.addressState,
        addressPostalCode: input.addressPostalCode,
      });
      await transaction.insertContract(contract);
      await transaction.insertAuditEvent({
        actorUserId: request.issuedByAuthUserId,
        action: "contract.issued",
        entityType: "contract",
        entityId: id,
        before: null,
        after: {
          contractId: id,
          contractNumber,
          shootId: context.shoot.id,
          templateVersion: CONTRACT_TEMPLATE_VERSION,
          imageUsageAuthorized,
        },
      });
    });
  } catch {
    if (uploaded) {
      try {
        const cleanup = await deps.storage.remove([pdfStoragePath]);
        if (cleanup.error) {
          logger.error("contract PDF cleanup failed", { contractId: id, pdfStoragePath });
        }
      } catch {
        logger.error("contract PDF cleanup failed", { contractId: id, pdfStoragePath });
      }
    }
    throw new Error("contract issuance failed");
  }

  return {
    id,
    clientId: context.client.id,
    contractNumber,
    status: "issued",
    issuedAt,
    imageUsageAuthorized,
    pdfStoragePath,
  };
}
