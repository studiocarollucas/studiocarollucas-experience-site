# Vitrine pública da Paixão Clutch

## Objetivo

Entregar a vitrine pública da Paixão Clutch como uma coleção editorial do Stúdio Carol Lucas. Visitantes podem descobrir clutches publicadas, ver foto, nome, copy e preço de aluguel, e consultar disponibilidade pelo WhatsApp com o contexto do item preenchido.

Esta entrega conclui a interface pública de SCL-557. Ela prepara, mas não implementa, reserva, carrinho, checkout, pagamento, retirada, devolução ou caução.

## Escopo e UX

### Coleção: `/paixao-clutch`

- A página abre com um bloco editorial que posiciona a coleção como parte do styling e da experiência fotográfica, não como e-commerce genérico.
- A curadoria aparece em mosaico, com itens destacados primeiro e os demais em ordem editorial.
- Cada card apresenta somente imagem pública confirmada, nome e preço de aluguel, e leva à página de detalhe.
- A home recebe uma chamada editorial compacta para a coleção, sem deslocar o foco principal nas experiências fotográficas.
- A navegação pública passa a oferecer acesso direto à Paixão Clutch.
- Se a curadoria não tiver itens publicáveis, a rota mantém uma apresentação editorial e CTA para conversar com o estúdio; não retorna erro nem revela a existência de itens não publicados.

### Detalhe: `/paixao-clutch/[slug]`

- Exibe breadcrumb, imagem pública principal, nome, copy, preço de aluguel e CTA “Consultar disponibilidade”.
- O CTA abre o WhatsApp via a integração existente, com mensagem contendo nome e preço formatado da clutch.
- Sugere outras clutches publicáveis de modo discreto. A página não declara disponibilidade em tempo real.
- A URL é canônica, compartilhável e pronta para futuramente se tornar a origem de uma reserva.

### Linguagem visual

- Reutilizar a tipografia, os tons, o ritmo editorial, os componentes de CTA e o comportamento responsivo usados no site público atual.
- Priorizar foto e espaço em branco; preço informa, mas não domina a página.
- A composição de coleção segue a direção “galeria editorial” aprovada: manifesto curto, mosaico de produtos e cards com leitura calma.

## Arquitetura e segurança

### Projeção pública

Criar no domínio de inventário uma consulta pública independente das consultas administrativas. Ela somente pode retornar os campos necessários à vitrine:

- identificador interno para chave de renderização;
- slug público;
- nome;
- copy;
- preço de aluguel;
- URL da imagem pública confirmada;
- indicador de destaque e ordem editorial.

O predicado de publicação exige simultaneamente: item do tipo `clutch`, ativo, com status `available`, marcado como publicado, com copy, preço de aluguel e imagem pública confirmada. A projeção não retorna valor de reposição, valor interno, observações, reservas, auditoria, mídia interna, paths de storage privado ou URLs assinadas.

### Slug e dados

- Adicionar `paixaoClutchSlug` ao modelo de `InventoryItem`, exclusivo para clutches publicadas na vitrine.
- Criar uma migration nova, sem editar as migrations `0045` e `0046` já integradas.
- O slug é gerado/validado no servidor, é único e não depende de ID exposto na URL.
- A publicação continuará sendo protegida pelos pré-requisitos existentes: elegibilidade, atividade, disponibilidade, copy, preço e mídia pública confirmada. A migration e a validação de curadoria passam a incluir o slug como requisito antes de publicar.

### Evolução para reserva

O detalhe é o ponto de entrada estável de uma ação única de intenção. Nesta entrega ela abre WhatsApp; uma entrega posterior pode trocar a implementação pela criação de reserva autenticada e, depois, checkout/pagamento. O contrato público do item e as URLs não precisarão mudar.

## SEO, analytics e resiliência

- Metadata de coleção e item: título, descrição, canonical e Open Graph; itens inexistentes ou não publicáveis retornam 404.
- Registrar as novas rotas no sitemap se a infraestrutura atual usar rotas estáticas enumeráveis; preservar o padrão existente de Google Analytics.
- O contato pelo WhatsApp inclui a origem de intenção já suportada pelo helper existente. Não implementar instrumentação de pagamento.
- Falha de leitura não deve degradar para dados administrativos. A página segue o padrão seguro de erro do site, sem detalhes internos.

## Testes

Adotar TDD, começando por testes que falham, cobrindo:

- filtro e ordenação pública: somente clutches publicáveis, destaque e ordem editorial;
- contrato de dados: nenhum campo administrativo ou de mídia privada é retornado;
- slug exclusivo, geração/validação e indisponibilidade de slug em item não publicável;
- páginas de coleção e detalhe: foto, nome, copy, preço, CTA contextual e estado vazio;
- 404 e metadata para item ausente ou despublicado;
- link de entrada na navegação/home;
- atualização de sitemap quando aplicável.

Antes de integrar, executar os testes direcionados, typecheck, lint, build e `git diff --check`; fazer revisão de código focada em autorização indireta, vazamento de mídia e dados, e regressões de renderização pública.

## Fora de escopo

- reserva ou bloqueio de inventário;
- autenticação de visitante;
- carrinho, checkout, gateway ou pagamento;
- disponibilidade em tempo real;
- retirada, devolução, caução e fluxo completo de aluguel avulso;
- alteração de mídia privada ou das migrations já mergeadas.

