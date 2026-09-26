# Review + Referral e tracking de indicação (SCL-720 + SCL-722)

## Objetivo

Dar ao Studio OS as duas entidades de crescimento do PRD §7.10 — **Review** (pedido e conclusão de avaliação) e **Referral** (quem indicou quem) — com integridade garantida no banco, serviços de domínio validados e auditados, e o primeiro uso real da indicação: um Lead registra que veio por indicação, a conversão Lead → Cliente preserva a relação e o Admin mede indicações informadas e convertidas.

SCL-704 (pedido automático pós-entrega) e SCL-721 (CTA de avaliação/Google no portal) consomem o schema/serviço de Review, mas ficam fora desta entrega.

## Escopo

- Migration `0051_reviews_referrals` (+ snapshot + journal): enum `review_status`, tabelas `reviews` e `referrals`, triggers de integridade, backfill e congelamento de `clients.referrer_client_id`, RLS/grants.
- `domain/reviews/{schema,service}.ts`: pedir, concluir, cancelar e listar reviews.
- `domain/referrals/{schema,errors,service,lead-conversion,queries}.ts`: registrar/remover indicação do Lead, registrar indicação entre clientes, vincular a indicação na conversão, leituras para Admin/dashboard.
- `convertWonLead` chama o vínculo da indicação dentro da mesma transação.
- Admin: seção **Indicação** na ficha do Lead (escolher/remover a cliente indicadora), tile **Indicações** no dashboard e linhas de indicação na ficha da cliente.

## Fora de escopo

- Automação/CTA de review (SCL-704/SCL-721) e tela de reviews no Admin: o serviço fica pronto (`requestReview` é idempotente por Shoot + destino para SCL-704 não disparar duas vezes).
- Receita por indicação e oportunidades de recompra (SCL-723).
- Formulário de cadastro de Lead no Admin: não existe hoje (Leads nascem do quiz); a indicação é registrada na ficha do Lead.
- Remoção física de `clients.referrer_client_id` (migration futura, depois do backfill conferido em produção).

## Modelo

### `reviews`

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid not null → `clients` (`on delete cascade`) | a cliente avaliadora |
| `shoot_id` | uuid null → `shoots` (`on delete set null`) | quando o pedido se refere a um ensaio |
| `status` | `review_status` (`solicitado`, `concluido`, `cancelado`), default `solicitado` | |
| `source` | text, check `manual` / `automacao` / `portal` | como o pedido foi registrado |
| `target` | text, check `google` / `instagram` / `interno` / `outro` | destino externo da avaliação |
| `target_url` | text null | link do CTA ou da avaliação publicada |
| `requested_at`, `completed_at` | timestamptz null | |
| `created_at`, `updated_at` | timestamptz not null default now() | |

Checks: `solicitado` exige `requested_at`; `concluido` ⇔ `completed_at` preenchido; `completed_at >= requested_at` quando ambos existem.
Índices: `reviews_client_idx (client_id)`; único parcial `reviews_one_active_per_shoot_target_idx (shoot_id, target) where shoot_id is not null and status <> 'cancelado'` — no máximo um pedido ativo ou concluído por ensaio e destino.
Trigger `reviews_shoot_matches_client`: `shoot_id`, quando presente, pertence a `client_id`.

Transições (serviço): `solicitado → concluido`, `solicitado → cancelado`. `concluido` e `cancelado` são terminais; repetir a conclusão é no-op sem auditoria.

### `referrals`

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid PK | |
| `referrer_client_id` | uuid not null → `clients` | quem indicou |
| `referred_client_id` | uuid null → `clients`, **único** | a cliente indicada, quando já é cliente |
| `lead_id` | uuid null → `leads` (`on delete cascade`), **único** | o Lead indicado, quando a indicação nasceu no comercial |
| `source` | text, check `lead` / `cliente` / `legado` | onde foi registrada |
| `created_at` | timestamptz not null default now() | indicação informada |
| `converted_at` | timestamptz null | indicação convertida |

