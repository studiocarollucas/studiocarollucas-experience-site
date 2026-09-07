# Contratos PDF no Studio OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que a equipe emita, arquive e baixe um contrato fotográfico em PDF a partir de um ensaio, com dados civis obrigatórios apenas no momento da emissão.

**Architecture:** Um novo domínio `contracts` cria um snapshot imutável de cliente, ensaio, pacote, pagamentos e contratante do estúdio. A composição do PDF acontece somente no servidor; o arquivo vai para um bucket Supabase privado e o registro do contrato referencia esse objeto. O Admin emite e consulta contratos nas fichas do ensaio e da cliente; um Route Handler autenticado entrega apenas uma URL assinada de curta duração.

**Tech Stack:** Next.js 16 App Router e Route Handlers, React 19, TypeScript strict, Drizzle ORM/Postgres, Supabase Auth/Storage/RLS, Zod 4, `@react-pdf/renderer`, Vitest/Testing Library.

## Global Constraints

- Não armazenar CPF, endereço ou quaisquer dados reais da contratante do estúdio em código, Git, fixtures, documentação, logs ou variáveis `NEXT_PUBLIC_*`.
- Usar configuração protegida de ambiente para `STUDIO_CONTRACTOR_NAME`, `STUDIO_CONTRACTOR_CPF` e `STUDIO_CONTRACTOR_ADDRESS`; validar presença somente no servidor.
- O cadastro usual continua leve: nome e WhatsApp são suficientes para criar a cliente; CPF, nascimento e endereço tornam-se obrigatórios somente na emissão.
- O PDF é privado, sem assinatura eletrônica, envio automático, editor livre de cláusulas, múltiplos modelos ou automação de cobrança neste marco.
- Todo valor monetário permanece string decimal de duas casas; não usar `number` ou `parseFloat` para valores financeiros.
- Reagendamento: taxa de R$ 50,00 quando solicitado nos 15 dias anteriores ao ensaio. Cancelamento: reembolso integral do valor já pago até 30 dias antes do ensaio; depois desse prazo, não há reembolso.
- A autorização de uso de imagem é uma escolha explícita por contrato, começa sem autorização e fica visível no snapshot e no PDF.
- Aplicar migration serializada, atualizar o journal do Drizzle e testar RLS/Storage contra ambiente de desenvolvimento somente quando `RUN_LIVE_DB_TESTS=true`.
- Requer revisão de profissional jurídico brasileiro antes de uso comercial; a implementação não afirma validade jurídica automática.

---

## File structure

| Path | Responsibility |
|---|---|
| `db/schema/contracts.ts` | Enum, tabela e tipos Drizzle de contratos imutáveis. |
| `db/schema/clients.ts` | Campos civis opcionais da cliente necessários para contrato. |
| `db/schema/index.ts` | Exportar o novo schema. |
| `db/migrations/0034_contracts.sql` | Colunas civis, tabela, índice, RLS, grants e bucket privado. |
| `domain/contracts/schema.ts` | Zod para dados de emissão, CPF e endereço. |
| `domain/contracts/contractor.ts` | Leitura e validação somente-server da contratante configurada no ambiente. |
| `domain/contracts/snapshot.ts` | Tipos puros, política textual e montagem determinística do snapshot. |
| `domain/contracts/pdf.tsx` | Modelo único do PDF e renderização para `Buffer`. |
| `domain/contracts/queries.ts` | Contexto de emissão e listagens seguras para as fichas Admin. |
| `domain/contracts/service.ts` | Emissão, persistência privada, limpeza compensatória e URL temporária. |
| `domain/contracts/actions.ts` | Server Action staff-only para emitir, auditar e revalidar. |
| `app/api/admin/contracts/[id]/download/route.ts` | Download autenticado por redirecionamento a URL assinada. |
| `app/admin/(protected)/agenda/[id]/contrato/page.tsx` | Página de revisão e emissão do contrato do ensaio. |
| `app/admin/(protected)/agenda/[id]/contract-issue-panel.tsx` | Formulário client-side de dados civis, autorização e confirmação. |
| `components/admin/contracts-list.tsx` | Lista reutilizável de contratos da cliente ou do ensaio. |
| `app/admin/(protected)/agenda/[id]/page.tsx` | Ação principal e histórico de contratos no ensaio. |
| `app/admin/(protected)/clientes/[id]/page.tsx` | Histórico de documentos na ficha da cliente. |
| `.env.example`, `docs/runbooks/supabase-setup.md`, `docs/TASKS.md` | Contrato de configuração, operação e rastreamento SCL-310. |

### Task 1: Registrar SCL-310 e criar o modelo de dados privado

**Files:**
- Modify: `docs/TASKS.md`
- Modify: `db/schema/clients.ts`
- Create: `db/schema/contracts.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/0034_contracts.sql`
- Modify: `db/migrations/meta/_journal.json`
- Create: `tests/domain/contracts-schema.test.ts`
- Create: `tests/db/contracts-migration.test.ts`

