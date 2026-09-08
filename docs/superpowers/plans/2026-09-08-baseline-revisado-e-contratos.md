# Baseline revisado e fechamento de contratos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Versionar o PRD/TASKS/checklist revisados e concluir SCL-310 com emissão administrativa, histórico e prova de privacidade para contratos PDF.

**Architecture:** A UI usa as queries e o serviço de contratos existentes; PDF, snapshot e URL assinada ficam no servidor. O Admin acessa somente uma rota interna de download. SCL-310 só muda de estado depois de evidência integrada e gates verificados.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, Drizzle/Postgres, Supabase Auth/Storage/RLS, Zod 4 e @react-pdf/renderer.

## Global Constraints

- Rotas e Server Actions administrativas permanecem sob app/admin/(protected)/ e defineAdminAction.
- Não serializar pdfStoragePath, snapshot, URLs assinadas, CPF ou endereço para listas/browser além do formulário de emissão.
- contracts é privado; cliente do portal não recebe acesso a tabela, objeto ou URL.
- Dados civis são obrigatórios para emitir; criar cliente continua nome/telefone-first.
- Dinheiro é decimal-string e saldo usa helpers existentes, sem um novo agregado persistido.
- Teste real usa RUN_LIVE_DB_TESTS === "true", fixtures descartáveis e cleanup Storage → rows → Auth.
- Não criar migration, assinatura eletrônica, autosend, editor livre, modelos múltiplos ou acesso de cliente ao contrato.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| domain/contracts/queries.ts | Projeta dados civis privados somente no contexto de emissão. |
| components/admin/contracts-list.tsx | Histórico serializado sem caminho de Storage. |
| app/admin/(protected)/agenda/[id]/contrato/* | Revisão server-side e painel de emissão. |
| components/admin/client-form.tsx | Edição opcional de dados civis; criação permanece enxuta. |
| agenda/[id]/page.tsx e clientes/[id]/page.tsx | Atalho e histórico por ensaio/cliente. |
| tests/**/*contract*.test* | Provas unitárias, UI e integração privada. |
| docs/PRD.md, docs/TASKS.md, docs/CHECKLIST-MVP.md | Baseline revisado e status factual. |

### Task 1: Expor dados civis privados no contexto e na edição de cliente

**Files:**
- Modify: domain/contracts/queries.ts
- Modify: components/admin/client-form.tsx
- Modify: app/admin/(protected)/clientes/[id]/editar/page.tsx
- Test: tests/domain/contracts-queries.test.ts
- Test: tests/components/client-form.test.tsx

**Interfaces:**
- Consumes: clients, getContractIssueContext, updateClientAction e schema civil existente.
- Produces: ContractIssueContext.client com dados civis server-only; ClientForm recebe showContractFields?: boolean.

- [ ] **Step 1: Write the failing tests**

~~~tsx
it("keeps civil data in the server-only issue context", async () => {
  const context = await getContractIssueContext("11111111-1111-4111-8111-111111111111");
  expect(context?.client).toMatchObject({
    cpf: "52998224725",
    addressPostalCode: "69000000",
  });
});

