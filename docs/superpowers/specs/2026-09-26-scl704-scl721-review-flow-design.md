# Pedido de avaliação pós-entrega e CTA do Google no portal (SCL-704 + SCL-721)

## Objetivo

Fechar o ciclo de pós-venda do PRD §7.9/§7.10: depois que o ensaio foi **entregue** e o Reveal está publicado, a cliente recebe **um** pedido de avaliação por e-mail e encontra em Minha Experiência um convite discreto para avaliar o estúdio no Google Business Profile. Pedido, abertura do link e conclusão ficam rastreáveis no `Review` (SCL-720) e na auditoria, e a equipe marca a avaliação como concluída ou cancelada no Admin. Nada disso bloqueia o portal, a galeria ou os downloads.

## Escopo

- SCL-704: passo agendador `scheduleReviewRequests` (rota protegida irmã `/api/cron/review-requests`) que, para cada ensaio elegível, cria o `Review` (`source = 'automacao'`, `target = 'google'`) com `requestReview` **e** enfileira o evento `review.requested` com o template `pedido-avaliacao` v1 **na mesma transação**; guarda de envio que cancela o e-mail se o Review foi concluído/cancelado ou se o link deixou de estar configurado.
- SCL-721: card de avaliação em Minha Experiência (início e galeria), dispensável, com link externo configurável; clique registra "cliente abriu o link" (`review.link_opened` na auditoria, criando o Review com `source = 'portal'` se ainda não existir); seção **Avaliação** na ficha do ensaio no Admin para marcar concluída/cancelada (`defineAdminAction`, auditado).
- `.env.example` e runbook de automações atualizados.

## Fora de escopo

- Migrations: nenhuma. `reviews` (0051) e o outbox (0049) bastam; a dispensa do card fica em cookie, a abertura do link na `audit_log`.
- Verificar automaticamente se a avaliação foi publicada no Google (não há API confiável para isso); a conclusão é marcada pela equipe.
- Outros destinos (Instagram etc.), incentivos/brindes por avaliação e reenvio do pedido.
- Criar no Admin uma avaliação "espontânea" sem pedido prévio (a cliente que avaliou por conta própria pode ser registrada quando houver tela de reviews).

## Regra de disparo (definida por esta task)

Um ensaio está **pronto para o pedido de avaliação** quando, no dia civil do estúdio (`America/Manaus`):

1. o job de produção está `entregue` e tem `delivery_at` (data real de entrega; `changeProductionJobStatus` a preenche ao entregar e o Admin pode ajustá-la);
2. a galeria do ensaio está `published` (a cliente já tem o Reveal);
3. o ensaio não está `cancelado`;
4. passaram pelo menos **3 dias** desde `delivery_at` (`REVIEW_REQUEST_DELAY_DAYS`), tempo para a cliente ver as fotos antes de ser convidada.

Só para o **e-mail** vale também um teto: até **30 dias** depois da entrega (`REVIEW_REQUEST_MAX_DAYS`). Isso impede que o primeiro deploy (ou um agendador parado por semanas) dispare pedidos para entregas antigas; um ensaio fora da janela nunca recebe e-mail automático. O card do portal não tem teto (é discreto e dispensável).

Motivo: `production_jobs.status = 'entregue'` é o sinal de "Entrega concluída" do PRD §7.6/§7.9 ("`Entregue` deve habilitar ações de pós-venda, review e indicação") e é o único ponto com data real de entrega; exigir a galeria publicada garante o "não pedir review antes da entrega/Reveal" do §7.10. O status do ensaio só reflete a entrega quando a máquina de estados permite, então não é usado como gatilho — apenas `cancelado` exclui.

Limite conhecido: `changeProductionJobStatus` grava `delivery_at` com a data UTC do momento da entrega (`toISOString`), então uma entrega marcada depois das 20:00 de Manaus conta a partir do dia seguinte — no máximo um dia a mais de espera, nunca um pedido antes do prazo.

## Decisões

### Link de avaliação configurável

- `STUDIO_GOOGLE_REVIEW_URL` (server-only, sem `NEXT_PUBLIC_`): link "Escrever uma avaliação" do Google Business Profile, `https://` obrigatório. O e-mail e o card são renderizados no servidor, então o link não precisa estar no bundle do browser.
- Ausente ou inválido: o agendador não cria Review nem e-mail e registra **um** aviso por execução (`review requests skipped: STUDIO_GOOGLE_REVIEW_URL missing or invalid`, contador `configured: false` na resposta); o card do portal simplesmente não aparece; a guarda cancela entregas ainda na fila.
- O link usado fica gravado em `reviews.target_url` e fixado nos dados da entrega (a versão do template também é fixada, como nos demais fluxos).