**Interfaces:**
- Consumes: `clients`, `shoots`, `profiles` and `public.is_staff_or_admin()` already present in the schema and migrations.
- Produces: `contracts`, `contractStatusEnum`, `Contract`, `ContractSnapshot`, and a private `contracts` Storage bucket for Tasks 2–6.

- [ ] **Step 1: Claim the tracked work before changing product files**

Add this row to the summary table and a matching detailed task before changing schema files:

```markdown
| SCL-310 | Contratos PDF privados | P1 | admin/db | CLAIMED | agent:codex | SCL-100,SCL-103,SCL-104,SCL-107 |
```

Use a detailed entry with `Migration: yes`, scope limited to contracts, client civil fields, private Storage and Admin issuance. Set the branch to `main` only if working directly on main; otherwise use the actual feature branch name. Do not put personal identity values in this task entry.

- [ ] **Step 2: Write failing schema and migration-contract tests**

Create `tests/domain/contracts-schema.test.ts` to assert the exact public behavior of the new record types:

```ts
import { describe, expect, it } from "vitest";
import { contractStatusValues, contracts } from "@/db/schema";

describe("contracts schema", () => {
  it("exposes only the immutable issued and voided statuses", () => {
    expect(contractStatusValues).toEqual(["issued", "voided"]);
  });

  it("stores the PDF path, issuer, template version and snapshots", () => {
    expect(Object.keys(contracts)).toEqual(
      expect.arrayContaining([
        "id", "contractNumber", "shootId", "clientId", "status", "templateVersion",
        "issuedByAuthUserId", "issuedAt", "imageUsageAuthorized", "snapshot", "pdfStoragePath",
      ]),
    );
  });
});
```

Create `tests/db/contracts-migration.test.ts` to read `0034_contracts.sql` and assert: `clients` receives optional CPF/address columns, `contracts` has RLS enabled, only authenticated staff can use the table, the `contracts` bucket is `public = false`, and no policy grants client or `anon` access. Assert that the SQL contains no real CPF/address literals.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
npx vitest run tests/domain/contracts-schema.test.ts tests/db/contracts-migration.test.ts --reporter=verbose --maxWorkers=1
```

Expected: FAIL because neither `contracts` schema nor migration exists.

- [ ] **Step 4: Implement client civil fields and the contracts schema**

Extend `clients` with nullable data that are never required by `createClient`:

```ts
cpf: text("cpf"),
addressStreet: text("address_street"),
addressNumber: text("address_number"),
addressComplement: text("address_complement"),
addressNeighborhood: text("address_neighborhood"),
addressCity: text("address_city"),
addressState: text("address_state"),
addressPostalCode: text("address_postal_code"),
```

Create `db/schema/contracts.ts` with the literal status contract and one JSONB snapshot rather than mutable duplicate business columns:

```ts
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const contractStatusEnum = pgEnum("contract_status", ["issued", "voided"]);
export const contractStatusValues = ["issued", "voided"] as const;

export type ContractSnapshot = {
  contractor: { name: string; cpf: string; address: string };
  client: { name: string; cpf: string; birthday: string; address: string; phone: string | null };
  shoot: { date: string; startTime: string | null; locationName: string | null; locationAddress: string | null };
  package: { name: string; description: string | null; durationMinutes: number; includedPhotos: number; scenes: string | null };
  finance: { agreedPrice: string; confirmedPaid: string; balance: string };
  terms: { rescheduleFee: "50.00"; rescheduleWindowDays: 15; refundWindowDays: 30; imageUsageAuthorized: boolean };
};

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey(),
  contractNumber: text("contract_number").notNull(),
  shootId: uuid("shoot_id").notNull(),
  clientId: uuid("client_id").notNull(),
  status: contractStatusEnum("status").notNull().default("issued"),
  templateVersion: text("template_version").notNull(),
  issuedByAuthUserId: uuid("issued_by_auth_user_id").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  imageUsageAuthorized: boolean("image_usage_authorized").notNull(),
  snapshot: jsonb("snapshot").$type<ContractSnapshot>().notNull(),
  pdfStoragePath: text("pdf_storage_path").notNull(),
}, (table) => [
  unique("contracts_contract_number_unique").on(table.contractNumber),
  unique("contracts_pdf_storage_path_unique").on(table.pdfStoragePath),
]);
```

Export it from `db/schema/index.ts`. `id` is generated by the issuance service with `crypto.randomUUID()` so the PDF object path and immutable number are known before Storage upload.

- [ ] **Step 5: Generate a serial migration with staff-only data and Storage access**

Generate from the schema, then replace the generated migration content with reviewed SQL. It must include:

```sql
alter table public.clients add column cpf text;
alter table public.clients add column address_street text;
alter table public.clients add column address_number text;
alter table public.clients add column address_complement text;
alter table public.clients add column address_neighborhood text;
alter table public.clients add column address_city text;
alter table public.clients add column address_state text;
alter table public.clients add column address_postal_code text;
--> statement-breakpoint

