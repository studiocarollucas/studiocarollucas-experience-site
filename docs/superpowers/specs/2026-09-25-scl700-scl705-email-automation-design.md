# Automações de e-mail: outbox, Resend, templates, delivery log e retry (SCL-700 + SCL-705)

## Objetivo

Criar a fundação confiável para toda comunicação automática por e-mail do Stúdio Carol Lucas: um evento persistido e idempotente gravado na mesma transação da ação de negócio, entregas rastreáveis por destinatário, envio encapsulado pelo Resend, templates versionados em pt-BR e um processamento periódico com retry limitado, observável e seguro para reprocessamento manual.

## Escopo

- Tabelas `automation_events` (AutomationEvent) e `notification_deliveries` (NotificationDelivery), relação 1:N conforme PRD §8.
- `enqueueAutomationEvent(input, tx)` grava evento + entregas dentro da transação do chamador; repetição com a mesma chave não duplica nada.
- Chave idempotente de entrega por evento/template/destinatário (constraint única), com o destinatário normalizado.
- Estados de entrega: `pending`, `sending`, `retry`, `sent`, `failed`, `cancelled`, com `attempt_count`, `max_attempts`, `next_attempt_at`, `locked_until`, `last_error` (sanitizado), `provider`, `provider_message_id` e `sent_at`.
- Provider de e-mail atrás de uma interface (`EmailProvider`): Resend via REST (`fetch`, sem SDK novo) com `Idempotency-Key`; provider de log (no-op) para dev/test/preview.
- Templates versionados como código TypeScript (HTML + texto, sem React), registrados por `key` + `version`; a entrega fixa a versão no momento do enfileiramento. Um template de exemplo, `boas-vindas` v1, genérico.
- Processador `processDueDeliveries` com claim concorrente (`FOR UPDATE SKIP LOCKED` + lease), backoff exponencial limitado e classificação de erros transitórios × permanentes.
- Route Handler protegido `/api/cron/email-deliveries` (GET/POST), autorizado por `Authorization: Bearer <CRON_SECRET>` comparado em tempo constante.
- Reprocessamento manual seguro: funções de domínio `requeueFailedDelivery` / `cancelDelivery` com auditoria, e SQL equivalente no runbook `docs/runbooks/email-automation.md`.
- Variáveis novas documentadas em `.env.example`.

## Fora de escopo

- Disparos de negócio (SCL-701 boas-vindas, SCL-702 D-7/D-1, SCL-703 Reveal, SCL-704 review). Nenhum fluxo existente passa a enfileirar e-mails nesta entrega.
- Tela de Admin para o delivery log: o reprocessamento manual acontece pelo runbook; as funções de domínio ficam prontas para uma futura action `defineAdminAction`.
- Webhooks do Resend (bounce/complaint/opened), preferências de notificação e descadastro.
- Configuração de `vercel.json`/cron no repositório: o agendamento é operacional e documentado no runbook (o plano Hobby da Vercel só permite cron diário).

## Arquitetura

```text
ação de negócio (tx) ──► enqueueAutomationEvent(tx)
                           ├─ automation_events (idempotency_key única)
                           └─ notification_deliveries (event_id, template_key, recipient únicos; status pending)

cron ──► /api/cron/email-deliveries (Bearer CRON_SECRET)
           └─ processDueDeliveries(store, provider)
                ├─ failExhaustedLeases        (sending + lease vencida + tentativas esgotadas → failed)
                ├─ claimDue (tx, SKIP LOCKED) (pending/retry vencidas ou sending com lease vencida → sending, attempt+1)
                ├─ renderEmailTemplate(key, version, data)
                ├─ provider.send(..., idempotencyKey = notification-delivery/<id>)
                └─ markSent | markRetry(next_attempt_at = backoff) | markFailed
```

### Evento e entregas

- `automation_events`: `event_type` (ex.: `shoot.confirmed`), `entity_type`/`entity_id`, `idempotency_key` única escolhida pelo chamador (ex.: `shoot.confirmed:<shootId>`), `payload` jsonb apenas com referências não sensíveis, `occurred_at`.
- Reenfileirar com a mesma chave retorna o evento existente sem criar entregas; se a chave for reutilizada para outro tipo/entidade, a operação falha em vez de mascarar o erro.
- `notification_deliveries.template_data` guarda somente as variáveis do template (ex.: primeiro nome e link do portal). O e-mail do destinatário é necessário para o envio e fica apenas na coluna `recipient`.

