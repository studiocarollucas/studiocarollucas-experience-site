# Automações de e-mail — outbox, Resend e reprocessamento (SCL-700/SCL-705)

Fluxo: uma ação de negócio grava, **na mesma transação**, um `automation_events` e uma ou mais `notification_deliveries` (`enqueueAutomationEvent(input, tx)`). Um agendador chama `/api/cron/email-deliveries`, que reivindica as entregas vencidas, renderiza o template na versão fixada, envia pelo provider configurado e registra `sent`, `retry` ou `failed`.

Nesta entrega nenhum fluxo de negócio enfileira e-mails ainda; SCL-701–704 fazem isso sobre esta fundação.

## 1. Variáveis de ambiente

| Variável | Onde | Obrigatória | Notas |
| --- | --- | --- | --- |
| `EMAIL_DELIVERY_ENABLED` | Production (e só onde houver envio real) | sim, para envio real | Somente o literal `true` liga o Resend. Qualquer outro valor usa o provider de log. Em `VERCEL_ENV=production`, desligado faz o cron responder **503** sem tocar na fila. |
| `RESEND_API_KEY` | Production | com o flag ligado | Chave com permissão *Sending access*. Server-only. |
| `EMAIL_FROM` | Production | com o flag ligado | Remetente em domínio verificado, ex.: `Stúdio Carol Lucas <ola@studiocarollucas.com.br>`. |
| `EMAIL_REPLY_TO` | Production | não | Ex.: `experiencia@studiocarollucas.com.br`. |
| `CRON_SECRET` | Production e Preview (se houver cron) | sim | ≥ 32 caracteres (`openssl rand -hex 32`). Ausente/curto → 503; divergente → 401. |

Dev, test e Preview **não enviam e-mail real**: sem `EMAIL_DELIVERY_ENABLED=true`, o provider de log apenas registra `email delivery simulated` com a chave idempotente e marca a entrega como `sent` com `provider = 'log'`. Preview nunca deve apontar para o banco de produção (ver `deploy.md`).

## 2. Primeira configuração

1. Aplicar a migration `0049_email_automation_outbox` com `npm run db:migrate` (`DATABASE_URL` do ambiente alvo). As tabelas são server-only: RLS habilitada, nenhum grant para `anon`/`authenticated`.
2. No Resend: verificar o domínio (registros SPF/DKIM na Hostinger) e criar a API key.
3. Na Vercel (Production): `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` (opcional), `CRON_SECRET` e, por último, `EMAIL_DELIVERY_ENABLED=true`. Fazer redeploy.
4. Configurar o agendador (seção 3) e validar com uma chamada manual (seção 4).

## 3. Agendamento

O endpoint aceita `GET` e `POST` com `Authorization: Bearer <CRON_SECRET>` e processa até 20 entregas por chamada (`maxDuration` 60 s). Frequência recomendada: a cada 5 minutos.

- **Vercel Cron (plano Pro):** com `CRON_SECRET` definido no projeto, a Vercel envia o header automaticamente. Adicionar ao `vercel.json`:

  ```json
  { "crons": [{ "path": "/api/cron/email-deliveries", "schedule": "*/5 * * * *" }] }
  ```

  O plano Hobby só permite cron diário e rejeita o deploy com uma frequência maior — por isso o `vercel.json` não está versionado.
- **Agendador externo** (GitHub Actions `schedule`, cron-job.org, etc.): `POST https://studiocarollucas.com.br/api/cron/email-deliveries` com o header `Authorization: Bearer <CRON_SECRET>`, guardando o segredo no cofre da ferramenta.

Execuções simultâneas são seguras: o claim usa `FOR UPDATE SKIP LOCKED`, então cada linha vai para uma única execução.

## 4. Chamada manual e leitura da resposta