create type public.contract_status as enum ('issued', 'voided');
--> statement-breakpoint
create table public.contracts (
  id uuid primary key not null,
  contract_number text not null,
  shoot_id uuid not null,
  client_id uuid not null,
  status public.contract_status not null default 'issued',
  template_version text not null,
  issued_by_auth_user_id uuid not null,
  issued_at timestamp with time zone not null default now(),
  image_usage_authorized boolean not null,
  snapshot jsonb not null,
  pdf_storage_path text not null,
  constraint contracts_contract_number_unique unique (contract_number),
  constraint contracts_pdf_storage_path_unique unique (pdf_storage_path)
);
--> statement-breakpoint
create index contracts_shoot_issued_at_idx on public.contracts (shoot_id, issued_at desc);
create index contracts_client_issued_at_idx on public.contracts (client_id, issued_at desc);
--> statement-breakpoint
alter table public.contracts enable row level security;
revoke all on table public.contracts from anon, authenticated;
grant select, insert on table public.contracts to authenticated;
create policy contracts_staff_access on public.contracts
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
--> statement-breakpoint

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do update set public = false;
create policy contracts_objects_staff_access on storage.objects
  for all to authenticated
  using (bucket_id = 'contracts' and public.is_staff_or_admin())
  with check (bucket_id = 'contracts' and public.is_staff_or_admin());
```

Do not add any client, public, or anonymous policy. The path format is exactly `contracts/<contract-id>.pdf`; the policy above checks the bucket and `public.is_staff_or_admin()`.

- [ ] **Step 6: Run focused tests and static migration gates**

Run:

```powershell
npx vitest run tests/domain/contracts-schema.test.ts tests/db/contracts-migration.test.ts --reporter=verbose --maxWorkers=1
npm run predb:migrate
git diff --check
```

Expected: all focused tests pass, migration journal is sequential after `0033`, and diff check has no whitespace errors.

- [ ] **Step 7: Commit the data model checkpoint**

```powershell
git add docs/TASKS.md db/schema/clients.ts db/schema/contracts.ts db/schema/index.ts db/migrations/0034_contracts.sql db/migrations/meta/_journal.json db/migrations/meta/0034_snapshot.json tests/domain/contracts-schema.test.ts tests/db/contracts-migration.test.ts
git commit -m "feat(contracts): add private contract records"
```

### Task 2: Build validated civil data and immutable contract snapshots

**Files:**
- Create: `domain/contracts/schema.ts`
- Create: `domain/contracts/contractor.ts`
- Create: `domain/contracts/snapshot.ts`
- Modify: `domain/clients/schema.ts`
- Modify: `domain/clients/form-schema.ts`
- Modify: `.env.example`
- Create: `tests/domain/contracts-input.test.ts`
- Create: `tests/domain/contracts-snapshot.test.ts`
- Create: `tests/domain/contractor-config.test.ts`

**Interfaces:**
- Consumes: `ContractSnapshot` from Task 1, `calculateBalance()` and `addDecimal()` existing money helpers.
- Produces: `issueContractSchema`, `normalizeCpf`, `getContractorProfile`, `buildContractSnapshot`, `CONTRACT_TEMPLATE_VERSION`, and `CONTRACTS_BUCKET` for Tasks 3–5.

- [ ] **Step 1: Write failing validation and snapshot tests**

Create `tests/domain/contracts-input.test.ts` with the following cases:

```ts
const valid = {
  shootId: "00000000-0000-4000-8000-000000000001",
  cpf: "111.444.777-35",
  birthday: "1994-03-12",
  addressStreet: "Rua Teste",
  addressNumber: "12",
  addressNeighborhood: "Centro",
  addressCity: "Manaus",
  addressState: "AM",
  addressPostalCode: "69000-000",
  imageUsage: "authorized",
};

expect(issueContractSchema.safeParse(valid).success).toBe(true);

expect(issueContractSchema.safeParse({ ...valid, cpf: "00000000000" }).success).toBe(false);
expect(issueContractSchema.safeParse({ ...valid, addressCity: "" }).success).toBe(false);
expect(issueContractSchema.safeParse({ ...valid, imageUsage: undefined }).success).toBe(false);
```

Create `tests/domain/contracts-snapshot.test.ts` that creates a context fixture with changed-after-issue copies. Assert that `buildContractSnapshot()` only contains its input values, normalizes money to `"0.00"`, excludes pending/estornado payments, contains exactly the R$ 50,00/15-day/30-day policy values, and includes the explicit image choice.

Create `tests/domain/contractor-config.test.ts` that passes an injected environment map: accepted fully populated values, rejected missing value, and never asserts real identity data.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npx vitest run tests/domain/contracts-input.test.ts tests/domain/contracts-snapshot.test.ts tests/domain/contractor-config.test.ts --reporter=verbose --maxWorkers=1
```