Checks:

- `referrals_has_referred`: `referred_client_id` ou `lead_id` presente;
- `referrals_lead_source_has_lead`: `source = 'lead'` exige `lead_id`;
- `referrals_not_self`: `referrer_client_id <> referred_client_id`;
- `referrals_converted_consistent`: `(referred_client_id is null) = (converted_at is null)` — **indicação convertida é exatamente a que já aponta para uma Cliente**. Assim "informada" × "convertida" (PRD §7.10) nunca diverge de um flag separado.

Unicidade: uma pessoa é indicada por no máximo uma cliente (`referred_client_id` único) e um Lead tem no máximo uma indicação (`lead_id` único).

Trigger `referrals_guard_graph` (antes de insert/update de `referrer_client_id`/`referred_client_id`): com a unicidade acima o grafo de indicações entre clientes tem no máximo um "pai" por cliente, então basta subir a cadeia a partir da indicadora; se chegar à indicada, a escrita é rejeitada com a constraint `referrals_no_cycle` (cobre A→B + B→A e ciclos maiores). Um `pg_advisory_xact_lock` único serializa as escritas que ligam duas clientes, para que duas transações concorrentes (A→B e B→A) não passem ambas pela verificação.

### Papel de `clients.referrer_client_id` (legado)

- `referrals` passa a ser a **única fonte de verdade** de indicação.
- A migration copia cada `clients.referrer_client_id` preenchido para `referrals` (`source = 'legado'`, `referred_client_id = clients.id`, `created_at = converted_at = clients.created_at`), ignorando auto-indicação e pares recíprocos (dado inconsistente, que continua visível na coluna para revisão manual).
- A coluna fica **congelada**: trigger `clients_referrer_client_id_frozen` rejeita qualquer insert com valor ou update que o altere. O app deixa de aceitá-la (`referrerClientId` sai de `createClientSchema`) e nada a lê.
- A coluna não é removida agora (sem migration destrutiva); uma migration futura a remove depois de conferir o backfill em produção.

## Serviços

### Reviews (`domain/reviews/service.ts`)

- `requestReview(input, actorUserId)` → `{ review, created }`: valida cliente e posse do Shoot, insere `solicitado` com `requested_at = now()` usando `ON CONFLICT DO NOTHING`; em conflito devolve o review ativo/concluído existente (`created: false`, sem auditoria). Audita `review.requested`.
- `completeReview(input, actorUserId)`: trava a linha, conclui `solicitado` (data padrão agora, não pode ser futura nem anterior ao pedido), opcionalmente guarda `target_url`. Audita `review.completed`.
- `cancelReview(input, actorUserId)`: `solicitado → cancelado`, audita `review.cancelled`.
- `listClientReviews(clientId)`.

### Referrals (`domain/referrals/*`)

- `setLeadReferral({ leadId, referrerClientId, actorUserId })`: trava a linha do Lead (mesma trava da conversão), valida a indicadora, rejeita auto-indicação (indicadora = cliente do Lead ou cliente convertida), cria ou troca a indicadora de uma indicação ainda não convertida. Se o Lead já foi convertido, a indicação nasce convertida (`referred_client_id` = cliente da conversão, `converted_at` = data da conversão). Audita `lead.referral_recorded` / `lead.referral_updated` na entidade do Lead (aparece no histórico da ficha).
- `removeLeadReferral({ leadId, actorUserId })`: remove somente indicação não convertida; audita `lead.referral_removed`.
- `recordClientReferral({ referrerClientId, referredClientId, actorUserId })`: indicação entre duas clientes já existentes (`source = 'cliente'`, convertida na criação); audita `client.referral_recorded`.
- `linkLeadReferralOnConversion(tx, { leadId, clientId, convertedAt, actorUserId })`: chamado por `convertWonLead` depois de gravar a conversão e antes da auditoria `lead.converted`, na mesma transação. Trava a indicação do Lead; sem indicação é no-op. Rejeita (e desfaz a conversão inteira) se a cliente convertida for a própria indicadora, já estiver indicada por outra indicação ou se o vínculo formar ciclo — mensagens acionáveis pedem para remover a indicação do Lead antes de converter. Audita `lead.referral_converted`.
- Erros de constraint/trigger (`referrals_no_cycle`, `referrals_not_self`, `referrals_referred_client_id_unique`, `referrals_lead_id_unique`) viram `ReferralError` com mensagem em português; as actions do Admin transformam `ReferralError` em `ActionableAdminActionError`.