it("renders contract fields only on the edit surface", () => {
  const { rerender } = render(<ClientForm action={action} initialValues={{ name: "Lia" }} />);
  expect(screen.queryByLabelText("CPF")).not.toBeInTheDocument();

  rerender(<ClientForm action={action} initialValues={{ name: "Lia" }} showContractFields />);
  expect(screen.getByLabelText("CEP")).toHaveAttribute("name", "addressPostalCode");
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run tests/domain/contracts-queries.test.ts tests/components/client-form.test.tsx --reporter=verbose --maxWorkers=1

Expected: FAIL because the query selection and showContractFields prop do not exist.

- [ ] **Step 3: Implement the smallest data surface**

Extend the query type and Drizzle selection with cpf, birthday, addressStreet, addressNumber, addressComplement, addressNeighborhood, addressCity, addressState and addressPostalCode, each string | null. Extend ClientForm Values and render only when showContractFields is true:

~~~tsx
{showContractFields ? (
  <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
    <legend className="font-serif text-xl text-ink">Dados para contrato</legend>
    <Field label="CPF" htmlFor="cpf" error={fieldError("cpf")}>
      <Input id="cpf" name="cpf" autoComplete="off" defaultValue={initialValues?.cpf ?? ""} />
    </Field>
    <Field label="CEP" htmlFor="addressPostalCode" error={fieldError("addressPostalCode")}>
      <Input id="addressPostalCode" name="addressPostalCode" autoComplete="postal-code" defaultValue={initialValues?.addressPostalCode ?? ""} />
    </Field>
  </fieldset>
) : null}
~~~

In the same fieldset render `birthday` (`type="date"`, `autoComplete="bday"`), `addressStreet` (`address-line1`), `addressNumber`, `addressComplement` (`address-line2`), `addressNeighborhood`, `addressCity` (`address-level2`) and `addressState` (`address-level1`). Each uses `Field`, has its exact schema field name and derives its default from `initialValues`. In the edit page pass every persisted civil value and `showContractFields`; do not set that prop in any create-client page.

- [ ] **Step 4: Verify GREEN and commit**

Run: npx vitest run tests/domain/contracts-queries.test.ts tests/components/client-form.test.tsx --reporter=verbose --maxWorkers=1

Expected: PASS.

~~~powershell
git add -- domain/contracts/queries.ts components/admin/client-form.tsx "app/admin/(protected)/clientes/[id]/editar/page.tsx" tests/domain/contracts-queries.test.ts tests/components/client-form.test.tsx
git commit -m "feat(contracts): expose issue context and civil data"
~~~

### Task 2: Render document history without Storage leakage

**Files:**
- Create: components/admin/contracts-list.tsx
- Modify: app/admin/(protected)/agenda/[id]/page.tsx
- Modify: app/admin/(protected)/clientes/[id]/page.tsx
- Test: tests/components/contracts-list.test.tsx

**Interfaces:**
- Consumes: listContractsForShoot and listContractsForClient selections.
- Produces: ContractsList with protected API links only.

- [ ] **Step 1: Write the failing component test**

~~~tsx
it("uses the protected endpoint rather than a storage path", () => {
  render(<ContractsList contracts={[{
    id: "f8a1cdb8-0d69-41b5-9693-e8d1a76ef3dd",
    contractNumber: "SCL-F8A1",
    status: "issued",
    issuedAt: new Date("2026-09-08T12:00:00Z"),
    imageUsageAuthorized: true,
  }]} />);

  expect(screen.getByRole("link", { name: "Baixar PDF SCL-F8A1" }))
    .toHaveAttribute("href", "/api/admin/contracts/f8a1cdb8-0d69-41b5-9693-e8d1a76ef3dd/download");
  expect(screen.queryByText(/contracts\//)).not.toBeInTheDocument();
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run tests/components/contracts-list.test.tsx --reporter=verbose --maxWorkers=1

Expected: FAIL because ContractsList does not exist.

- [ ] **Step 3: Implement and integrate the safe list**

~~~tsx
export type ContractListItem = {
  id: string;
  contractNumber: string;
  status: "issued" | "void";
  issuedAt: Date;
  imageUsageAuthorized: boolean;
};

export function ContractsList({ contracts }: { contracts: ContractListItem[] }) {
  if (!contracts.length) {
    return <p className="font-sans text-sm text-muted">Nenhum contrato emitido.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {contracts.map((contract) => (
        <li key={contract.id} className="flex items-center justify-between gap-4 py-3">
          <span className="font-sans text-sm text-ink">{contract.contractNumber}</span>
          <a href={"/api/admin/contracts/" + contract.id + "/download"} aria-label={"Baixar PDF " + contract.contractNumber} className="underline underline-offset-2">
            Baixar PDF
          </a>
        </li>
      ))}
    </ul>
  );
}
~~~

Load the existing queries with page reads. Add a Contratos detail section and a Gerar contrato link on shoot detail. Add a Documentos section on client detail. Pass only the five ContractListItem fields.

- [ ] **Step 4: Verify GREEN and commit**

Run: npx vitest run tests/components/contracts-list.test.tsx --reporter=verbose --maxWorkers=1

Expected: PASS.

~~~powershell
git add -- components/admin/contracts-list.tsx "app/admin/(protected)/agenda/[id]/page.tsx" "app/admin/(protected)/clientes/[id]/page.tsx" tests/components/contracts-list.test.tsx
git commit -m "feat(admin): show contract history"
~~~

### Task 3: Build the review-first issuance page and panel

**Files:**
- Create: app/admin/(protected)/agenda/[id]/contrato/page.tsx
- Create: app/admin/(protected)/agenda/[id]/contrato/contract-issue-panel.tsx
- Test: tests/app/contract-issue-page.test.tsx
- Test: tests/app/contract-issue-panel.test.tsx

**Interfaces:**
- Consumes: getContractIssueContext, issueContractAction, issueContractSchema, format helpers and Task 1 context.
- Produces: protected issuance route with exact z.input<typeof issueContractSchema> payload.

- [ ] **Step 1: Write failing page and panel tests**

~~~tsx
it("returns notFound when no shoot can be issued", async () => {
  mockedGetContext.mockResolvedValue(null);
  await expect(ContractIssuePage({ params: Promise.resolve({ id: shootId }) })).rejects.toThrow(NOT_FOUND);
});

it("requires explicit image usage and hides download before issuance", () => {
  render(<ContractIssuePanel shootId={shootId} initialCivilData={emptyCivilData} />);
  expect(screen.getByRole("radio", { name: "Autorizo o uso de imagem" })).not.toBeChecked();
  expect(screen.queryByRole("link", { name: /Baixar PDF/ })).not.toBeInTheDocument();
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run tests/app/contract-issue-page.test.tsx tests/app/contract-issue-panel.test.tsx --reporter=verbose --maxWorkers=1

Expected: FAIL because page and panel do not exist.

- [ ] **Step 3: Implement the server page and bounded panel**

The page awaits params, loads context, calls notFound() on null and renders package, date, local, value, confirmed paid and derived balance using existing money helpers. The panel uses useActionState(toFormAction(issueContractAction), null), all civil inputs, hidden shootId, Field errors and FormStatus. It must contain:

~~~tsx
<fieldset>
  <legend>Uso de imagem no contrato</legend>
  <label><input required type="radio" name="imageUsage" value="authorized" /> Autorizo o uso de imagem</label>
  <label><input required type="radio" name="imageUsage" value="not_authorized" /> Não autorizo o uso de imagem</label>
</fieldset>
{issued ? (
  <a href={"/api/admin/contracts/" + issued.id + "/download"}>
    Baixar PDF {issued.contractNumber}
  </a>
) : null}
~~~

After success call router.refresh() once. Do not derive a signed URL in browser.

- [ ] **Step 4: Verify GREEN and commit**

Run: npx vitest run tests/app/contract-issue-page.test.tsx tests/app/contract-issue-panel.test.tsx --reporter=verbose --maxWorkers=1

Expected: PASS.

~~~powershell
git add -- "app/admin/(protected)/agenda/[id]/contrato/page.tsx" "app/admin/(protected)/agenda/[id]/contrato/contract-issue-panel.tsx" tests/app/contract-issue-page.test.tsx tests/app/contract-issue-panel.test.tsx
git commit -m "feat(admin): issue contracts from shoot review"
~~~

### Task 4: Prove private contracts in live Supabase with cleanup

**Files:**
- Create: tests/domain/contracts-storage.integration.test.ts
- Modify: .env.example
- Test: tests/domain/contracts-storage.integration.test.ts

**Interfaces:**
- Consumes: CONTRACTS_BUCKET, contracts, clients, shoots, profiles, seed package and assertAuthUserAbsent.
- Produces: opt-in proof of staff access, portal denial and zero fixture residue.

- [ ] **Step 1: Write the guarded failing live test**

~~~ts
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

it("lets staff sign a PDF but denies the portal client", async () => {
  expect(clientRead.data).toEqual([]);
  expect(clientInsert.error).not.toBeNull();
  expect((await clientSupabase.storage.from(CONTRACTS_BUCKET).download(path)).data).toBeNull();
  expect((await staffSupabase.storage.from(CONTRACTS_BUCKET).createSignedUrl(path, 60)).data?.signedUrl)
    .toContain("token=");
});
~~~

Preallocate staff/client Auth IDs and client/shoot/contract/path. In afterAll aggregate errors; delete object, contract, shoot, client, then Auth users; query every relation/prefix and call assertAuthUserAbsent.

- [ ] **Step 2: Verify safe skip then GREEN against development/staging**

Run: npx vitest run tests/domain/contracts-storage.integration.test.ts --reporter=verbose --maxWorkers=1

Expected: skipped and no write.

After confirming environment is not production:

~~~powershell
$env:RUN_LIVE_DB_TESTS="true"
npx vitest run tests/domain/contracts-storage.integration.test.ts --reporter=verbose --maxWorkers=1
Remove-Item Env:RUN_LIVE_DB_TESTS
~~~

Expected: PASS and cleanup assertions pass. If target cannot be proven non-production, stop before opt-in and leave SCL-310 in progress.

- [ ] **Step 3: Commit privacy proof**

~~~powershell
git add -- tests/domain/contracts-storage.integration.test.ts .env.example
git commit -m "test(contracts): prove private storage access"
~~~

### Task 5: Synchronize approved documents and operations

**Files:**
- Modify: docs/PRD.md
- Modify: docs/TASKS.md
- Create: docs/CHECKLIST-MVP.md
- Modify: docs/runbooks/supabase-setup.md
- Modify: docs/DECISIONS.md

**Interfaces:**
- Consumes: three approved download documents and verified Tasks 1–4.
- Produces: repository baseline, protected operation instructions and factual SCL-310 status.

- [ ] **Step 1: Copy and hash approved sources**

~~~powershell
Copy-Item -LiteralPath "C:\Users\HudsonCarol\Downloads\PRD-Studio-Carol-Lucas-Experience-Studio-OS-v1.1.md" -Destination "docs\PRD.md"
Copy-Item -LiteralPath "C:\Users\HudsonCarol\Downloads\TASKS-Studio-Carol-Lucas-v2.0.md" -Destination "docs\TASKS.md"
Copy-Item -LiteralPath "C:\Users\HudsonCarol\Downloads\CHECKLIST-Cobertura-MVP-Studio-Carol-Lucas-v1.1.md" -Destination "docs\CHECKLIST-MVP.md"
Get-FileHash "docs\PRD.md","docs\TASKS.md","docs\CHECKLIST-MVP.md" | Select-Object Path,Hash
~~~

Expected: hashes equal their sources before final SCL-310 evidence edit.

- [ ] **Step 2: Document operation and status**

Add a runbook section: STUDIO_CONTRACTOR_NAME, STUDIO_CONTRACTOR_CPF and STUDIO_CONTRACTOR_ADDRESS are Vercel Secrets and never NEXT_PUBLIC_; migrate the intended environment; confirm private bucket/RLS; issue/delete disposable contract; obtain Brazilian legal review before commercial use.

Append the decision: emitted PDF snapshot is historical truth; signed links last 60 seconds; portal access is intentionally out of scope. After Task 4 and Task 6 pass, change only SCL-310 to DONE, check its evidenced criteria and record dated commands without PII, secrets, signed URLs or object paths.

- [ ] **Step 3: Verify documentation**

Run: rg -n "Versão: 1.1|SCL-550|SCL-700|SCL-720|STUDIO_CONTRACTOR_|60 segundos" docs/PRD.md docs/TASKS.md docs/CHECKLIST-MVP.md docs/runbooks/supabase-setup.md docs/DECISIONS.md

Expected: revised coverage and protected operation are present; no personal data is tracked.

### Task 6: Run final evidence gate and close SCL-310

**Files:**
- Modify: docs/TASKS.md
- Test: all project gates

**Interfaces:**
- Consumes: Tasks 1–5 and successful live proof.
- Produces: truthful SCL-310 DONE record and clean branch.

- [ ] **Step 1: Run focused regressions**

Run: npx vitest run tests/domain/contracts-queries.test.ts tests/domain/contracts-schema.test.ts tests/domain/contracts-snapshot.test.ts tests/domain/contracts-service.test.ts tests/domain/contracts-pdf.test.tsx tests/app/contracts-download-route.test.ts tests/app/contract-issue-page.test.tsx tests/app/contract-issue-panel.test.tsx tests/components/contracts-list.test.tsx tests/components/client-form.test.tsx --reporter=verbose --maxWorkers=1

Expected: PASS.

- [ ] **Step 2: Run fresh project gates**

~~~powershell
npm run predb:migrate
npm run test
npm run lint
npm run typecheck
npm run check:admin-auth
npm run build
git diff --check
~~~

Expected: every command exits 0. Record any historical warning separately; do not close SCL-310 with a new failure.

- [ ] **Step 3: Commit baseline and status after evidence**

~~~powershell
git add -- docs/PRD.md docs/TASKS.md docs/CHECKLIST-MVP.md docs/runbooks/supabase-setup.md docs/DECISIONS.md
git commit -m "docs: synchronize revised MVP baseline"
git status --short --branch
~~~

Expected: clean branch and SCL-310 DONE only when all recorded evidence exists.

## Self-review

The plan maps baseline update to Task 5, UI/history to Tasks 1–3, RLS/Storage proof to Task 4 and final status/gates to Task 6. ContractIssueContext.client stays server-only; ContractsList never accepts pdfStoragePath; issueContractAction preserves its Zod input. No task contains a placeholder or unspecified behavior.