Expected: FAIL because the contracts domain does not exist.

- [ ] **Step 3: Implement strict validation without making ordinary CRM creation heavier**

In `domain/contracts/schema.ts`, implement CPF normalization and check digits, then require all contract-only fields:

```ts
export const issueContractSchema = z.object({
  shootId: z.string().uuid(),
  cpf: z.string().transform(normalizeCpf).refine(isValidCpf, "CPF inválido"),
  birthday: z.iso.date(),
  addressStreet: z.string().trim().min(1).max(180),
  addressNumber: z.string().trim().min(1).max(30),
  addressComplement: z.string().trim().max(120).optional(),
  addressNeighborhood: z.string().trim().min(1).max(120),
  addressCity: z.string().trim().min(1).max(120),
  addressState: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  addressPostalCode: z.string().transform(normalizePostalCode).refine(isValidPostalCode, "CEP inválido"),
  imageUsage: z.enum(["authorized", "not_authorized"]),
});
```

Extend `createClientSchema` and `updateClientSchema` only with optional versions of these new fields. Preserve the existing `name`-only behavior and current `birthday` validation. Extend `clientFormSchema` with the same optional fields so an Admin can correct them outside issuance; do not make them required in the new-client form.

- [ ] **Step 4: Implement protected contractor configuration and deterministic snapshot construction**

Use server-only access in `domain/contracts/contractor.ts`:

```ts
import "server-only";

export const CONTRACTOR_ENV_KEYS = [
  "STUDIO_CONTRACTOR_NAME",
  "STUDIO_CONTRACTOR_CPF",
  "STUDIO_CONTRACTOR_ADDRESS",
] as const;

export function getContractorProfile(env: NodeJS.ProcessEnv = process.env) {
  const [name, cpf, address] = CONTRACTOR_ENV_KEYS.map((key) => env[key]?.trim());
  if (!name || !cpf || !address) throw new Error("contractor configuration is incomplete");
  if (!isValidCpf(normalizeCpf(cpf))) throw new Error("contractor configuration is invalid");
  return { name, cpf: normalizeCpf(cpf), address };
}
```

In `domain/contracts/snapshot.ts`, declare the policy constants and produce a fresh JSON-safe object. Compute confirmed payments only, using the existing decimal helpers. The public terms must be exactly:

```ts
export const CONTRACT_TERMS = {
  rescheduleFee: "50.00",
  rescheduleWindowDays: 15,
  refundWindowDays: 30,
} as const;
export const CONTRACT_TEMPLATE_VERSION = "1.0";
export const CONTRACTS_BUCKET = "contracts";
```

Format the client address from the individual fields inside the snapshot, not from a display-only browser string. Do not include `notes`, payment proof URLs, e-mail, Instagram, Auth user IDs, or internal production data in the snapshot.

- [ ] **Step 5: Document only variable names and rerun tests**

Append placeholders, never values, to `.env.example`:

```dotenv
# Contratos PDF (SCL-310) — valores protegidos apenas no servidor.
STUDIO_CONTRACTOR_NAME=
STUDIO_CONTRACTOR_CPF=
STUDIO_CONTRACTOR_ADDRESS=
```

Run:

```powershell
npx vitest run tests/domain/contracts-input.test.ts tests/domain/contracts-snapshot.test.ts tests/domain/contractor-config.test.ts tests/domain/clients.test.ts tests/domain/clients-form-schema.test.ts --reporter=verbose --maxWorkers=1
npm run typecheck
```

Expected: validation, configuration, snapshots and existing name-only client behavior all pass.

- [ ] **Step 6: Commit the domain checkpoint**

```powershell
git add domain/contracts/schema.ts domain/contracts/contractor.ts domain/contracts/snapshot.ts domain/clients/schema.ts domain/clients/form-schema.ts .env.example tests/domain/contracts-input.test.ts tests/domain/contracts-snapshot.test.ts tests/domain/contractor-config.test.ts
git commit -m "feat(contracts): validate issuance snapshots"
```

### Task 3: Render the fixed legal template as a server-only PDF

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `domain/contracts/pdf.tsx`
- Create: `tests/domain/contracts-pdf.test.tsx`

**Interfaces:**
- Consumes: `ContractSnapshot`, `CONTRACT_TEMPLATE_VERSION` and a contract number from Tasks 1–2.
- Produces: `renderContractPdf(input): Promise<Buffer>` for Task 4; it never reads `process.env` or database state itself.

- [ ] **Step 1: Add tests that inspect the emitted PDF text**

Create a fixture snapshot using placeholder data. In `tests/domain/contracts-pdf.test.tsx`, generate the buffer and extract text with `pdf-parse` (add it as a dev dependency if the installed renderer does not expose text extraction). Assert that the PDF includes:

```ts
expect(text).toContain("CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS");
expect(text).toContain("R$ 50,00");
expect(text).toContain("15 dias");
expect(text).toContain("30 dias");
expect(text).toContain("AUTORIZA o uso de imagem");
expect(text).toContain("Blocos para assinatura manual");
```

