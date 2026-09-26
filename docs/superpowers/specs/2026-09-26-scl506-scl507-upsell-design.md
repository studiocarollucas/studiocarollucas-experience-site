# Catálogo de upsells + Pedido de upsell integrado ao Financeiro (SCL-506 + SCL-507)

## Objetivo

Transformar a galeria em segundo ponto de conversão (PRD §6.5 "Upsells do MVP de lançamento"): o estúdio cadastra produtos pós-ensaio no Studio OS, escolhe quais são ofertados em cada galeria, a cliente pede pelo portal e a equipe acompanha o pedido até a entrega, cobrando pelo mesmo Payment/Financeiro que já existe — sem saldo paralelo e sem gateway online (fora do MVP).

## Escopo

- Migration `0052_upsell_catalog_orders` (+ snapshot + journal): enum `upsell_order_status`, tabelas `upsell_products`, `gallery_upsell_offers`, `upsell_orders`, `upsell_order_items`, coluna `payments.upsell_order_id` com FK composta, trigger de consistência do pedido, policy do portal em `payments` e RLS/grants.
- `domain/upsell/**`: schemas Zod, regras puras (cotação, transições, saldo do pedido, sugestão por favoritos), catálogo, ofertas por galeria, pedidos (Admin e portal) e pagamento do pedido.
- Admin: `/admin/upsells` (catálogo — criar, editar, ativar/desativar, excluir), `/admin/upsells/pedidos` (lista + filtro por status) e `/admin/upsells/pedidos/[id]` (itens snapshotados, status, pagamentos). Ofertas geridas no workspace da galeria (`/admin/galerias/[shootId]`). Link "Upsells" no menu.
- Portal: `/minha-experiencia/galeria` mostra os produtos ofertados e ativos, sugere fotos adicionais a partir dos favoritos e lista os pedidos da cliente.
- Financeiro: saldo do ensaio passa a ignorar recebimentos de upsell; "A receber" soma o saldo aberto dos pedidos; o livro-caixa identifica recebimentos de upsell.

## Fora de escopo

- Gateway/pagamento online, carrinho persistente e checkout pela cliente (PRD: não é requisito do MVP).
- Entrega automática de arquivos comprados (ex.: liberar download das fotos adicionais) — hoje a equipe libera downloads por galeria (SCL-505).
- Notificação por e-mail de pedido (automação futura sobre o outbox da SCL-700).
- Receita de upsell no dashboard e no LTV da cliente (os dois continuam medindo o ensaio; o livro-caixa já mostra a receita de upsell).
- Estorno automático ao cancelar um pedido pago: estorno continua sendo um Payment `estornado` registrado pela equipe.

## Modelo

### `upsell_products` (SCL-506)

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid PK | |
| `kind` | text, check `foto_adicional` / `colecao_completa` / `album` / `quadro` / `reel_stories` / `outro` | tipo escolhido pelo Admin |
| `name` | text not null, **único** | nome exibido |
| `description` | text null | exibida à cliente |
| `internal_notes` | text null | **só Admin** (fornecedor, produção) — nunca vai ao portal |
| `price` | numeric(10,2) not null, check `>= 0` | preço de venda por unidade |
| `active` | boolean default true | inativo some do portal e não pode ser pedido |
| `sort_order` | integer default 0 | ordem no Admin e no portal |
| `created_at`, `updated_at` | timestamptz | |

O catálogo é **dado**, não UI: nenhum produto, preço ou texto fica fixo no código; `kind` só classifica (rótulo, regra de quantidade). Nenhum produto é semeado — o estúdio cadastra os seus preços.

Dinheiro segue o resto do schema: `numeric(10,2)` + string decimal, aritmética só em `lib/money` (centavos inteiros). Não criamos coluna em centavos para não ter duas convenções de dinheiro no banco.

### `gallery_upsell_offers` (SCL-506)

`gallery_id` → `galleries` (`cascade`), `product_id` → `upsell_products` (`cascade`), único `(gallery_id, product_id)`. Como `galleries.shoot_id` é único, a oferta por Gallery é também a oferta por Shoot — não há segunda tabela por ensaio.

### `upsell_orders` (SCL-507)

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid PK | |
| `client_id` / `shoot_id` / `gallery_id` | uuid not null → `clients` / `shoots` / `galleries` (sem cascade) | registro financeiro, nunca apagado em cascata |
| `status` | `upsell_order_status` default `solicitado` | ciclo do pedido (abaixo) |
| `total` | numeric(10,2) not null, check `>= 0` | snapshot: soma das linhas |
| `client_notes` | text null | observação da cliente |
| `request_key` | uuid not null; único `(client_id, request_key)` | idempotência do envio |
| `created_at`, `updated_at` | timestamptz | |

Único `(id, shoot_id)` — alvo da FK composta de `payments`. Índices `(shoot_id)` e `(status, created_at)`.
Trigger `upsell_orders_consistent`: o Shoot pertence à Cliente e a Gallery pertence ao Shoot.

### `upsell_order_items` (SCL-507)

`order_id` → `upsell_orders` (`cascade`), `product_id` → `upsell_products` (`set null`), e o **snapshot** `kind`, `name`, `description`, `unit_price`, `quantity` (> 0), `line_total` (check `line_total = unit_price * quantity`). Único `(order_id, product_id)`. Mudar ou excluir o produto depois não altera o pedido.

### Status do pedido × pagamento

```text
solicitado → confirmado → em_producao → entregue
     └──────────┴──────────────┴──→ cancelado
```

