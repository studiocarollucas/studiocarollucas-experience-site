# Reservas de acervo e Reveal da cliente — design

**Data:** 2026-09-09  
**Escopo:** SCL-553 e SCL-503

## Objetivo

Concluir dois fluxos independentes do MVP: a alocação segura de itens do acervo para ensaios e a abertura editorial da galeria privada da cliente. O desenho preserva a preparação já feita para aluguel avulso, sem antecipar checkout ou gateway.

## Reservas e conflitos do acervo

`InventoryReservation` passa a ser a fonte de verdade de alocação de um `InventoryItem` para um `Shoot`. A reserva armazena o item, o ensaio, início e fim do intervalo, status e os dados de cancelamento ou exceção. O histórico é preservado: cancelar ou liberar nunca remove uma linha.

O domínio considera conflito qualquer sobreposição de uma reserva ativa para o mesmo item, inclusive quando uma futura reserva tiver propósito de aluguel. A confirmação normal falha quando existe conflito. A equipe autorizada pode, porém, tomar uma decisão consciente de confirmar uma exceção: o pedido deve declarar a decisão e o motivo, e o domínio grava responsável, momento e justificativa no histórico/auditoria.

O fluxo de ensaio mostra os itens reservados e o seu estado. Apenas `staff` e `admin` podem criar, alterar, cancelar ou confirmar uma exceção. A cliente e o site público não escrevem reservas.

O contrato conserva o caminho de aluguel: propósito, intervalo e lógica de conflito não dependem de `Shoot`; nesta entrega o vínculo obrigatório é com `Shoot`, enquanto `RentalOrder` continua entidade futura. Não haverá checkout, retirada/devolução comercial ou pagamento de aluguel nesta onda.

## Reveal da cliente

Publicar uma galeria torna-a imediatamente acessível para a cliente proprietária do `Shoot`, como decidido anteriormente. Em vez de abrir as fotos diretamente, o portal encaminha primeiro para uma página de Reveal mobile-first.

A página usa a foto de capa, título e mensagem configurados pela equipe, mostra uma abertura editorial acessível e oferece o CTA **Abrir minha galeria**. Esse CTA navega para a galeria privada já existente, que continua emitindo URLs temporárias pelo servidor; nenhum URL de storage é exposto pela tela de Reveal.

O Reveal é uma porta de entrada recorrente, não uma experiência de uso único. Isso evita bloquear uma cliente que retorne depois e não exige estado de primeira visualização nesta etapa. A página só responde para a cliente dona de uma galeria publicada; caso contrário, segue o comportamento seguro já adotado pelo portal.

## Limites e segurança

- Não mudar o momento de publicação nem criar automação de comunicação nesta onda.
- Não incluir favoritos, download ou upsell; eles continuam nas tarefas dependentes SCL-504–507.
- Reservas conflitantes não são silenciosamente aceitas: toda exceção exige decisão explícita e justificativa persistida.
- RLS, autorização no domínio e auditoria fazem parte da migration/serviço de reservas.

## Validação

- Testes de schema e migration validam RLS, grants e contratos de reserva.
- Testes de domínio cobrem sobreposição, cancelamento, preservação de histórico e confirmação excepcional auditada.
- Testes do portal confirmam que somente a proprietária de uma galeria publicada vê o Reveal e que o CTA não expõe storage direto.
- Typecheck e testes focados acompanham cada frente; a integração valida a lista de itens reservados no ensaio.

## Decomposição para execução paralela

As frentes não compartilham migration nem arquivos centrais de interface:

1. **SCL-553:** schema/migration, domínio e integração da ficha de ensaio.
2. **SCL-503:** rota e interface de Reveal sobre o read model de galeria já publicado.

A integração será serializada em `main`, com revisão de autorização e testes antes do push.