Create a second fixture with `imageUsageAuthorized: false` and assert it contains the non-authorization sentence instead. Assert the output does not contain `undefined`, `null`, a service role key marker, or client internal notes.

- [ ] **Step 2: Run the PDF test and verify RED**

Run:

```powershell
npx vitest run tests/domain/contracts-pdf.test.tsx --reporter=verbose --maxWorkers=1
```

Expected: FAIL because no renderer exists.

- [ ] **Step 3: Install the pure JavaScript PDF renderer and implement the template**

Install `@react-pdf/renderer` as a production dependency. If text extraction needs it, add `pdf-parse` as a dev dependency; do not add a browser PDF viewer or any native binary dependency.

Create `domain/contracts/pdf.tsx` as server-only. Its narrow interface must be:

```ts
import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ContractSnapshot } from "@/db/schema";

export type ContractPdfInput = {
  contractNumber: string;
  issuedAt: string;
  snapshot: ContractSnapshot;
};

export async function renderContractPdf(input: ContractPdfInput): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(
    <ContractPdfDocument
      contractNumber={input.contractNumber}
      issuedAt={input.issuedAt}
      snapshot={input.snapshot}
    />,
  ));
}
```

Use A4 pages, legible body type, page numbering, one heading hierarchy and semantic contract sections. Hard-code only the approved policy wording and template version, never the contractor’s real identity. The content sections must be: parties; object/package/deliverables; schedule/location; price/payments/balance; rescheduling; cancellation/refund; image authorization; personal data; signature blocks. Render `AUTORIZA` only for opt-in and `NÃO AUTORIZA` otherwise.

- [ ] **Step 4: Run renderer, type and build validation**

Run:

```powershell
npx vitest run tests/domain/contracts-pdf.test.tsx --reporter=verbose --maxWorkers=1
npm run typecheck
npm run build
```

Expected: PDF test passes, the renderer stays server-only, and the production build has no static-time configuration failure.

- [ ] **Step 5: Commit the rendering checkpoint**

```powershell
git add package.json package-lock.json domain/contracts/pdf.tsx tests/domain/contracts-pdf.test.tsx
git commit -m "feat(contracts): render printable PDF"
```

### Task 4: Issue contracts atomically enough for users and serve temporary downloads

**Files:**
- Create: `domain/contracts/queries.ts`
- Create: `domain/contracts/service.ts`
- Create: `domain/contracts/actions.ts`
- Create: `app/api/admin/contracts/[id]/download/route.ts`
- Create: `tests/domain/contracts-service.test.ts`
- Create: `tests/app/contracts-download-route.test.ts`

**Interfaces:**
- Consumes: schemas/snapshots from Tasks 1–2, `renderContractPdf()` from Task 3, `defineAdminAction`, `recordAuditEvent` conventions, `createSupabaseServerClient`, and current user role checks.
- Produces: `getContractIssueContext`, `listContractsForShoot`, `listContractsForClient`, `issueContract`, `issueContractAction`, and an authenticated download endpoint for Task 5.

- [ ] **Step 1: Write failing service tests for the full issuance boundary**

In `tests/domain/contracts-service.test.ts`, inject fakes for database, PDF renderer, Storage and UUID generation. Cover the following exact outcomes:

```ts
await expect(issueContract(deps, validInput)).resolves.toMatchObject({
  status: "issued",
  imageUsageAuthorized: true,
  pdfStoragePath: expect.stringMatching(/^contracts\/[0-9a-f-]{36}\.pdf$/i),
});
expect(deps.storage.upload).toHaveBeenCalledWith(
  expect.stringMatching(/^contracts\/[0-9a-f-]{36}\.pdf$/i),
  expect.any(Uint8Array),
  { contentType: "application/pdf", upsert: false },
);

await expect(issueContract(uploadFailsDeps, validInput)).rejects.toThrow("contract issuance failed");
expect(uploadFailsDeps.db.insertContract).not.toHaveBeenCalled();

await expect(issueContract(insertFailsDeps, validInput)).rejects.toThrow("contract issuance failed");
expect(insertFailsDeps.storage.remove).toHaveBeenCalledWith([expectedPath]);
```

Also assert that the transaction writes the contract and its `contract.issued` audit entry together; no audit event includes full CPF or address, only contract ID/number, shoot ID, template version and authorization choice.

