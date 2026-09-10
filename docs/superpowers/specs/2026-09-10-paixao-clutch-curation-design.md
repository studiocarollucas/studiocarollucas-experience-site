# Paixão Clutch — Curadoria única e precificação

## Objetivo

Permitir que a equipe mantenha uma única curadoria editorial “Paixão Clutch” a partir do acervo existente e deixe seus itens prontos para uma vitrine pública posterior. A curadoria é administrativa; a publicação pública será tratada em SCL-557.

## Escopo

Cada item de acervo do tipo `clutch` passa a ter, de forma independente:

- preço de aluguel, em reais, opcional e não negativo;
- valor de reposição, em reais, opcional e não negativo;
- elegibilidade para Paixão Clutch;
- publicação, destaque, ordem editorial e copy curta;
- referência a uma imagem pública própria.

Preço interno continua sendo um dado administrativo existente. Preço de aluguel será exibido pela futura vitrine; preço interno e valor de reposição nunca serão expostos ao público.

## Dados e segurança

Os novos campos pertencem ao item de acervo, com validações no domínio e migração versionada. Apenas staff e admin podem ler ou alterar campos administrativos, preços, curadoria e mídia.

Fotos administrativas seguem privadas. A imagem pública da curadoria é um recurso separado, escolhido explicitamente pela equipe e acessível à futura vitrine somente para itens publicados. Um item não pode ser publicado sem imagem pública, copy curta e preço de aluguel.

Toda alteração de preço, publicação, destaque, ordem e imagem pública produz auditoria com ator, antes/depois e contexto do item.

## Administração

`/admin/paixao-clutch` lista apenas itens `clutch`, com filtros de ativo, publicação e destaque. A equipe pode:

- abrir a ficha do item;
- habilitar ou remover a elegibilidade;
- definir preço de aluguel e valor de reposição;
- definir copy curta e imagem pública;
- publicar/despublicar e marcar destaque;
- reordenar os itens publicados.

Inativar o item, mudá-lo para status indisponível/manutenção, ou removê-lo da curadoria impede publicação. A tela mostra a disponibilidade operacional derivada das reservas, sem flag manual paralela.

## Regras operacionais

Reservas continuam sendo a fonte única para conflitos e disponibilidade. A curadoria não cria reservas nem altera suas regras. Uma vitrine pública poderá mostrar preço de aluguel e estado de disponibilidade, mas uma transação de aluguel, pagamento, caução, dano ou extravio fica explicitamente fora deste escopo e será tratada por SCL-558.

## Testes e aceitação

- somente staff/admin consegue modificar curadoria e preços;
- apenas clutches podem ser curadas;
- publicação exige imagem pública, copy e preço de aluguel válidos;
- preço de reposição não alcança projeções públicas;
- reordenação é transacional e limitada aos itens publicados da curadoria;
- disponibilidade apresentada deriva de reservas, incluindo conflito e item indisponível;
- toda mutação sensível gera auditoria.

## Fora do escopo

Não haverá página pública, checkout, contrato de locação, pagamento, depósito/caução, cobrança por dano, registro de sinistro ou mídia pública automática nesta entrega.
