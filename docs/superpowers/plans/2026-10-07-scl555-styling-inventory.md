# SCL-555 — vínculo de inspiração com acervo

> Execução nesta sessão, autorizada pelo usuário em 07/10/2026. Desenho de referência: `docs/superpowers/specs/2026-09-26-scl554-scl555-portal-inventory-design.md`, seção SCL-555. Usar test-driven-development e requesting-code-review; tarefas dependentes executadas em sequência.

**Goal:** A equipe vincula/desvincula uma referência de styling a uma peça com preferência ou reserva confirmada no mesmo ensaio; a cliente vê o nome da peça e seu estado atual.

**Architecture:** Coluna nullable `styling_references.inventory_item_id`, FK com `ON DELETE SET NULL`, índice composto. Escrita por Server Action com `defineAdminAction`, validação de domínio e auditoria na transação. Leitura complementa somente referências já autorizadas por RLS, com projeção mínima e omissão de reservas canceladas.

**Tech Stack:** Next 16.3.4, React 19, Drizzle/Postgres, Supabase RLS, Zod, Vitest.

## Restrições

- Guias locais do Next: server-actions.md e data-security.md lidos antes da implementação.
- Não alterar migrations integradas; gerar `0053` após `0052`, com journal/snapshot coerentes.
- Cliente não pode gravar o vínculo por INSERT nem UPDATE direto. Acrescentar proteção SQL ao campo novo sem ampliar privilégios existentes.
- A leitura não envia dados internos, preço, contatos ou reservas de outro ensaio.
- Vínculo não cria nem altera reserva. Referência livre continua funcionando; cancelamento da reserva remove a indicação na leitura.
- Não aplicar migrations nem enviar e-mails para produção nesta execução. Verificar configuração apenas por leitura.

## Task 1 — fundação e domínio

Files: `db/schema/styling-references.ts`, `db/migrations/0053_*`, `domain/styling/inventory-links.ts`, `tests/domain/styling-inventory-links.test.ts`, `tests/db/styling-inventory-links-migration.test.ts`.

- [x] Escrever testes para vínculo válido pending/confirmed, outro ensaio, cancelamento, ator cliente, desvínculo e idempotência/auditoria.
- [x] Rodar testes e confirmar falha pela ausência da implementação.
- [x] Implementar `linkStylingReferenceToInventoryItem({ shootId, referenceId, inventoryItemId: string | null }, actorUserId): Promise<void>`; validar ator, travar reserva/referência, exigir purpose=shoot e ensaio correspondente, atualizar/auditar na mesma transação.
- [x] Implementar `readStylingInventoryLinks(shootId, references): Promise<PortalReference[]>`; consultar só os IDs das referências RLS já autorizadas e o mesmo ensaio, projetar `inventoryLink: { inventoryItemId, itemName, reservationState: 'pending' | 'confirmed' } | null` sem dados internos.
- [x] Gerar migration e acrescentar trigger impedindo cliente de inserir campo não nulo e política/privilégio de UPDATE restrito a staff.
- [x] Rodar testes direcionados e typecheck.

## Task 2 — Admin e portal

Files: `app/admin/(protected)/agenda/[id]/styling-actions.ts`, `components/admin/styling-inventory-link.tsx`, `components/admin/styling-manager.tsx`, `components/client/styling-board.tsx`, `domain/portal/types.ts`, `app/admin/(protected)/agenda/[id]/page.tsx`, `app/(client)/minha-experiencia/styling/page.tsx`, testes correspondentes.

- [x] Escrever testes de formulário: salvar/remover vínculo, erro seguro e opção apenas para peças do ensaio; indicador da cliente para preferência e confirmação.
- [x] Confirmar RED antes de implementar a UI.
- [x] Action validada por Zod/defineAdminAction, `role: 'staff'`, revalidando ficha do ensaio e styling do portal.
- [x] Select por referência no Admin, com opção "Sem vínculo" e peças pending/confirmed do detalhe do ensaio; manter uploads/exclusão atuais.
- [x] Enriquecer leitura após autenticação/RLS, renderizar "Inspiração ligada a" e estado da reserva; leitura complementar indisponível preserva moodboard com aviso neutro.
- [x] Rodar testes direcionados, suíte local sem integração live, lint, typecheck, build e check:admin-auth.
- [x] Revisar diff com reviewer independente, corrigir problemas e registrar resultado no TASKS/CHECKLIST.

## Retomada / validação

- [x] Sincronizar main por fast-forward (`9a52a16`, 84 commits).
- [x] Check de autorização do Admin e journal de migrations aprovado.
- [x] Restaurar dependências locais incompletas e confirmar baseline.
- [x] Auditar, por leitura, migrations 0049–0052 e flags locais de configuração.
- [x] Reconciliar checklist com código integrado e separar implantação pendente de desenvolvimento concluído.

## Evidências de validação

- Domínio/migration: RED pela ausência da implementação; GREEN com 22 testes direcionados, código 0, incluindo bloqueio de ator cliente, escopo da reserva, desvínculo e idempotência/auditoria.
- UI/actions: RED confirmou indicador, formulário e leitura complementada ausentes. A suíte completa validou formulário, erros seguros, isolamento da sessão/ensaio e fallback do moodboard.
- Suíte sem integrações live: `npm test -- tests --exclude '**/*.integration.test.ts' --pool=vmForks --maxWorkers=2` — 1.362 testes aprovados, 9 ignorados, código 0. Resultado JSON sem falhas. Modo vmThreads teve queda nativa ao encerrar nesta máquina; não alterada a configuração do projeto.
- `npm run lint`: código 0, 11 avisos preexistentes, nenhum erro; ESLint direcionado de domínio e correção SEO: código 0.
- `npm run typecheck`, `node scripts/check-admin-auth.mjs`, journal e `git diff --check`: aprovados.
- Correção de URL vazia de SEO: teste novo reproduziu 2 falhas em 4 casos antes da alteração; rotas e testes passaram na suíte completa após fallback do domínio padrão em layout/robots/sitemap.
- Revisão independente: sem findings acionáveis na feature, migration ou correção SEO. SQL revisado por contrato/estaticamente; RLS live pendente do banco identificado e atualizado.
- Build: `npm run build` na cópia `D:\CodexCaches\studio-carollucas-runtime-20261007` — código 0, compilação Turbopack, TypeScript e geração de páginas aprovadas. Código copiado do checkout, dependências exatas do lockfile no mesmo disco. Tentativas no checkout original encontraram limitações de symlink/caminhos entre discos; o runbook registra a execução local suportada.
- Auditoria de lançamento: somente leitura; migrations `0049`–`0053` pendentes no banco configurado, flags locais ausentes e envio desabilitado. Nenhuma escrita live, e-mail real, push ou publicação nesta etapa.
