# Catálogo administrável e quiz de curadoria — design

**Data:** 2026-09-07  
**Status:** aprovado para planejamento  
**Escopo:** catálogo de pacotes no Studio OS e SCL-403/SCL-404 (quiz e resultado/persistência)

## Objetivo

Transformar os pacotes em um catálogo administrável pelo Studio OS e usar esse catálogo para orientar a visitante, no site público, até o pacote mais adequado à ocasião, preferência visual, nível de produção, quantidade de looks e faixa de investimento.

O quiz não é vendido como IA: é uma curadoria de regras transparentes. Ele mantém o preço exato fora do resultado público, embora a visitante possa declarar sua faixa de investimento para que a recomendação seja útil.

## Decisões de produto

- A primeira resposta do quiz é sempre o **tipo de ensaio**. Ela é uma restrição rígida: um pacote de gestante nunca é sugerido para alguém que escolheu 15 anos.
- O quiz terá seis escolhas principais, como definido no PRD. A preferência de cores será uma etapa opcional **após** o resultado, sem alterar a indicação do pacote.
- O resultado apresenta: persona estética, direção criativa, pacote recomendado e o motivo da escolha. Não apresenta o preço do pacote.
- A preferência de paleta aparece somente para pacotes que permitem cenário, fundo ou balões. Ela é enviada para o WhatsApp e deve poder iniciar a referência de styling quando houver conversão.
- A página pública não será uma tabela de preços. As faixas de investimento aparecem apenas como opções no próprio quiz.
- Todos os pacotes são administrados no Studio OS; cada um pode ser ativado/desativado, publicado/despublicado e incluído/excluído do quiz sem mudança de código.

## Catálogo

### Estrutura

O catálogo deve separar uma **família de experiência** dos pacotes que a compõem:

- Família: nome, slug, descrição curta, ordem, ativo e publicado no site.
- Pacote: família, nome, descrição, preço-base interno, duração, fotos incluídas, limite de looks/trocas, número de cenários, limite de acompanhantes, vídeos incluídos, make, cabelo, clutch, itens inclusos, ativo, publicado e elegível ao quiz.

`Shoot.experience_package_id` continua apontando diretamente para o pacote. Portanto, desativar ou despublicar um pacote nunca elimina nem altera o histórico de um ensaio vendido.

Os campos usados pela regra do quiz são estruturados (família, preço-base, limite de looks, cenários e elegibilidade), não inferidos de texto livre. A lista editorial de inclusões pode ser mantida separadamente para exibição e operação.

### Famílias iniciais

1. 15 anos / Debutante
2. Aniversário
3. Gestante
4. Newborn
5. Casal / Namorados
6. Formatura
7. Marca pessoal
8. Corporativo

As quatro primeiras são as famílias já expostas ou previstas para o site público. As demais entram no admin desde o início, mas podem permanecer sem publicação e fora do quiz até a curadoria visual e as respectivas páginas estarem prontas.

### Material recebido

O acervo fornecido estabelece o conteúdo inicial e confirma progressões de pacote por duração, fotos, looks, cenários e investimento. Há variações históricas de preço/nome para alguns materiais; o painel será a fonte de verdade daqui em diante.

Referências iniciais identificadas:

- **15 anos/Debutante:** Debutante 1, 2, 3, 4 Duo e Externo.
- **Aniversário:** Cinderela, Aurora e Diana; o registro legado Bella é preservado e poderá ser completado/renomeado no admin antes de ser publicado.
- **Gestante:** Gestante 1, 2 e 3.
- **Newborn:** Newborn 1, 2, 3 e Gestante + Newborn.
- **Demais famílias:** ofertas de casal, formatura, marca pessoal e corporativo presentes no material de referência.

Nenhum valor deve ser inventado: o cadastro inicial transcreve apenas valores e inclusões confirmados nos materiais fornecidos. O admin permite corrigir valores, disponibilidade e descrição antes de uma oferta entrar no quiz.

## Quiz público

### Jornada principal

