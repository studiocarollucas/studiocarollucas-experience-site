# Fluxos de e-mail: boas-vindas, lembretes D-7/D-1 e Reveal publicado (SCL-701 + SCL-702 + SCL-703)

## Objetivo

Ligar os três primeiros disparos de negócio à fundação de outbox de SCL-700/SCL-705: a cliente recebe (1) boas-vindas quando a reserva do ensaio é confirmada, (2) lembretes D-7 e D-1 calculados no fuso do estúdio e (3) o aviso de que o Reveal/galeria foi publicado — cada um exatamente uma vez, sem expor informação interna, e nunca quando o contexto deixou de valer no momento do envio.

## Escopo

- SCL-701: `createConfirmedShoot` (usado pelo Admin em `createShootAction` e pela conversão de Lead em `createConfirmedShootFromLead`) enfileira, **na mesma transação**, o evento `shoot.confirmed` com chave `shoot.confirmed:<shootId>` e o template `boas-vindas` **v2**.
- SCL-702: passo agendador `scheduleShootReminders` exposto pela rota protegida irmã `/api/cron/shoot-reminders`; eventos `shoot.reminder_d7` / `shoot.reminder_d1` com chave por ensaio + tipo + data agendada; templates `lembrete-d7` v1 e `lembrete-d1` v1.
- SCL-703: `publishGallery` passa a rodar em transação e enfileira `gallery.published` com chave `gallery.published:<galleryId>` e o template `galeria-publicada` v1, com link autenticado para o Reveal.
- Guarda de elegibilidade no envio: o processador consulta, antes de renderizar, se a entrega ainda faz sentido; se não, a entrega vira `cancelled` (novo `markCancelled` condicionado ao claim, contador `cancelled` no resumo).
- Runbook atualizado com a rota nova e a cadência.

## Fora de escopo

- Migrations: nenhuma. Tudo cabe em `automation_events`/`notification_deliveries` (0049).
- SCL-704 (review) e comunicações de produção/entrega concluída.
- Edição da data do ensaio pelo Admin: hoje `updateShootSchema` não aceita `shootDate`; o reagendamento é o status `reagendado`. O desenho abaixo já trata uma data alterada (por SQL ou por uma futura tela) como um novo lembrete.
- Preferências de notificação/descadastro e webhooks do Resend.

## Decisões

### Comuns

- **Destinatário:** `clients.email`, normalizado (trim + minúsculas) e validado antes de enfileirar. Sem e-mail (ou com e-mail inválido) o fluxo não cria evento — e nunca aborta a ação de negócio.
- **Dados do template:** apenas primeiro nome (primeira palavra de `clients.name`, até 60 caracteres, opcional), data civil do ensaio, horário (`HH:mm`, opcional) e URLs absolutas do portal. Nada de preço, observações, pagamento, local/endereço ou dados da equipe. O payload do evento carrega só IDs e a data agendada.
- **Links absolutos:** `absoluteSiteUrl(path)` usa `NEXT_PUBLIC_SITE_URL` (fallback `https://studiocarollucas.com.br`, o mesmo de `lib/site/structured-data.ts`); valor inválido cai no fallback em vez de derrubar a transação. Os links apontam para rotas de `/minha-experiencia/**`, que exigem login (proxy + layout redirecionam para `/login`); nenhum token vai no link.
- **CTA do portal e `portal_enabled`:** o portal só mostra ensaios com `portal_enabled = true` (`selectPortalShoot`). Boas-vindas e lembretes levam o CTA para Minha Experiência quando o ensaio tem o portal liberado; sem isso, o texto orienta a responder o e-mail. O Reveal sempre leva o link, porque `readClientGalleryReveal` não depende de `portal_enabled`.
- **Fuso:** `America/Manaus`, reaproveitando `studioDate`/`daysUntilShoot` de `domain/portal/countdown.ts` (agora exportando `STUDIO_TIME_ZONE`). Um helper novo converte "data + hora de parede" do estúdio em instante UTC via `Intl`, sem offset fixo no código.

### SCL-701 — Boas-vindas

- Evento `shoot.confirmed`, entidade `shoot`, chave `shoot.confirmed:<shootId>`; replay é no-op (garantia do outbox).
- Elegível só para ensaio criado em `reserva`/`preparacao` com data de hoje em diante (fuso do estúdio): cadastrar um ensaio histórico não dispara boas-vindas.
- `boas-vindas` v2 (v1 permanece registrada e imutável para entregas antigas): confirma a reserva, mostra a data (e horário, se houver) e convida para Minha Experiência.
- Falha de envio segue o retry/log existente; falha de validação do template dentro da transação é evitada pela validação prévia do destinatário e dos dados.

### SCL-702 — Lembretes D-7 e D-1

- **Janela** (em dias civis até o ensaio, no fuso do estúdio):
  - D-1: exatamente 1 dia antes.
  - D-7: de 7 a 2 dias antes (tolerância para o agendador ter falhado em algum dia), **e** o ensaio precisa existir antes do dia D-7 (reserva feita com menos de 8 dias de antecedência já recebeu as boas-vindas; não recebe D-7).
  - As janelas são disjuntas: em um dado dia, um ensaio tem no máximo um lembrete devido.
