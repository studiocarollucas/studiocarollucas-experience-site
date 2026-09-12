# Catálogo curado da Paixão Clutch

## Objetivo

Transformar a galeria pública da Paixão Clutch em um catálogo de aluguel intuitivo: preservar a introdução editorial da coleção, mas dar à pessoa visitante uma grade compacta e comparável, com atributos e filtros úteis.

## Experiência

- Manter hero editorial curto; remover o card de destaque em largura dupla e o deslocamento alternado dos cards.
- Usar grade com três cards no desktop, duas colunas no tablet e uma no mobile. Cada foto permanece em proporção 4:5, mas sem dominar a viewport.
- Card: foto, nome, preço de aluguel, linha `cor · tamanho`, descrição com duas linhas e CTA discreto para o detalhe.
- Sob o hero, oferecer chips combináveis: `Todas`, opções de cor e opções de tamanho, todas derivadas apenas dos itens publicáveis.
- Mostrar total de resultados e um estado vazio cordial para combinações sem resultado, com ação de limpar filtros.
- No detalhe, apresentar os mesmos atributos em uma ficha curta junto de descrição, preço e WhatsApp.

## Dados e segurança

- Estender `PublicPaixaoClutch` somente com `color`, `size` e `description`, provenientes de `InventoryItem`.
- A projeção continua exigindo publicação válida e mídia pública pronta, retornando nenhum dado operacional: sem valor de reposição/interno, reservas, auditoria, observações ou mídia privada.
- A lista já é renderizada no servidor; filtros são estado local no componente de catálogo e não criam endpoint, busca administrativa ou novo parâmetro público.

## Qualidade

- Testar o contrato de projeção incluindo apenas os novos atributos permitidos.
- Testar filtros individuais e combinados, contador, estado vazio e limpeza.
- Testar conteúdo dos cards/detalhe e ausência de campos privados.
- Preservar acessibilidade por botões semânticos, estados selecionados e texto de resultado anunciável.

## Fora de escopo

- filtro por preço, disponibilidade em tempo real, carrinho, reserva, checkout e pagamento;
- alteração da curadoria administrativa ou das regras de publicação;
- alteração de URLs, SEO ou fluxo de WhatsApp existentes.