### Provider

- `EmailProvider.send(message, { idempotencyKey })` retorna `{ provider, messageId }` ou lança `EmailProviderError` com `retryable` e `status`.
- Resend: `POST https://api.resend.com/emails`, `Authorization: Bearer RESEND_API_KEY`, `Idempotency-Key`, timeout de 10 s. `408`, `409`, `429`, `5xx` e erros de rede são transitórios; demais `4xx` são permanentes. A chave idempotente é estável por entrega, então um retry após resposta perdida não gera segundo e-mail (janela de 24 h do Resend).
- `resolveEmailDelivery(env)`: só usa o Resend com `EMAIL_DELIVERY_ENABLED=true` + `RESEND_API_KEY` + `EMAIL_FROM`. Sem o flag, usa o provider de log, que registra apenas IDs e marca a entrega como `sent` com `provider = 'log'`. Em `VERCEL_ENV=production`, o flag desligado é erro de configuração (503) para nunca "entregar" silenciosamente pelo provider de log em produção.

### Templates

- `defineEmailTemplate({ key, version, description, schema, render })` valida os dados com Zod e escapa toda interpolação HTML.
- Registro imutável por versão: uma alteração de texto cria `v2`; entregas pendentes continuam renderizando a versão fixada. O enfileiramento sempre fixa a versão mais recente.

### Retry e concorrência

- Backoff: `min(6 h, 5 min × 2^(tentativa − 1))`; `max_attempts` padrão 5 (5, 10, 20, 40 min e falha definitiva).
- Claim em transação curta com `SELECT … FOR UPDATE SKIP LOCKED` e `UPDATE` para `sending` com `locked_until = agora + 5 min`; execuções simultâneas do cron nunca pegam a mesma linha.
- Toda marcação final é condicionada a `status = 'sending'` e ao `attempt_count` reivindicado; se a lease venceu e outra execução reassumiu a linha, o resultado antigo é descartado e registrado em log.
- Linhas presas em `sending` (processo interrompido) voltam a ser elegíveis após a lease; se já esgotaram as tentativas, viram `failed`.

## Segurança, privacidade e observabilidade

- Tabelas server-only: RLS habilitada, `REVOKE ALL` de `anon`/`authenticated` e nenhum grant ou policy; enums sem `USAGE` para `public`/`anon`/`authenticated`. A aplicação acessa via Drizzle (`DATABASE_URL`).
- Logs estruturados (`lib/observability/logger.ts`) contêm apenas `deliveryId`, `eventId`, `templateKey`, `templateVersion`, tentativa, provider e status HTTP — nunca destinatário, assunto ou dados do template.
- `last_error` é sanitizado: e-mails, chaves `re_…` e tokens Bearer removidos, espaço normalizado, 500 caracteres no máximo.
- Falhas definitivas e erros inesperados do cron vão ao Sentry (`captureException` com tags), que já é inerte sem DSN.
- `CRON_SECRET` com no mínimo 32 caracteres; ausente ou curto → 503; divergente → 401. Comparação por `timingSafeEqual` sobre digests SHA-256.

## Critérios de aceite

1. Evento persistido e idempotente na mesma transação da ação (SCL-700).
2. Resend encapsulado atrás de `EmailProvider`, testável com fake (SCL-700).
3. Templates versionados em pt-BR com versão fixada por entrega (SCL-700).
4. Nenhuma PII desnecessária em logs (SCL-700).
5. Status de entrega modelado (SCL-700).
6. Dev/test/preview não enviam e-mail real sem `EMAIL_DELIVERY_ENABLED=true` (SCL-700).
7. Chave idempotente por evento/template/destinatário (SCL-705).
8. Estados pending/sending/retry/sent/failed/cancelled (SCL-705).
9. Retry com limite e backoff exponencial (SCL-705).
10. Erros observáveis em Sentry e log estruturado (SCL-705).
11. Reprocessamento manual seguro documentado no runbook (SCL-705).
