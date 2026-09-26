# Automações de e-mail — outbox, Resend, fluxos e reprocessamento (SCL-700–705)

Fluxo: uma ação de negócio grava, **na mesma transação**, um `automation_events` e uma ou mais `notification_deliveries` (`enqueueAutomationEvent(input, tx)`). Um agendador chama `/api/cron/email-deliveries`, que reivindica as entregas vencidas, renderiza o template na versão fixada, envia pelo provider configurado e registra `sent`, `retry` ou `failed`.

Fluxos ativos (SCL-701–704, seção 9): boas-vindas na reserva confirmada, lembretes D-7/D-1 (agendados por `/api/cron/shoot-reminders`), aviso de Reveal publicado e pedido de avaliação no Google após a entrega (agendado por `/api/cron/review-requests`, com o card de avaliação de Minha Experiência — SCL-721).

## 1. Variáveis de ambiente

| Variável | Onde | Obrigatória | Notas |
| --- | --- | --- | --- |
| `EMAIL_DELIVERY_ENABLED` | Production (e só onde houver envio real) | sim, para envio real | Somente o literal `true` liga o Resend. Qualquer outro valor usa o provider de log. Em `VERCEL_ENV=production`, desligado faz o cron responder **503** sem tocar na fila. |
| `RESEND_API_KEY` | Production | com o flag ligado | Chave com permissão *Sending access*. Server-only. |
| `EMAIL_FROM` | Production | com o flag ligado | Remetente em domínio verificado, ex.: `Stúdio Carol Lucas <ola@studiocarollucas.com.br>`. |
| `EMAIL_REPLY_TO` | Production | não | Ex.: `experiencia@studiocarollucas.com.br`. |
| `CRON_SECRET` | Production e Preview (se houver cron) | sim | ≥ 32 caracteres (`openssl rand -hex 32`). Ausente/curto → 503; divergente → 401. |
| `STUDIO_GOOGLE_REVIEW_URL` | Production | sim, para o pedido de avaliação | Link "Escrever uma avaliação" do Google Business Profile (`https://…`). Server-only. Vazio/inválido: nenhum pedido é criado ou enviado (aviso único por execução do agendador), o card do portal some e a guarda cancela pedidos ainda na fila. |

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

### Agendador de lembretes D-7/D-1 (SCL-702)

`/api/cron/shoot-reminders` (mesmo contrato: `GET`/`POST` com `Authorization: Bearer <CRON_SECRET>`) só **grava** os lembretes do dia na fila; quem envia é o cron de entregas acima. Não depende de `EMAIL_DELIVERY_ENABLED`/Resend.

- Cadência recomendada: **de hora em hora** (`0 * * * *`). É idempotente — rodar várias vezes no mesmo dia não duplica nada.
- Mínimo aceitável: **uma vez por dia antes das 09:00 em Manaus**, ex. `0 11 * * *` (UTC = 07:00 em Manaus), o que cabe no cron diário do plano Hobby:

  ```json
  { "crons": [{ "path": "/api/cron/shoot-reminders", "schedule": "0 11 * * *" }] }
  ```

- Os lembretes ficam com `next_attempt_at` às 09:00 (Manaus) do dia; se o agendador rodar depois disso, saem no próximo ciclo do cron de entregas.
- Se o agendador ficar parado, o D-7 ainda é recuperado até 2 dias antes do ensaio; o D-1 não é recuperado no próprio dia (o texto diz "amanhã").

Chamada manual:

```bash
curl -sS -X POST "https://studiocarollucas.com.br/api/cron/shoot-reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

```json
{ "ok": true, "today": "2026-10-05", "candidates": 3, "enqueued": 2, "alreadyQueued": 1, "notDue": 0, "noEmail": 0, "errors": 0 }
```

`noEmail` conta clientes sem e-mail válido no cadastro; `errors > 0` vai ao Sentry (`reason: reminder-schedule`) com o `shootId`.

### Agendador de pedidos de avaliação (SCL-704)

`/api/cron/review-requests` (mesmo contrato: `GET`/`POST` com `Authorization: Bearer <CRON_SECRET>`) cria o `Review` do Google (`source = 'automacao'`) e grava o e-mail `pedido-avaliacao` na mesma transação, para cada ensaio elegível (regra na seção 9). Não depende de `EMAIL_DELIVERY_ENABLED`/Resend, mas **exige** `STUDIO_GOOGLE_REVIEW_URL`.

- Cadência recomendada: **uma vez por dia**, ex. `0 12 * * *` (UTC = 08:00 em Manaus). Rodar mais vezes é seguro (idempotente).

  ```json
  { "crons": [{ "path": "/api/cron/review-requests", "schedule": "0 12 * * *" }] }
  ```

- Os pedidos ficam com `next_attempt_at` às 10:00 (Manaus) do dia; depois disso saem no próximo ciclo do cron de entregas.
- Se o agendador ficar parado, o pedido ainda sai enquanto a entrega tiver até 30 dias; depois disso o ensaio nunca recebe e-mail automático (o card do portal continua).

Chamada manual:

```bash
curl -sS -X POST "https://studiocarollucas.com.br/api/cron/review-requests" \
  -H "Authorization: Bearer $CRON_SECRET"