In `tests/app/contracts-download-route.test.ts`, mock the session, role, contract lookup and `createSignedUrl`. Assert unauthenticated/non-staff receives no signed URL and `403`/redirect to admin login; staff receives a `307` redirect to the one-minute signed URL; missing contract returns `404`; Storage failure returns a neutral `500` response.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npx vitest run tests/domain/contracts-service.test.ts tests/app/contracts-download-route.test.ts --reporter=verbose --maxWorkers=1
```

Expected: FAIL because issuance/query/download functions do not exist.

- [ ] **Step 3: Implement minimal staff-only reads and issue context**

`getContractIssueContext(shootId)` must execute an inner join across `shoots`, `clients`, `experience_packages` and `payments`, return `null` for an unknown shoot, and project only the fields required by the contract. Exclude client notes, payment proof URL, production job and portal details. `listContractsForShoot` and `listContractsForClient` must select only `id`, `contractNumber`, `status`, `issuedAt`, `imageUsageAuthorized` and no JSON snapshot/civil data.

Define narrow injected interfaces in `service.ts` so service tests do not need a live database:

```ts
export type ContractStorage = {
  upload(path: string, body: Uint8Array, options: { contentType: "application/pdf"; upsert: false }): Promise<{ error: unknown | null }>;
  remove(paths: string[]): Promise<{ error: unknown | null }>;
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: unknown | null }>;
};

export type IssueContractResult = { id: string; contractNumber: string; status: "issued"; issuedAt: string };
```

- [ ] **Step 4: Implement issuance and compensating cleanup**

`issueContract()` follows this order:

1. Parse input with `issueContractSchema`; read contractor configuration; load current context; reject a missing shoot.
2. Build one snapshot from the submitted civil fields, the database context and only confirmed payments.
3. Create `contractId = crypto.randomUUID()`, `contractNumber = "SCL-" + contractId.toUpperCase()`, and `pdfStoragePath = "contracts/" + contractId + ".pdf"`.
4. Render the PDF from this snapshot, then upload it with `{ contentType: "application/pdf", upsert: false }` through the authenticated staff Supabase client.
5. In one database transaction, update only the client civil fields, insert the issued contract and insert the redacted `contract.issued` audit event.
6. If upload fails, do not write a contract. If the transaction fails after upload, attempt `remove([pdfStoragePath])`, log the cleanup failure with only contract ID/path, then throw `new Error("contract issuance failed")`.

Use `revalidatePath` only in the server action after success: the shoot page, `/admin/agenda`, the linked client page and `/admin/clientes`. Never call a Storage operation from a Client Component.

The action must have this public boundary:

```ts
export const issueContractAction = defineAdminAction(
  { role: "staff", input: issueContractSchema },
  async (input, ctx) => issueContract({ input, issuedByAuthUserId: ctx.user.id }),
);
```

- [ ] **Step 5: Implement secure temporary download**

Add `app/api/admin/contracts/[id]/download/route.ts`:

```ts
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/contracts/[id]/download">) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) return new Response("Não autorizado.", { status: 403 });
  const { id } = await ctx.params;
  const contract = await getContractDownload(id);
  if (!contract) return new Response("Documento não encontrado.", { status: 404 });
  const supabase = await createSupabaseServerClient();
  const signed = await supabase.storage.from(CONTRACTS_BUCKET).createSignedUrl(contract.pdfStoragePath, 60);
  if (signed.error || !signed.data?.signedUrl) return new Response("Não foi possível preparar o documento.", { status: 500 });
  return Response.redirect(signed.data.signedUrl, 307);
}
```

The RLS bucket policy is a second authorization boundary; the route must still check the app role before looking up or signing any path.

- [ ] **Step 6: Run focused gates and commit**

Run:

```powershell
npx vitest run tests/domain/contracts-service.test.ts tests/app/contracts-download-route.test.ts --reporter=verbose --maxWorkers=1
npm run typecheck
npm run check:admin-auth
```

Then commit:

```powershell
git add domain/contracts/queries.ts domain/contracts/service.ts domain/contracts/actions.ts app/api/admin/contracts/[id]/download/route.ts tests/domain/contracts-service.test.ts tests/app/contracts-download-route.test.ts
git commit -m "feat(contracts): issue private contract PDFs"
```

### Task 5: Add the Admin review, issuance and document history UI

**Files:**
- Create: `components/admin/contracts-list.tsx`
- Create: `app/admin/(protected)/agenda/[id]/contrato/page.tsx`
- Create: `app/admin/(protected)/agenda/[id]/contract-issue-panel.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/page.tsx`
- Modify: `app/admin/(protected)/clientes/[id]/page.tsx`
- Modify: `app/admin/(protected)/clientes/[id]/editar/page.tsx`
- Modify: `app/admin/(protected)/clientes/[id]/editar/edit-client-form.tsx`
- Modify: `components/admin/client-form.tsx`
- Create: `tests/components/contracts-list.test.tsx`
- Create: `tests/app/contract-issue-panel.test.tsx`
- Modify: `tests/domain/client-detail.test.ts`

**Interfaces:**
- Consumes: task-4 action/query interfaces; existing `ClientForm`, `Field`, `Input`, `FormStatus`, `SubmitButton`, `DetailSection`, admin page guard and design tokens.
- Produces: staff-only UI for issuance and historical PDF downloads.

- [ ] **Step 1: Write failing component and page-contract tests**

`tests/components/contracts-list.test.tsx` must assert an empty state, contract number/date/status/authorization label and a link exactly shaped as `/api/admin/contracts/<id>/download`. It must not render snapshot fields, CPF or address.

`tests/app/contract-issue-panel.test.tsx` must assert:

```ts
expect(screen.getByLabelText("CPF")).toBeRequired();
expect(screen.getByLabelText("Data de nascimento")).toBeRequired();
expect(screen.getByLabelText("Autorizo o uso de imagem"))
  .not.toBeChecked();