1. **Tipo de ensaio** — 15 anos, aniversário, gestante, newborn e as demais famílias que estejam publicadas e elegíveis.
2. **Estética** — Romântica, Clássica, Intensa ou Etérea.
3. **Sensação desejada** — delicada, poderosa, atemporal ou mágica.
4. **Produção** — clean editorial, textura e detalhes, cenário elaborado ou ambientação imersiva.
5. **Looks** — uma estética, duas versões, três ou mais, ou experiência com outras pessoas.
6. **Faixa de investimento** — opções de faixa administradas a partir da realidade dos pacotes ativos; não revela o preço individual no resultado.

Cada tela exige uma escolha, oferece voltar sem perder respostas e atualiza progresso e acessibilidade. O carregamento do resultado será breve e apenas editorial; não deve simular análise por IA.

### Regra de recomendação

1. Selecionar somente pacotes ativos, publicados e elegíveis ao quiz da família escolhida.
2. Excluir pacotes cuja faixa interna seja incompatível com a faixa de investimento escolhida, quando houver opções compatíveis.
3. Pontuar os remanescentes por proximidade entre limite de looks, cenários/produção e participantes.
4. Em empate, preferir a menor experiência que atende às escolhas; isso evita sugerir um pacote superior sem necessidade.
5. Se não houver compatibilidade de faixa, sugerir o pacote mais próximo e informar de modo cuidadoso que a curadoria pode adaptar a experiência na conversa.

A estética e a sensação determinam persona, paleta, styling e texto de direção. Elas não devem substituir as condições concretas que definem o pacote.

### Resultado e paleta opcional

O resultado contém:

- nome e descrição da persona;
- paleta e orientação de styling/cenário;
- nome do pacote recomendado e justificativa;
- CTA de WhatsApp com o contexto completo;
- opção de refazer o quiz.

Para pacotes com fundo, cenário ou balões, o resultado abre uma escolha opcional de paleta inicial: tons claros e delicados, rosé e românticos, vibrantes e intensos, neutros e atemporais, ou “outra cor que imagino”. A última opção abre texto curto, sanitizado e com limite de tamanho.

A paleta não muda a indicação. Ela reduz atrito na conversa e, se a visitante converter, é uma referência inicial para o moodboard da área “Minha Experiência”.

### Persistência e privacidade

Na primeira entrega, o resultado pode gerar o CTA contextual sem exigir login. A persistência posterior deve registrar o conjunto de respostas, pacote sugerido e paleta opcional em um lead identificado, ou vinculá-los ao cliente autenticado quando houver sessão. Não registrar preço como dado exibido publicamente.

O texto do WhatsApp deve carregar tipo de ensaio, persona, produção, looks, faixa escolhida, pacote recomendado e paleta, para que a equipe não peça as mesmas informações outra vez.

## Admin

O módulo de pacotes terá:

- lista com família, pacote, preço-base interno, looks, status e publicação;
- criação e edição de família;
- criação e edição de pacote, com validação de números positivos e preço decimal;
- ações de ativar/desativar, publicar/despublicar e habilitar/desabilitar para o quiz;
- proteção para que pacotes vinculados a ensaios sejam apenas desativados, nunca apagados de forma destrutiva;
- ordenação de famílias e pacotes que reflita a jornada comercial.

As rotas de criação de ensaio do admin continuarão consultando apenas pacotes ativos. O quiz consultará uma projeção pública, sem expor preço-base ou dados operacionais no browser.

## Fora deste marco

- Página pública individual para cada nova família ainda não lançada.
- Exibição de preço exato fora da experiência do quiz.
- Cobrança, reserva ou agendamento automático.
- IA generativa para recomendação.
- Migração automática de todos os layouts antigos de artes para páginas do site.

## Critérios de aceite

- Admin cadastra e edita famílias e pacotes sem código.
- Pacotes inativos não aparecem em criação de ensaio nem no quiz; histórico existente permanece íntegro.
- O quiz começa pelo tipo de ensaio, tem seis escolhas principais e recomenda apenas pacote da família selecionada.
- A recomendação considera, no mínimo, faixa de investimento e quantidade de looks/trocas.
- Resultado explica a recomendação, não exibe preço individual e gera WhatsApp contextual.
- A paleta opcional aparece apenas quando aplicável e é preservada no contexto enviado.