### Medição

- `getReferralMetrics({ from, to })` → `{ informed, converted }`: indicações criadas no período e indicações convertidas no período (`converted_at`), contadas no banco. Mesmo intervalo UTC do dashboard (ver DECISIONS, 2026-09-06).
- `getClientReferralSummary(clientId)` → `{ referredBy, made, converted }` para a ficha da cliente.
- `getLeadReferralPanel(leadId)` → indicação atual (com nome da indicadora) e opções de clientes para o formulário.

## Admin

- Ficha do Lead: seção **Indicação** com a indicadora atual e o estado (informada/convertida), `select` de clientes + "Registrar indicação" e "Remover indicação" (apenas enquanto não convertida). Actions `setLeadReferralAction` / `removeLeadReferralAction` via `defineAdminAction` (role `staff`), `actorUserId` sempre da sessão.
- `convertLeadAction` passa a mapear `ReferralError` para mensagem acionável.
- Dashboard: tile **Indicações** (informadas no período, com "N convertidas").
- Ficha da cliente: linhas "Indicada por" e "Indicações feitas" (total · convertidas).

## Segurança e RLS

- `reviews` e `referrals`: RLS ligada, `REVOKE ALL` de `anon`/`authenticated`, `GRANT select/insert/update/delete` para `authenticated` com policies `*_staff_access` (`public.is_staff_or_admin()` em `using` e `with check`) — mesmo desenho de `galleries`/`lead_conversions` (0036/0037). Nada para `anon`; a cliente não lê essas tabelas pela Data API.
- `review_status`: `REVOKE ALL` de `public`/`anon`/`authenticated`, `USAGE` para `authenticated` e `service_role`.
- Escritas do app passam pelos serviços (Drizzle, conexão do servidor) com auditoria na mesma transação.

## Critérios de aceite

SCL-720:

1. Review vincula Client/Shoot quando aplicável, com `requested_at`/`completed_at`/`source`/destino externo.
2. Referral registra referrer e referred Client/Lead quando conhecido.
3. Conversão de indicação mensurável (`converted_at` + `getReferralMetrics`).
4. RLS/acesso admin definidos (staff/admin via policies; nada para `anon`).
5. `clients.referrer_client_id` não duplicado: backfill + congelamento, decisão em DECISIONS.

SCL-722:

1. Lead pode apontar origem por indicação (ficha do Lead, validado no servidor).
2. Conversão preserva a relação (mesma transação de `convertWonLead`).
3. Dashboard/CRM medem indicações convertidas.
4. Sem loops/relações inconsistentes (checks, unicidade, trigger de ciclo, validação no serviço).

## Verificação

- `tests/db/reviews-referrals-migration.test.ts`: SQL, checks, triggers, backfill, RLS/grants, snapshot encadeado e journal (entrada localizada pelo tag).
- Testes de domínio com Drizzle mockado: validação, idempotência, auto-indicação, conflitos, mapeamento de erros do banco, auditoria na transação, vínculo na conversão.
- Testes das actions e da ficha do Lead (RBAC, ator da sessão, mensagens acionáveis).
- `tests/domain/reviews-referrals.integration.test.ts` opcional (`RUN_LIVE_DB_TESTS=true`) lendo catálogo: constraints, trigger e RLS.