expect(screen.getByRole("button", { name: "Gerar contrato" })).toBeDisabled();
```

Fill all civil fields and select one of the two authorization radios. Then assert that the serialized action input contains `imageUsage: "authorized"` or `"not_authorized"`, and that success presents a download link plus an accessible confirmation. A missing required field must retain focusable field errors and must not invoke the action.

Extend `tests/domain/client-detail.test.ts` to assert client document list data is isolated from financial and civil snapshot fields.

- [ ] **Step 2: Run the UI tests and verify RED**

Run:

```powershell
npx vitest run tests/components/contracts-list.test.tsx tests/app/contract-issue-panel.test.tsx tests/domain/client-detail.test.ts --reporter=verbose --maxWorkers=1
```

Expected: FAIL because no contract UI exists.

- [ ] **Step 3: Add reusable, non-sensitive document history**

Implement `ContractsList` with a compact `DataTable` or semantic list. It accepts only:

```ts
type ContractListItem = {
  id: string;
  contractNumber: string;
  status: "issued" | "voided";
  issuedAt: string;
  imageUsageAuthorized: boolean;
};
```

Render a staff link labelled `Baixar PDF` to the protected Route Handler. Keep it same-tab so browser print/download controls work. It must never accept or receive `snapshot` props.

Add a `Documentos` `DetailSection` to the client page, using `listContractsForClient(id)`. Add the same section to the shoot page via `listContractsForShoot(id)`, and put a visible link beside the page header action:

```tsx
<Link
  href={`/admin/agenda/${id}/contrato`}
  className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-white"
>
  Gerar contrato
</Link>
```

- [ ] **Step 4: Build the review-first issuance screen**

The server page retrieves `getContractIssueContext(id)` and returns `notFound()` for an unknown shoot. The client panel renders package, date, location, agreed price, confirmed paid and current balance as read-only review values; users cannot alter those values in this form.

Render CPF, date of birth and all address fields with labels, `required`, `autocomplete` values (`off` for CPF, `bday`, `address-line1`, `address-line2`, `address-level2`, `address-level1`, `postal-code`) and field errors from `toFormAction`. The CPF/address input values may be prefilled from the existing client only in the authenticated staff browser.

For image use, make an explicit radio group with no default selection:

```tsx
<fieldset>
  <legend>Uso de imagem no contrato</legend>
  <label><input type="radio" name="imageUsage" value="authorized" required /> Autorizo o uso de imagem</label>
  <label><input type="radio" name="imageUsage" value="not_authorized" required /> Não autorizo o uso de imagem</label>
</fieldset>
```

Before the submit control, display the two fixed policy summaries. Disable submission until all required browser fields and a radio choice are present; server Zod remains authoritative. On action success, call `router.refresh()` and display the protected `Baixar PDF` link returned from the contract ID, without exposing a signed URL.

Expose these same optional civil fields in the existing edit-client form under a clearly titled `Dados para contrato` section. Do not add them to the new client form; this preserves the name/WhatsApp-first CRM flow.

- [ ] **Step 5: Run UI/accessibility-focused gates**

Run:

```powershell
npx vitest run tests/components/contracts-list.test.tsx tests/app/contract-issue-panel.test.tsx tests/domain/client-detail.test.ts --reporter=verbose --maxWorkers=1
npm run lint
npm run typecheck
```

Expected: UI tests pass; no new lint errors or warnings; required controls, success feedback and download path are covered.

- [ ] **Step 6: Commit the Admin experience checkpoint**

```powershell
git add components/admin/contracts-list.tsx app/admin/(protected)/agenda/[id]/contrato/page.tsx app/admin/(protected)/agenda/[id]/contract-issue-panel.tsx app/admin/(protected)/agenda/[id]/page.tsx app/admin/(protected)/clientes/[id]/page.tsx app/admin/(protected)/clientes/[id]/editar/page.tsx app/admin/(protected)/clientes/[id]/editar/edit-client-form.tsx components/admin/client-form.tsx tests/components/contracts-list.test.tsx tests/app/contract-issue-panel.test.tsx tests/domain/client-detail.test.ts
git commit -m "feat(admin): add contract issuance workflow"
```

### Task 6: Prove privacy boundaries, document deployment and close SCL-310

**Files:**
- Create: `tests/domain/contracts-storage.integration.test.ts`
- Modify: `docs/runbooks/supabase-setup.md`
- Modify: `docs/TASKS.md`
- Modify: `docs/DECISIONS.md`

**Interfaces:**
- Consumes: all issued contract code and the `contracts` table/bucket from Tasks 1–5.
- Produces: live proof of staff-only document access, deployment steps and a completed task record.

- [ ] **Step 1: Write the live RLS/Storage test with cleanup before fixtures**

Use the established `RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip` pattern. Preallocate IDs and create: staff A, staff B, a client portal user, two client rows, an experience, shoot A and shoot B. Track all contract IDs and object paths in `Set`s before writes.

The live test must prove:

```ts
// Client portal user cannot list, insert, update or delete contracts.
expect(clientRead.data).toEqual([]);
expect(clientInsert.error).not.toBeNull();