### SCL-704 — Pedido por e-mail

- **Idempotência dupla:** (1) o agendador só seleciona ensaios **sem nenhum Review para o Google** (qualquer status — um pedido cancelado pela equipe significa "não pedir"); `requestReview` é idempotente pelo índice único parcial `reviews_one_active_per_shoot_target_idx` e, em corrida, devolve `created: false` e o e-mail não é enfileirado; (2) o evento `review.requested` usa a chave `review.requested:<shootId>:google`, então o outbox nunca aceita um segundo pedido para o mesmo ensaio e destino.
- **Mesma transação:** `requestReviewInTransaction(tx, …)` (extraída de `requestReview`, que continua abrindo a própria transação) + `enqueueAutomationEvent(input, tx)`. Falha em qualquer um desfaz os dois: nunca existe Review `solicitado` pela automação sem o e-mail correspondente, nem e-mail sem Review.
- **Evento:** `review.requested`, entidade `review` (id do Review), payload só com IDs (`reviewId`, `shootId`, `target`).
- **Horário:** `next_attempt_at` às 10:00 de Manaus do dia (ou agora, se já passou).
- **Destinatário e dados:** `clients.email` normalizado; sem e-mail válido, nada é criado (o card do portal continua disponível). Template recebe só primeiro nome e o link de avaliação.
- **Template `pedido-avaliacao` v1 (pt-BR):** agradece, convida sem pressão ("se fizer sentido para você"), explica que leva um minuto e aponta para o Google. Sem incentivos, sem pedir nota específica, sem filtro de satisfação (todas as clientes elegíveis recebem o mesmo convite — política do Google contra *review gating*).
- **Guarda no envio:** o cron de entregas reconsulta o Review. Envia só se ele existe, está `solicitado` e o link continua configurado; senão `cancelled` com motivo (`avaliação já concluída`, `pedido de avaliação cancelado`, `avaliação inexistente`, `link de avaliação não configurado`).
- **Status no Review:** `solicitado` com `requested_at` (momento do enfileiramento), `source = 'automacao'`, `target = 'google'`, `target_url`; auditoria `review.requested` com ator nulo (sistema). O envio em si fica no delivery log (`notification_deliveries`).
- **Agendamento:** `/api/cron/review-requests` (GET/POST, `Authorization: Bearer <CRON_SECRET>`), diário é suficiente (ex.: `0 12 * * *` UTC = 08:00 em Manaus); idempotente. Falha de um ensaio vai ao log (só IDs) e ao Sentry e não impede os demais.

### SCL-721 — CTA no portal e rastreamento

- **Quando aparece:** mesma regra de disparo (sem o teto de 30 dias), para o ensaio entregue mais recente da cliente da sessão, se o link estiver configurado e **não** houver Review do Google `concluido` ou `cancelado` para esse ensaio. Aparece no início de Minha Experiência e no fim da página da galeria.
- **Sem dark patterns / sem bloqueio:** card estático no fluxo da página (não modal, não sobreposto, sem contagem regressiva, sem repetição insistente), com o botão "Avaliar no Google" (abre em nova aba, `rel="noopener noreferrer"`) e "Agora não". Galeria, favoritos e downloads não dependem do card. Se a leitura do card falhar, ele é omitido e o erro vai para o log — a página segue.
- **Dispensa:** "Agora não" grava o cookie `scl_review_prompt_dismissed` (httpOnly, `SameSite=Lax`, `secure` em produção, caminho `/minha-experiencia`, 180 dias) com o id do ensaio; o card não volta para esse ensaio naquele navegador. Clicar em "Avaliar no Google" também grava o cookie, para não insistir depois. Um cookie de ensaio antigo não esconde o card de um ensaio novo.
- **"Cliente abriu o link":** o clique chama a Server Action `openReviewLinkAction` (sem payload: cliente e ensaio vêm da sessão e são recalculados no servidor), que, numa transação, obtém o Review do Google do ensaio via `requestReviewInTransaction` (cria com `source = 'portal'` se ainda não houver — por exemplo cliente sem e-mail ou antes do agendador) e grava `review.link_opened` na auditoria com o usuário da sessão como ator. Um Review já concluído/cancelado não recebe o registro. Como o Review passa a existir, o agendador nunca manda e-mail depois de um clique no portal.
- **Admin:** seção **Avaliação** na ficha do ensaio (`/admin/agenda/[id]`): status do pedido do Google (sem pedido / solicitado / concluído / cancelado), origem, data do pedido, último "cliente abriu o link" e conclusão. Com status `solicitado`, botões **Marcar como concluída** (`completeReview`) e **Cancelar pedido** (`cancelReview`), via `defineAdminAction` (role `staff`, ator da sessão, auditoria `review.completed`/`review.cancelled` na transação do serviço; `ReviewError` vira mensagem acionável).