```

```json
{ "ok": true, "today": "2026-10-10", "configured": true, "candidates": 2, "enqueued": 1, "alreadyRequested": 0, "notDue": 0, "noEmail": 1, "errors": 0 }
```

`configured: false` = `STUDIO_GOOGLE_REVIEW_URL` ausente/inválida (nada foi lido nem gravado; log `review requests skipped: …`). `alreadyRequested` conta ensaios cujo Review foi criado por outra execução ou pelo clique no portal no mesmo instante. `errors > 0` vai ao Sentry (`reason: review-request-schedule`) com o `shootId`.

## 4. Chamada manual e leitura da resposta

```bash
curl -sS -X POST "https://studiocarollucas.com.br/api/cron/email-deliveries" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Resposta (só contadores, sem dados pessoais):

```json
{ "ok": true, "mode": "resend", "staleFailed": 0, "claimed": 3, "sent": 2, "retried": 1, "failed": 0, "cancelled": 0, "lostLease": 0, "errors": 0 }
```

- `mode: "log"` em produção não acontece (503); em outros ambientes indica envio simulado.
- `cancelled > 0`: a guarda de elegibilidade (seção 9) cancelou entregas cujo contexto mudou (ensaio cancelado/reagendado/com outra data, galeria despublicada, avaliação já concluída/cancelada ou link de avaliação removido). O motivo fica em `last_error`.
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
| `cancelled` | Cancelada antes do envio (manualmente ou pela guarda de elegibilidade, com o motivo em `last_error`); nunca é processada. |

- Transitórios: erro de rede/timeout, HTTP 408, 409, 429 e 5xx. Permanentes: demais 4xx, template não registrado, dados inválidos.
- Backoff: 5, 10, 20, 40 min (teto de 6 h); `max_attempts` padrão 5.
- Idempotência: evento único por `idempotency_key`; entrega única por (`event_id`, `template_key`, `recipient`); o Resend recebe `Idempotency-Key: notification-delivery/<id>`, estável entre tentativas (janela de 24 h do Resend).
- `last_error` é sanitizado (sem e-mails, chaves `re_…` ou tokens) e limitado a 500 caracteres.

## 6. Observabilidade

- Logs estruturados (JSON): `email delivery sent`, `email delivery cancelled at send time`, `shoot reminders cron finished`, `shoot reminder enqueue failed`, `review requests cron finished`, `review requests skipped: STUDIO_GOOGLE_REVIEW_URL missing or invalid`, `review request enqueue failed`, `email delivery attempt failed; retry scheduled`, `email delivery failed permanently`, `email delivery bookkeeping failed`, `email cron finished`, `email cron failed`, `email cron configuration error`. Contêm `deliveryId`, `eventId`, `templateKey`, `templateVersion`, `attempt`, `status` — nunca destinatário, assunto ou dados do template.
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

## 9. Fluxos de negócio (SCL-701–704)

| Fluxo | Quando | Evento / chave idempotente | Template | Link |
| --- | --- | --- | --- | --- |
| Boas-vindas (SCL-701) | Criação de ensaio confirmado (Admin ou conversão de Lead), na mesma transação | `shoot.confirmed` / `shoot.confirmed:<shootId>` | `boas-vindas` v2 | `/minha-experiencia` (só com portal liberado no ensaio) |
| Lembrete D-7 (SCL-702) | Agendador, 7 a 2 dias antes (Manaus), se a reserva existia antes do dia D-7 | `shoot.reminder_d7` / `shoot.reminder_d7:<shootId>:<data>` | `lembrete-d7` v1 | `/minha-experiencia/checklist` (só com portal) |
| Lembrete D-1 (SCL-702) | Agendador, exatamente 1 dia antes (Manaus) | `shoot.reminder_d1` / `shoot.reminder_d1:<shootId>:<data>` | `lembrete-d1` v1 | `/minha-experiencia/ensaio` (só com portal) |
| Reveal publicado (SCL-703) | `publishGallery`, na mesma transação, se a galeria tiver fotos | `gallery.published` / `gallery.published:<galleryId>` | `galeria-publicada` v1 | `/minha-experiencia/reveal` (sempre; exige login) |
| Pedido de avaliação (SCL-704) | Agendador, 3 a 30 dias após a entrega (Manaus), com o Review criado na mesma transação | `review.requested` / `review.requested:<shootId>:google` | `pedido-avaliacao` v1 | `STUDIO_GOOGLE_REVIEW_URL` (Google, externo) |

