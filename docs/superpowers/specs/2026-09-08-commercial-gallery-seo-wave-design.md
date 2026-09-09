# Onda comercial, galeria e SEO — design

**Data:** 2026-09-08  
**Escopo:** SCL-253, SCL-254, SCL-502 e SCL-406

## Objetivo

Fechar o funil comercial depois do Lead ganho, permitir a operação e publicação controlada de galerias privadas e ativar a fundação de lançamento para descoberta e medição do site.

## Decisões confirmadas

- Um Lead ganho só é convertido após o Admin escolher explicitamente um Cliente existente compatível ou confirmar a criação de um novo Cliente. Coincidências de e-mail ou telefone nunca criam vínculo automático.
- A Galeria fica disponível para a cliente imediatamente quando o Admin altera seu status para `published`.
- O Google Analytics 4 será configurado com a propriedade `G-0YX9SRS1Y7`, preferencialmente por variável pública de ambiente com esse valor na configuração de produção.

## SCL-253 — Lead para Cliente

### Fluxo

1. A ficha de um Lead com status `ganho` mostra a ação de conversão.
2. O servidor procura Clientes compatíveis por e-mail e telefone normalizados.
3. A interface apresenta os candidatos encontrados e exige uma decisão: selecionar um Cliente existente ou criar um novo.
4. A ação valida novamente o Lead, o status e a decisão no servidor.
5. A conversão grava auditoria com ator, Lead de origem e Cliente de destino. Repetições retornam o Cliente já vinculado, sem duplicar dados.

### Dados e segurança

- A relação Lead–Cliente será persistida de forma explícita e única para garantir idempotência.
- Apenas `staff` e `admin` podem pesquisar candidatos ou concluir a conversão.
- As ações nunca retornam listas de contato ou dados sensíveis a rotas públicas.

## SCL-254 — Cliente para ensaio/reserva

### Fluxo

1. Após a conversão, a ficha do Lead apresenta a criação de ensaio/reserva para o Cliente vinculado.
2. O Admin informa experiência, data/hora, local, endereço quando aplicável e valor acordado.
3. A ação reutiliza a regra de reserva existente, confirma que o Lead está ganho e que há Cliente vinculado e registra a auditoria de origem.
4. Reenvios não criam ensaios duplicados para a mesma conversão e mesma solicitação.

## SCL-502 — Gestão e publicação de galeria

### Fluxo

1. Em um ensaio elegível, o Admin cria ou abre a Galeria privada.
2. O upload aceita somente formatos de imagem permitidos, gera caminhos no bucket privado e registra ativos na Galeria.
3. O Admin pode ordenar e remover ativos ainda privados.
4. Ao marcar a Galeria como `published`, a leitura autorizada no portal da cliente passa a exibir imediatamente os ativos publicados.

### Limites

- Não há URL pública, download, favoritos, reveal separado, venda adicional ou upload por cliente nesta onda.
- Upload, ordenação, remoção e publicação são restritos a `staff` e `admin`.
- A cliente só recebe URLs temporárias geradas no servidor após a Galeria publicada e a verificação de que o ensaio pertence a ela.

## SCL-406 — SEO técnico e GA4

- Criar `robots.txt` e sitemap dinâmico somente para rotas públicas indexáveis.
- Consolidar metadata canônica, Open Graph e Twitter nas páginas públicas prioritárias.
- Carregar GA4 somente no site público, com Measurement ID em `NEXT_PUBLIC_GA_MEASUREMENT_ID`; a configuração de produção recebe `G-0YX9SRS1Y7`.
- A camada atual de eventos públicos despacha para `gtag` quando disponível e continua no-op sem o identificador; os eventos não carregam PII.
- Rotas Admin, Cliente, Quiz de dados e conteúdo privado ficam fora do sitemap e sem indexação.

## Testes e validação

- Domínio de conversão: duplicidade, Lead não ganho, seleção explícita, auditoria e idempotência.
- Admin: bloqueio de usuário não autorizado, candidatos de match e criação de ensaio a partir do Cliente vinculado.
- Galeria: autorização, tipos permitidos, ordenação, remoção, publicação e leitura privada no portal.
- SEO/GA4: sitemap/robots, metadata, carregamento condicional e eventos sem PII.
- Executar testes focados, typecheck, lint, validação de migration quando aplicável e build de produção antes da publicação.

## Fora do escopo

- Automações de e-mail, downloads, favoritos, reveal, upsells, acervo, avaliações e indicações.
