# Acervo e aluguel — design de fundação

**Data:** 2026-09-09  
**Escopo inicial:** SCL-550 e preparação para SCL-551–558

## Decisão central

O estúdio usa uma única entidade `InventoryItem` para figurinos, clutches, acessórios e props. O campo `type` define a experiência e os filtros; mídia, status, reservas, auditoria e disponibilidade continuam compartilhados.

## Item de acervo

Cada item possui código único, nome, descrição, tipo, cor, tamanho opcional, status operacional, ativo e preço interno opcional. Campos que pertencem somente a uma categoria ficam opcionais nesta fase; uma extensão como `clutch_details` só será criada quando surgir uma regra exclusiva que não possa ser representada de modo simples.

## Reserva e disponibilidade

`InventoryReservation` será a única fonte de indisponibilidade. Ela suporta os propósitos `shoot` e `rental`, intervalo de início/fim e estados de reserva, retirada, devolução e cancelamento. Uma reserva pode apontar para um `Shoot` ou, futuramente, para um `RentalOrder`, mas nunca depende de uma flag manual de disponibilidade.

Conflitos são avaliados sobre todas as reservas ativas do item no intervalo solicitado, independentemente de a origem ser ensaio ou aluguel.

## Caminho de aluguel pago no site

O checkout público não entra nesta primeira migration. A arquitetura fica preparada para uma entidade futura `RentalOrder`, que terá cliente/contato, período, itens, valores e estados comerciais. Pagamentos serão ligados ao pedido, e não ao item, permitindo sinal, saldo, reembolso e vários itens por aluguel.

Itens poderão receber, posteriormente, uma configuração de publicação e elegibilidade para aluguel. O catálogo público de Paixão Clutch continuará sem exigir preço público; a ativação de checkout será uma decisão separada.

## Segurança e operação

- `staff` e `admin` gerenciam itens e reservas.
- RLS protege tabelas de acervo; o site nunca escreve reserva diretamente.
- Itens inativos preservam histórico e deixam de ser elegíveis para novas reservas.
- Mídia e disponibilidade pública serão introduzidas em tarefas posteriores e não persistirão URL pública como fonte de verdade.

## Testes

- Schema valida tipos, status, código e campos opcionais.
- Migration inclui RLS, grants e policy staff/admin.
- O domínio futuro de reserva cobre conflito entre `shoot` e `rental`, cancelamento e preservação de histórico.

## Fora do escopo desta fundação

- Fotos, CRUD Admin, seleção da cliente, reservas operacionais, catálogo público, checkout, gateway e pagamentos de aluguel.