## Arquitetura

```text
cron ──► /api/cron/review-requests ──► scheduleReviewRequests()
            readGoogleReviewUrl() ausente → log único, nada é escrito
            select production_jobs entregue + delivery_at na janela [hoje-30, hoje-3]
                   ⋈ shoots (≠ cancelado) ⋈ clients (email) ⋈ galleries (published)
                   ⟕ reviews (google) onde review is null
            planReviewRequests (regra pura, e-mail) →
            por ensaio: tx { requestReviewInTransaction(automacao) → created? enqueueAutomationEvent(review.requested) }

cron ──► /api/cron/email-deliveries ──► guard: review.requested → review solicitado + link configurado?

portal (início/galeria) ──► getPortalReviewPrompt() → readClientReviewPrompt(clientId) + cookie
   "Avaliar no Google" ──► openReviewLinkAction() → recordReviewLinkOpened (tx: Review + audit) + cookie
   "Agora não"         ──► dismissReviewPromptAction() → cookie

admin /agenda/[id] ──► getShootReviewPanel(shootId) → ShootReview
   completeShootReviewAction / cancelShootReviewAction (defineAdminAction) → completeReview / cancelReview
```

Módulos:

- `domain/automation/flows/rules.ts`: constantes e regras puras de SCL-704 (`isReviewRequestDue`, chave, decisão da guarda).
- `domain/automation/flows/review-requests.ts`: seleção, plano e enfileiramento.
- `domain/automation/templates/pedido-avaliacao.v1.ts`.
- `domain/reviews/config.ts` (`readGoogleReviewUrl`), `domain/reviews/service.ts` (`requestReviewInTransaction`), `domain/reviews/portal.ts` (leitura do card e registro do clique), `domain/reviews/portal-server.ts` (sessão + cookie), `domain/reviews/queries.ts` (painel do Admin).
- `app/api/cron/review-requests/route.ts`, `app/(client)/minha-experiencia/avaliacao/actions.ts`, `components/client/review-prompt.tsx`, `app/admin/(protected)/agenda/[id]/review-actions.ts`, `components/admin/shoot-review.tsx`.

## Segurança e privacidade

- Identidade da cliente sempre da sessão (`getPortalRequestContext`); as actions do portal não aceitam ids do browser.
- Logs só com IDs; o e-mail não carrega dados além do primeiro nome e do link público do Google.
- Rota cron fora de `app/admin`; actions do Admin passam por `defineAdminAction` (`check:admin-auth`).
- Nada conecta ao banco no import; env lida em tempo de chamada.

## Critérios de aceite

SCL-704:

1. Só dispara após entrega/Reveal conforme a regra acima (job `entregue` + `delivery_at` + galeria publicada + 3 dias; e-mail até 30 dias).
2. Não dispara novamente se o Review foi concluído (nem se já foi pedido/cancelado): seleção sem Review + índice único + chave do outbox + guarda no envio.
3. CTA configurável para o Google (`STUDIO_GOOGLE_REVIEW_URL`); sem configuração, não envia e registra um aviso.
4. Status registrado no Review (`solicitado`/`automacao`/`google`/`target_url`/`requested_at`, auditado).

SCL-721:

1. CTA aparece no momento pós-entrega correto (mesma regra), para o ensaio da cliente da sessão.
2. Link externo configurável (mesma variável).
3. Pedido/conclusão rastreáveis: Review + `review.link_opened` + conclusão/cancelamento auditados no Admin.
4. Sem dark patterns nem bloqueio: card dispensável, fora de modal, galeria/downloads independentes, falha de leitura não derruba a página.

## Verificação

- Testes puros da regra (janela, galeria, job, cancelado, chave, guarda) e do template.
- Agendador com banco falso: link ausente (sem escrita, aviso único), plano, transação única com Review + evento, `created: false` não enfileira, erro de um ensaio não para os demais.
- Guarda com o Review concluído/cancelado/inexistente e link ausente.
- Rota cron (503/401/200/500).
- Portal: leitura do card (regra, Review concluído, link ausente), cookie de dispensa, actions (sessão, cookie, sem payload), página inicial e galeria com e sem card.
- Admin: actions (RBAC, ator da sessão, `ReviewError` acionável) e seção na ficha do ensaio.