- **Destinatário:** `clients.email`. Sem e-mail válido, nenhum evento é criado e a ação de negócio segue normalmente. Os links são absolutos a partir de `NEXT_PUBLIC_SITE_URL` e sempre passam pelo login do portal — nenhum token vai no e-mail.
- **Conteúdo:** só primeiro nome, data/horário e links do portal; nunca preço, observações, pagamento, endereço ou dados da equipe.
- **Elegibilidade:** boas-vindas só para ensaio em `reserva`/`preparacao` com data de hoje em diante; lembretes só para `reserva`/`preparacao` (nunca `cancelado`/`reagendado`).
- **Guarda no envio:** o cron de entregas reconsulta o evento e a entidade antes de enviar. Boas-vindas de ensaio cancelado, lembrete de ensaio cancelado/reagendado/com outra data/fora da janela e aviso de galeria não publicada viram `cancelled`.
- **Reagendamento:** a chave do lembrete inclui a data. Com nova data, o lembrete antigo é cancelado pela guarda e o novo é criado quando a nova data entrar na janela.
- **Pedido de avaliação (SCL-704) — regra:** job de produção `entregue` com `delivery_at`, galeria `published`, ensaio não `cancelado` e pelo menos 3 dias desde `delivery_at` (fuso do estúdio); o e-mail só até 30 dias depois da entrega, para que o primeiro deploy não peça avaliação de entregas antigas. Nunca pede de novo: o agendador ignora ensaios com **qualquer** Review do Google (solicitado, concluído ou cancelado pela equipe), o índice único de `reviews` barra corridas e a chave do evento é por ensaio + destino. A guarda cancela o envio se o Review foi concluído/cancelado ou o link deixou de estar configurado. O texto convida sem pressão, sem incentivo e sem filtrar clientes satisfeitas.
- **Card de avaliação no portal (SCL-721):** mesma regra, sem o teto de 30 dias, para o ensaio entregue mais recente, enquanto o Review do Google desse ensaio não estiver concluído/cancelado. Aparece no início e abaixo da galeria, nunca bloqueia nada. "Avaliar no Google" abre o link em nova aba e registra `review.link_opened` na `audit_log` (cria o Review com `source = 'portal'` se o e-mail ainda não tiver saído — então o e-mail não sai depois); "Agora não" só grava o cookie `scl_review_prompt_dismissed` (por navegador e por ensaio).
- **Fechar o ciclo:** a equipe não vê a avaliação no Google; em `/admin/agenda/<shootId>`, seção **Avaliação**, marca **concluída** ou **cancela** o pedido (auditado). Cancelar também encerra o card e cancela o e-mail ainda na fila.
- **Republicar a galeria não reenvia:** a chave é por galeria e não existe despublicação. Não há reenvio automático nem manual de uma entrega `sent` (seção 7); se a cliente não recebeu, o estúdio envia o link `/minha-experiencia/reveal` por outro canal. Uma galeria publicada sem fotos não gera aviso; publicar de novo depois de subir as fotos gera o primeiro.

Diagnóstico por fluxo (sem dados pessoais):

```sql
select e.event_type, d.status, count(*)
from notification_deliveries d join automation_events e on e.id = d.event_id
where e.event_type in ('shoot.confirmed', 'shoot.reminder_d7', 'shoot.reminder_d1', 'gallery.published', 'review.requested')
group by 1, 2 order by 1, 2;

-- Por que uma entrega foi cancelada/falhou
select d.id, e.event_type, e.entity_id, d.status, d.last_error, d.updated_at
from notification_deliveries d join automation_events e on e.id = d.event_id
where d.status in ('cancelled', 'failed') order by d.updated_at desc limit 50;

-- Funil de avaliações (SCL-704/SCL-721): pedidos, cliques no portal e conclusões
select r.source, r.status, count(*) as reviews,
       count(*) filter (where exists (
         select 1 from audit_log a
         where a.entity_type = 'review' and a.entity_id = r.id and a.action = 'review.link_opened'
       )) as abriram_link
from reviews r where r.target = 'google'
group by 1, 2 order by 1, 2;
```