```bash
curl -sS -X POST "https://studiocarollucas.com.br/api/cron/email-deliveries" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Resposta (só contadores, sem dados pessoais):

```json
{ "ok": true, "mode": "resend", "staleFailed": 0, "claimed": 3, "sent": 2, "retried": 1, "failed": 0, "lostLease": 0, "errors": 0 }
```

- `mode: "log"` em produção não acontece (503); em outros ambientes indica envio simulado.
- `lostLease > 0`: a lease de 5 min venceu antes do fim e outra execução reassumiu a linha; o resultado antigo foi descartado.
- `errors > 0`: falha ao gravar o resultado (banco). A linha continua `sending` e volta à fila quando a lease vence; a chave idempotente evita e-mail duplicado.

## 5. Estados e retry

| Status | Significado |
| --- | --- |
| `pending` | Enfileirada; elegível quando `next_attempt_at <= agora` (permite agendar D-7/D-1). |
| `sending` | Reivindicada por uma execução até `locked_until`. |
| `retry` | Falha transitória; nova tentativa em `next_attempt_at`. |
| `sent` | Aceita pelo provider (`provider`, `provider_message_id`, `sent_at`). |
| `failed` | Falha permanente (4xx do Resend, template/dados inválidos) ou tentativas esgotadas. |
| `cancelled` | Cancelada antes do envio; nunca é processada. |

- Transitórios: erro de rede/timeout, HTTP 408, 409, 429 e 5xx. Permanentes: demais 4xx, template não registrado, dados inválidos.
- Backoff: 5, 10, 20, 40 min (teto de 6 h); `max_attempts` padrão 5.
- Idempotência: evento único por `idempotency_key`; entrega única por (`event_id`, `template_key`, `recipient`); o Resend recebe `Idempotency-Key: notification-delivery/<id>`, estável entre tentativas (janela de 24 h do Resend).
- `last_error` é sanitizado (sem e-mails, chaves `re_…` ou tokens) e limitado a 500 caracteres.

## 6. Observabilidade

- Logs estruturados (JSON): `email delivery sent`, `email delivery attempt failed; retry scheduled`, `email delivery failed permanently`, `email delivery bookkeeping failed`, `email cron finished`, `email cron failed`, `email cron configuration error`. Contêm `deliveryId`, `eventId`, `templateKey`, `templateVersion`, `attempt`, `status` — nunca destinatário, assunto ou dados do template.
- Sentry (tag `area: email-automation`): falhas definitivas, leases vencidas após a última tentativa, erros de bookkeeping, configuração e falhas gerais do cron.

Diagnóstico no **SQL Editor** (evite selecionar `recipient`/`template_data` sem necessidade):

```sql
select status, count(*) from notification_deliveries group by status;

select id, event_id, template_key, template_version, attempt_count, max_attempts,
       next_attempt_at, last_error, updated_at
from notification_deliveries
where status in ('failed', 'retry')
order by updated_at desc
limit 50;
```

## 7. Reprocessamento manual seguro

Regras: **nunca** alterar uma entrega `sent` (reenvio seria duplicado) nem uma `sending` com lease válida; reprocessar apenas `failed`, depois de corrigir a causa (domínio, chave, template, dado). O código expõe `requeueFailedDelivery` e `cancelDelivery` (`domain/automation/reprocess.ts`, auditados) para uma futura ação de Admin; até lá, use o SQL abaixo, que faz o mesmo e registra a auditoria na mesma instrução.

Reenfileirar uma entrega `failed` com mais 3 tentativas, imediatamente:

```sql
with requeued as (
  update notification_deliveries
  set status = 'retry', next_attempt_at = now(), max_attempts = attempt_count + 3,
      locked_until = null, updated_at = now()
  where id = '<delivery_id>' and status = 'failed'
  returning id, attempt_count, max_attempts
)
insert into audit_log (actor_user_id, action, entity_type, entity_id, before, after)
select null, 'notification_delivery.requeued', 'notification_delivery', id,
       '{"status":"failed"}'::jsonb,
       jsonb_build_object('status', 'retry', 'attemptCount', attempt_count, 'maxAttempts', max_attempts)
from requeued
returning entity_id;
```

Se nada retornar, a entrega não existe ou não está `failed` — não force. Para várias entregas com a mesma causa, troque o filtro por `id in (...)` revisando a lista antes.

Cancelar uma entrega ainda não enviada (`pending`/`retry`):

```sql
with cancelled as (
  update notification_deliveries
  set status = 'cancelled', locked_until = null, updated_at = now()
  where id = '<delivery_id>' and status in ('pending', 'retry')
  returning id
)
insert into audit_log (actor_user_id, action, entity_type, entity_id, after)
select null, 'notification_delivery.cancelled', 'notification_delivery', id, '{"status":"cancelled"}'::jsonb
from cancelled
returning entity_id;
```

Uma linha presa em `sending` volta sozinha à fila quando `locked_until` passa (ou vira `failed` se já esgotou as tentativas). Depois de reenfileirar, rode a chamada manual da seção 4 ou aguarde o próximo ciclo.

## 8. Emergências e rotação

- **Parar envios:** em produção, trocar `EMAIL_DELIVERY_ENABLED` para `false` e fazer redeploy — o cron passa a responder 503 e as entregas permanecem na fila, sem perda. Religar retoma de onde parou.
- **Rotacionar `CRON_SECRET`:** atualizar na Vercel e no agendador externo ao mesmo tempo; chamadas com o valor antigo recebem 401.
- **Rotacionar `RESEND_API_KEY`:** criar a nova chave, atualizar a variável, redeploy, revogar a antiga. Falhas 401/403 no intervalo viram `failed` e podem ser reenfileiradas pela seção 7.
