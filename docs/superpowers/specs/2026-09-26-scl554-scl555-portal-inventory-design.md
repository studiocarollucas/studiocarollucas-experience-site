# Seleção de figurinos/clutches pela cliente (SCL-554) + avaliação de Styling ↔ acervo (SCL-555)

**Data:** 2026-09-26
**Escopo:** SCL-554 implementada; SCL-555 avaliada — exige migration e fica como follow-up desenhado abaixo.

## Objetivo

Na página de Styling da Minha Experiência, a cliente vê as peças **reais** do acervo elegíveis para o seu ensaio (figurinos e clutches), com fotos privadas assinadas no servidor, e sinaliza preferências. A equipe confirma ou ajusta essas preferências na tela do ensaio no Admin, com as mesmas regras de conflito e a mesma auditoria já usadas nas reservas. O moodboard de inspirações (SCL-305) continua separado e intacto.

## Sem migration: preferência = reserva `pending` do ensaio

O PRD (§6.3) pede "salvar preferências e reservas na mesma entidade de ensaio". O schema de `inventory_reservations` (SCL-553/0048) já comporta isso:

| Estado | Representação | Quem cria |
|---|---|---|
| Preferência da cliente (aguardando a equipe) | `purpose = 'shoot'`, `shoot_id` preenchido, `status = 'pending'`, `expires_at` nulo | cliente, pelo portal |
| Reserva confirmada | `status = 'confirmed'` | equipe (criação direta, já existente, ou confirmação da preferência) |
| Preferência retirada / ajustada | `status = 'cancelled'` + `cancelled_at`/`cancelled_by_user_id` | cliente (só `pending`) ou equipe |

Hoje nenhum fluxo grava `pending` com `shoot_id`: a criação pelo Admin grava `confirmed` e o hold público de aluguel grava `pending` **sem** `shoot_id` e com `expires_at`. Por isso `pending` + `shoot_id` identifica sem ambiguidade a preferência da cliente, sem coluna nova.

Consequência deliberada: pelo `inventoryReservationBlockingPredicate` existente, `pending` com `shoot_id` **bloqueia** o item na janela do ensaio. A preferência funciona como pré-reserva: a cliente só consegue marcar peça livre (checagem de conflito no mesmo advisory lock por item), e nenhuma outra cliente, aluguel público ou reserva da equipe promete a mesma peça sem conflito explícito. A equipe decide: confirma (pending → confirmed) ou cancela. O limite por ensaio (abaixo) evita que uma cliente segure metade do acervo.

A janela é o dia do ensaio (`starts_on = ends_on = shoot_date`), o mesmo padrão que o formulário do Admin sugere. Se o ensaio for reagendado, a equipe ajusta (cancela e recria) como já faz hoje.

## Elegibilidade

A cliente só lê/escreve pelo `PortalContext` resolvido no servidor (`getPortalRequestContext`); o domínio revalida, via Drizzle, que `shoots.id = context.shoot.id AND shoots.client_id = context.client.id`. Qualquer id de cliente/ensaio no payload é ignorado — o payload tem apenas `inventoryItemId` e o estado desejado.

- **Seleção aberta** somente se o ensaio selecionado tem `portal_enabled`, status `reserva` ou `preparacao` e data ≥ hoje (fuso do estúdio). Fora disso, a página mostra apenas as peças já vinculadas ao ensaio, sem catálogo.
- **Tipos elegíveis:** `outfit` (figurino) quando o pacote não zera looks; `clutch` quando `experience_packages.clutch_included`. `accessory` e `prop` ficam para a equipe.
- **Itens:** `active = true` e `status = 'available'` — nunca `maintenance`/`retired`.
- **Limites de preferência por ensaio** (contam `pending` + `confirmed` do mesmo tipo): figurinos = `outfits_limit` do pacote, ou 3 quando o pacote diz "a combinar" (`null`); clutch = 1.

## Disponibilidade sem promessa

Para cada item do catálogo, na janela do ensaio:

- `reserved` — reserva `confirmed` deste ensaio;
- `preferred` — reserva `pending` deste ensaio;
- `unavailable` — qualquer outra reserva bloqueante sobreposta (outro ensaio, aluguel, hold público vigente). A UI diz **"Indisponível na data do seu ensaio"** e não oferece o botão; nunca revela de quem é a reserva nem o período;
- `available` — caso contrário.

A leitura é um retrato do render; a verdade é a escrita, que refaz item elegível + conflito dentro do advisory lock (`pg_advisory_xact_lock(hashtext(itemId))`, o mesmo de `createShootInventoryReservation`) e trava a linha do ensaio (`FOR UPDATE`) para serializar a contagem do limite.

## Dados expostos ao browser

Somente: `id`, `name`, `type`, `color`, `size`, estado de disponibilidade e até 4 fotos (`id` da mídia + URL assinada). **Não** saem: `code`, `description` (rotulada "Descrição interna" no Admin), preços (`internal_price`, `rental_price`, `replacement_value`), campos Paixão Clutch, `storage_path`, dados de outras reservas/clientes.