// Staff can read/upload/sign only contract objects through the private bucket.
expect(staffRead.error).toBeNull();
expect((await staff.storage.from(CONTRACTS_BUCKET).createSignedUrl(path, 60)).data?.signedUrl)
  .toContain("token=");

// An object for shoot A never becomes readable through a client session or public URL.
expect((await client.storage.from(CONTRACTS_BUCKET).download(path)).error).not.toBeNull();
```

In `afterAll`, remove Storage objects first, then contract rows, shoots, clients and Auth users. Query each relation and `storage.list("contracts")` to assert no fixture residue. Aggregate cleanup errors rather than masking them.

- [ ] **Step 2: Run the live test only with explicit opt-in**

Run only after confirming this is the development/staging Supabase project:

```powershell
$env:RUN_LIVE_DB_TESTS='true'; npx vitest run tests/domain/contracts-storage.integration.test.ts --reporter=verbose --maxWorkers=1
```

Expected: either `PASS` with zero cleanup residue or `SKIP` when the explicit flag is absent. Never point the fixture at production data.

- [ ] **Step 3: Document protected configuration and operations**

In `docs/runbooks/supabase-setup.md`, add a `Contratos PDF` section covering:

1. Add the three `STUDIO_CONTRACTOR_*` values as **Secret** variables in Vercel for Production, Preview and local `.env.local`; never mark them public.
2. Apply `npm run db:migrate` once to the intended Supabase environment before deploying application code.
3. Verify bucket `contracts` is private, table RLS is enabled and only `staff/admin` policies exist.
4. Issue a disposable test contract, download it using an authenticated staff account, and delete the test data/object through the controlled cleanup path.
5. Have Brazilian legal counsel approve the exact template text before first commercial issuance.

In `docs/DECISIONS.md`, record that the PDF snapshot is the historical source of truth, not mutable CRM/package records; signed URLs expire after 60 seconds; client portal access is intentionally out of scope.

- [ ] **Step 4: Run the complete verification suite**

Run:

```powershell
npm run predb:migrate
npm run test
npm run lint
npm run typecheck
npm run check:admin-auth
npm run build
git diff --check
```

Expected: migration journal check, tests, lint, TypeScript, admin guard and production build pass. Record only pre-existing warnings separately if they remain; do not label the feature complete with new warnings/errors.

- [ ] **Step 5: Mark the tracked task complete and commit documentation**

Set SCL-310 from `IN_PROGRESS` to `DONE` only after all gates and the live cleanup audit pass. Include exact commands/results in Hand-off notes without copying any personal values.

```powershell
git add tests/domain/contracts-storage.integration.test.ts docs/runbooks/supabase-setup.md docs/DECISIONS.md docs/TASKS.md
git commit -m "test(contracts): verify private PDF access"
```

## Self-review

### Spec coverage

- Manual single-template PDF, print/manual send, client/shoot history, protected download and no electronic signature/autosend/editor are implemented by Tasks 3–5.
- CPF, birth date and complete address are required only by the issue action/UI; normal client creation remains name/WhatsApp-first in Task 2 and Task 5.
- Package, shoot, confirmed payments, balance, image choice, issued timestamp, issuer and contractor profile are frozen in the Task 2 snapshot and Task 4 transaction.
- R$ 50/15-day rescheduling, full paid-value refund through 30 days, then no refund, image opt-in, data text and manual signatures are specified as PDF content in Task 3.
- Private Storage/RLS, staff-only signed URL, redacted auditing, cleanup and live proof are covered by Tasks 1, 4 and 6.
- Legal review, secret deployment configuration and no private data in source control are explicit global constraints and Task 6 runbook steps.

### Placeholder scan

Searched this plan for `TODO`, `TBD`, `implement later`, and unscoped “appropriate error handling”. None remain. Every task has named files, interfaces, RED/GREEN commands and a commit checkpoint.

### Type consistency

`ContractSnapshot` originates in `db/schema/contracts.ts`, is built by `buildContractSnapshot`, rendered by `renderContractPdf`, stored by `issueContract`, and never crosses into document list props. `issueContractSchema` is the server action input, with `imageUsage` mapped once into immutable `imageUsageAuthorized` in the snapshot and contract row. The protected download route uses the contract `id`, never a storage path supplied by the browser.