`entregue` e `cancelado` são terminais. O status **não** diz nada sobre dinheiro: a situação financeira do pedido (`nao_iniciado` / `parcial` / `pago`) é derivada na leitura dos Payments ligados a ele, com as mesmas funções de `domain/payments/balance.ts`.

## Cobrança: Payment ligado ao pedido (decisão)

- Recebimento de upsell é um **Payment comum** do Shoot com `upsell_order_id` preenchido. FK composta `payments (upsell_order_id, shoot_id) → upsell_orders (id, shoot_id)`: o pedido está no mesmo Shoot do pagamento.
- **Saldo do ensaio** = `agreed_price − Payments confirmados com upsell_order_id nulo` (register-payment, ficha do ensaio, cliente, dashboard, contrato, "A receber" e — via policy `payments_client_read` — o portal).
- **Saldo do pedido** = `total − Payments confirmados daquele pedido`, pela mesma `calculateBalance`. Nada é armazenado: não existe "saldo de upsell" gravado nem tabela de recebimentos paralela.
- **Livro-caixa**: todo Payment continua ali; o de upsell aparece como "Recebimento upsell — cliente". "A receber (total)" soma o saldo aberto dos ensaios e dos pedidos `confirmado`/`em_producao`/`entregue`.
- `shoots.payment_status` continua escrito só por `registerPayment` e não muda com upsell.
- A equipe registra o pagamento na página do pedido (`registerUpsellPayment`), só depois de confirmá-lo (`confirmado`, `em_producao` ou `entregue`); pedido `solicitado` ou `cancelado` não recebe pagamento.

## Pedido pela cliente (decisão)

- O pedido nasce `solicitado` e a equipe confirma (ou cancela) no Admin — a cliente não é cobrada automaticamente e o estúdio valida prazo/produção antes.
- A Server Action do portal resolve a cliente pela sessão (`getPortalRequestContext`); o payload só traz `galleryId`, `requestKey`, itens `{ productId, quantity }` e observação. Qualquer `clientId`, preço ou total enviado é descartado pelo schema.
- O domínio autoriza a galeria (publicada, de um Shoot da cliente), relê as ofertas ativas daquela galeria **no servidor** e calcula preço/linhas/total; produto não ofertado, inativo ou repetido é rejeitado; `colecao_completa` só aceita quantidade 1; 1–99 por item, até 20 itens.
- Idempotência: `request_key` gerado pelo servidor na renderização do formulário; `INSERT … ON CONFLICT DO NOTHING` em `(client_id, request_key)` e, em conflito, devolve o pedido existente (`created: false`, sem nova auditoria). Duplo clique/retry converge em um pedido.
- Auditoria `upsell_order.requested` na mesma transação, com a cliente (`viewerAuthUserId`) como ator.

## Portal

- Leitura server-side (Drizzle, como a galeria): `listClientGalleryOffers(clientId, galleryId)` devolve apenas `productId`, `kind`, `name`, `description`, `price` de produtos ativos ofertados na galeria publicada da cliente — nunca `internal_notes`, `active`, `sort_order` ou dados de outras galerias.
- Sugestão de fotos adicionais: `favoritos da cliente − fotos incluídas no pacote` (quando positivo) pré-preenche a quantidade do produto `foto_adicional` e aparece como texto de apoio.
- A lista "Seus pedidos" mostra status, itens e total snapshotados.

## Admin

- `defineAdminAction({ role: "staff" })` em todas as escritas; auditoria na mesma transação: `upsell_product.created|updated|deleted`, `gallery.upsell_offers_updated` (só quando muda), `upsell_order.status_changed` (before/after), `payment.registered` (com `upsellOrderId`).
- Transição inválida ou pedido inexistente → `UpsellError` com mensagem em pt-BR, convertida em `ActionableAdminActionError`.
- Excluir produto: ofertas somem em cascata; itens de pedidos mantêm o snapshot (`product_id` vira nulo). Para tirar do portal sem apagar histórico, desativar.

## RLS / acesso

- As quatro tabelas: RLS ligada, `revoke all` de `anon`/`authenticated`, grants para `authenticated` com policies `*_staff_access` (`public.is_staff_or_admin()`), nada para `anon` — como `galleries`/`reviews`.
- Cliente não lê essas tabelas pela Data API: tudo passa pelo domínio server-side depois de resolver a sessão.
- `payments_client_read` é recriada com `upsell_order_id is null` para o resumo financeiro do ensaio no portal não contar recebimentos de upsell.

## Testes

- `tests/db/upsell-migration.test.ts`: SQL, snapshot encadeado, journal (por tag).
- `tests/domain/upsell-rules.test.ts`: cotação (preço do servidor, oferta/ativo, quantidades, duplicados), transições, saldo do pedido, sugestão por favoritos.
- `tests/domain/upsell-{portal,orders,payments,catalog}.test.ts`: identidade/idempotência/autorização do pedido, transições auditadas, pagamento no Shoot do pedido sem tocar `shoots.payment_status`, catálogo e ofertas auditados.
- `tests/app/client-upsell-actions.test.ts`, `tests/components/client-upsell-offers.test.tsx`, `tests/app/admin-upsell-pages.test.tsx`; ajustes em `tests/app/client-gallery-page.test.tsx`, `tests/app/admin-gallery-page.test.tsx`, `tests/components/admin-nav.test.tsx`.
- Integração opt-in (`RUN_LIVE_DB_TESTS=true`): `tests/domain/upsell.integration.test.ts` (constraints, trigger, FK composta, idempotência real).