As fotos vêm de `inventory_media` (sem `deletion_requested_at`, capa primeiro). O bucket `inventory-media` é staff-only; a assinatura usa a service role criada por chamada, só no servidor (mesmo padrão de `readClientGallery`), TTL de 10 minutos, lote único e fail-closed em cardinalidade divergente. Se o acervo falhar, a página de Styling mostra aviso neutro e mantém o moodboard.

## Escrita da cliente

`setInventoryPreferenceAction({ inventoryItemId, preferred })` em `app/(client)/minha-experiencia/styling/actions.ts` (fora de `app/admin`, portanto sem `defineAdminAction`, como a action de favoritos da galeria):

- `preferred = true`: dentro de uma transação — advisory lock do item; ensaio da cliente `FOR UPDATE` + pacote; seleção aberta; item elegível (`FOR UPDATE`); se já existe reserva bloqueante deste ensaio para o item, responde o estado atual (idempotente); limite do tipo; conflito na janela; insere `pending`; auditoria `inventory_reservation.preference_created` com `actorUserId` = Auth user da cliente.
- `preferred = false`: cancela apenas a `pending` deste ensaio para o item (`cancelled_by_user_id` = Auth user da cliente, que sempre tem `profiles` pelo trigger 0002); auditoria `inventory_reservation.preference_withdrawn`. Reserva `confirmed` não é alterada pela cliente ("fale com o estúdio"). Retirar o que não existe é no-op.
- Erros de domínio viram mensagens neutras (`PortalInventorySelectionError`); sessão expirada pede novo login; demais erros são logados e respondem mensagem genérica. A action revalida `/minha-experiencia/styling`.

## Equipe confirma / ajusta

- `confirmShootInventoryReservation(reservationId, actorUserId, shootId, { overrideConflict, overrideReason })`: exige staff/admin; na transação trava o item (advisory + linha), exige item ativo/disponível, procura conflito **excluindo a própria reserva**; conflito sem exceção explícita falha; com exceção grava responsável/momento/motivo como a criação já faz. Só `pending` → `confirmed` (`WHERE status = 'pending' AND shoot_id = :shootId`). Auditoria `inventory_reservation.confirmed` com `before`/`after`.
- `confirmShootInventoryReservationAction` via `defineAdminAction` (role `staff`), revalida as mesmas rotas das demais ações de reserva.
- Na seção "Acervo reservado", `pending` aparece como **"Preferência da cliente"**, com "Confirmar reserva" e o "Cancelar reserva" já existente. Em conflito, o formulário revela "Registrar exceção por conflito" + motivo.
- Ajuste continua sendo cancelar e reservar outro item pelo formulário existente.

## SCL-555 — avaliação: exige migration (follow-up)

Os três primeiros critérios já ficam atendidos na apresentação desta entrega: o moodboard continua aceitando referências livres; as peças reais aparecem como bloco próprio ("Peças do acervo") com nome, tipo, cor, tamanho e foto próprios; e a página separa visualmente "Inspirações" de "Peças do seu ensaio" com o estado (preferência × reservada). O critério **"Admin consegue relacionar referência a item quando útil"** exige persistir o vínculo referência ↔ item, o que não existe no schema. Por isso SCL-555 não foi implementada nesta branch.

Desenho proposto (migration posterior à 0051):

- `styling_references.inventory_item_id uuid null references inventory_items(id) on delete set null` + índice `(shoot_id, inventory_item_id)`.
- Somente staff/admin grava o vínculo (policy de update restrita; a cliente continua só inserindo/removendo as próprias referências). Action `linkStylingReferenceToInventoryItemAction` via `defineAdminAction`, auditada (`styling_reference.linked`/`unlinked`), validando que o item está reservado (pending/confirmed) para o mesmo ensaio.
- A leitura do portal (`readStylingReferences`) não seleciona a coluna diretamente (a cliente não tem grant em `inventory_items`); o servidor projeta, via Drizzle, `{ referenceId, itemName, reservationState }` só para itens reservados ao ensaio dela, e o board mostra "Inspiração ligada a: <peça>".

## Fora de escopo

- Aluguel de clutch fora do pacote (SCL-558, DEFERRED).
- Notificação à equipe quando a cliente marca preferência (SCL-7xx).
- Expiração automática de preferências; reagendamento automático das janelas.

## Critérios (SCL-554)

1. Cliente vê somente itens elegíveis/ativos para seu fluxo.
2. Diferencia preferência de reserva confirmada.
3. Fotos e detalhes suficientes para decisão, sem campos internos.
4. Staff confirma/ajusta reserva.
5. Indisponibilidade aparece sem prometer item conflitante.

## Verificação

- `tests/domain/inventory-portal-selection-rules.test.ts` — regras puras (seleção aberta, tipos, limites, estados de disponibilidade, projeção sem campos internos).
- `tests/domain/inventory-portal-selection.test.ts` — escrita com Drizzle mockado (lock, posse do ensaio, elegibilidade, idempotência, limite, conflito, auditoria, retirada só de `pending`) e assinatura das fotos.
- `tests/domain/inventory-reservations.test.ts` — confirmação (conflito excluindo a própria, exceção, auditoria, ator).
- `tests/app/client-styling-actions.test.ts`, `tests/app/client-styling-page.test.tsx`, `tests/components/client-inventory-selection.test.tsx`, `tests/app/admin-inventory-reservations.test.tsx`.