- **Elegibilidade:** status `reserva` ou `preparacao` (nunca `cancelado`, `reagendado` ou estágios pós-ensaio), cliente com e-mail válido.
- **Idempotência:** chave `shoot.reminder_<d7|d1>:<shootId>:<shootDate>`. Rodar o agendador várias vezes no mesmo dia não duplica; se a data do ensaio mudar, a chave muda e o lembrete da nova data é criado quando entrar na janela.
- **Horário de envio:** `next_attempt_at` = 09:00 do dia no fuso do estúdio (ou agora, se já passou), para não enviar de madrugada.
- **Rechecagem no envio (guarda):** a entrega só sai se o ensaio ainda existir, estiver em `reserva`/`preparacao`, tiver a **mesma data** do agendamento e ainda estiver dentro da janela do tipo. Caso contrário, `cancelled` com motivo (`ensaio cancelado ou fora da janela` etc.). Isso cobre cancelamento, reagendamento e mudança de data entre o enfileiramento e o envio, inclusive durante retries.
- **Agendamento:** rota irmã `/api/cron/shoot-reminders` (GET/POST, `Authorization: Bearer <CRON_SECRET>`, mesmo contrato de `/api/cron/email-deliveries`). Não depende da configuração de e-mail: só grava eventos. Cadência recomendada: de hora em hora (mínimo diário, ~07:00 em Manaus = `0 11 * * *` UTC, compatível com o cron diário do plano Hobby). As entregas saem pelo cron de entregas já existente.
- Falha ao enfileirar um ensaio é registrada (log só com IDs + Sentry) e não impede os demais.

### SCL-703 — Reveal/galeria publicada

- "Publica e comunica em eventos separados": a publicação continua sendo a mudança de `galleries.status`; a comunicação é o evento `gallery.published` do outbox, gravado na mesma transação.
- Chave `gallery.published:<galleryId>`. Não existe despublicação e cada ensaio tem no máximo uma galeria, então **republicar nunca reenvia**. Decisão explícita: não há reenvio automático; um reenvio manual, se necessário, segue o runbook (reenfileirar a entrega `failed`/criar nova ação no futuro).
- Galeria publicada **sem fotos** não gera evento (o Reveal estaria vazio). Se a equipe publicar de novo depois de subir as fotos, a primeira publicação com fotos cria o evento.
- Rascunho nunca dispara: o enfileiramento só acontece dentro de `publishGallery`, depois do `update` para `published`; upload, reordenação e remoção de fotos não enfileiram nada. A guarda cancela a entrega se a galeria não estiver mais publicada no envio.
- `galeria-publicada` v1: link para `/minha-experiencia/reveal` (login obrigatório), sem prévia de fotos nem URLs assinadas.
- Retry sem duplicar: evento único por chave, entrega única por (evento, template, destinatário) e `Idempotency-Key` estável por entrega no Resend.

## Arquitetura

```text
createConfirmedShoot(tx) ──► enqueueShootWelcome(shoot, tx) ──► enqueueAutomationEvent(tx)
publishGallery(tx)       ──► enqueueGalleryPublished(gallery, tx) ──► enqueueAutomationEvent(tx)

cron ──► /api/cron/shoot-reminders ──► scheduleShootReminders()
            select shoots em reserva/preparacao com data em [hoje+1, hoje+7] (Manaus)
            planShootReminders (janela, e-mail, criação) → ignora chaves existentes
            enqueueAutomationEvent(tx) por ensaio, sendAt = 09:00 Manaus

cron ──► /api/cron/email-deliveries ──► processDueDeliveries({ guard })
            claim → guard(evento, entidade atual) → cancelled | render + send
```

Módulos:

- `domain/automation/studio-time.ts`, `recipients.ts`, `links.ts`: helpers puros.
- `domain/automation/flows/rules.ts`: tipos de evento, chaves, janela de lembretes e decisões puras da guarda.
- `domain/automation/flows/{shoot-welcome,gallery-published,shoot-reminders}.ts`: leitura mínima + enfileiramento.
- `domain/automation/guard.ts`: `createAutomationDeliveryGuard(db)` carrega o evento e a entidade e aplica as decisões; tipos de evento sem regra são enviados normalmente.
- Templates: `boas-vindas.v2.ts`, `lembrete-d7.v1.ts`, `lembrete-d1.v1.ts`, `galeria-publicada.v1.ts`, com `format.ts` para datas em pt-BR.

## Segurança, privacidade e observabilidade

- Nenhum dado pessoal em logs: agendador e guarda registram apenas `shootId`/`galleryId`, tipo e motivo.
- Rotas cron fora de `app/admin`; `check:admin-auth` inalterado.
- Nada conecta ao banco no import; env lida em tempo de chamada.

## Critérios de aceite

1. SCL-701: 1 envio por reserva confirmada, idempotente; CTA para Minha Experiência; sem informação interna; falha entra no retry/log.
2. SCL-702: datas no fuso do estúdio; não envia para ensaio cancelado/reagendado ou fora da janela (checado ao enfileirar e ao enviar); D-7 e D-1 idempotentes; conteúdo aponta para preparação/portal.
3. SCL-703: publicação e comunicação em eventos separados/idempotentes; link autenticado para o Reveal; draft nunca dispara; retry sem duplicar envio.
