# PRD — Stúdio Carol Lucas Experience + Studio OS

**Versão:** 1.1 — revisão de cobertura funcional  
**Status:** Em desenvolvimento — escopo revisado para fechamento do MVP  
**Domínio:** `studiocarollucas.com.br`  
**Produto:** Site público + Minha Experiência + Studio OS / Admin  
**Protótipo de referência:** `studio-carol-lucas-prototipo-v2.3-studio-os.html`  
**Documento de modelagem de referência:** `studio-carol-lucas-v2.3-modelo-dados.md`  
**Revisão de escopo:** 07/09/2026 — incorpora gaps identificados após implementação avançada do Studio OS/Portal

---

## 1. Resumo executivo

O Stúdio Carol Lucas já possui uma operação consolidada de fotografia e deseja elevar a percepção de marca, experiência da cliente, ticket médio e eficiência operacional.

O produto a ser desenvolvido não deve ser tratado apenas como um novo site. Ele será uma plataforma integrada em três ambientes que compartilham a mesma base de dados:

1. **Site público** — posicionamento, portfólio, descoberta e conversão.
2. **Minha Experiência** — portal autenticado da cliente antes, durante e depois do ensaio.
3. **Studio OS / Admin** — sistema interno de gestão do estúdio.

O princípio central é evitar controles desconectados. Cliente, ensaio, pagamentos, preparação, produção, galeria e pós-venda devem fazer parte de uma única jornada e de um único modelo de dados.

### Visão do produto

> O Stúdio Carol Lucas não entrega apenas um ensaio. Entrega uma experiência que começa antes da câmera e continua depois das fotos.

### Princípio operacional

> Nunca criar telas que mantenham cópias independentes do mesmo dado. Agenda, financeiro, produção, portal da cliente e galeria devem ser diferentes visões das mesmas entidades.

### Revisão 1.1 — fechamento de cobertura

Esta revisão não invalida o que já foi implementado. Ela explicita capacidades que estavam presentes no conceito/protótipo, mas não tinham backlog operacional completo:

- **Acervo físico** de figurinos, clutches, acessórios e props;
- **Paixão Clutch** como parte do styling e como oferta pública complementar;
- **Funil comercial** sobre a entidade `Lead`, incluindo conversão para Cliente/Ensaio;
- **Persistência consentida do Quiz** e continuidade do resultado no CRM/portal;
- **Galeria/Reveal completos**, favoritos, download e pós-venda;
- **Upsells** após o ensaio;
- **Automações de comunicação** (boas-vindas, D-7, D-1, Reveal, review);
- **Reviews e indicações** como loops de crescimento;
- **SEO/Analytics** como requisito explícito do site público.

O objetivo desta revisão é impedir que o MVP seja considerado concluído apenas porque o núcleo Admin/Portal está pronto. A entrega final deve cobrir também conversão, acervo, entrega e pós-venda.

---

## 2. Objetivos de negócio

### 2.1 Objetivos primários

- Elevar a percepção premium da marca.
- Aumentar o ticket médio por ensaio.
- Melhorar a conversão de visitantes e leads.
- Criar uma experiência diferenciada antes e depois do ensaio.
- Centralizar a operação hoje distribuída entre planilhas e comunicação manual.
- Reduzir retrabalho e duplicidade de cadastro.
- Melhorar controle financeiro e de produção.
- Criar histórico de relacionamento por cliente.
- Aumentar upsell, recompra, indicação e avaliações.

### 2.2 Indicadores que o produto deverá permitir medir

**Comercial**
- leads por origem;
- conversão lead → reserva;
- tempo médio até fechamento;
- ticket médio por experiência;
- motivos de perda.

**Operação**
- ensaios por mês;
- ocupação por data/horário;
- status de preparação;
- prazo médio de edição;
- entregas dentro do SLA;
- gargalos por etapa.

**Financeiro**
- faturado;
- recebido;
- a receber;
- receita por experiência;
- despesas;
- resultado operacional;
- receita de upsells.

**Relacionamento**
- clientes recorrentes;
- receita acumulada por cliente;
- indicações;
- reviews;
- recompra.

---

## 3. Usuários e papéis

### 3.1 Visitante

Pessoa ainda não autenticada que acessa o site, portfólio e quiz.

### 3.2 Lead

Pessoa identificada por formulário, quiz, WhatsApp ou outro canal, mas que ainda não possui uma reserva confirmada.

### 3.3 Cliente

Pessoa com um ou mais ensaios vinculados e acesso a **Minha Experiência**.

### 3.4 Staff

Pessoa da equipe com acesso operacional a clientes, ensaios, produção e informações necessárias à função.

### 3.5 Admin

Usuário interno com acesso administrativo completo, incluindo financeiro, configurações, catálogo, usuários e auditoria.

### 3.6 Regra de permissão

A autorização deve ser validada no servidor e na camada de dados. Esconder componentes na interface não constitui controle de acesso.

---

## 4. Ambientes do produto

| Ambiente | Objetivo | Acesso |
|---|---|---|
| Site público | Marca, portfólio, quiz, SEO e conversão | Público |
| Minha Experiência | Preparação, styling, agenda, Reveal, galeria e relacionamento | Cliente autenticada |
| Studio OS / Admin | CRM, agenda, financeiro, produção, acervo e gestão | Equipe autorizada |

Todos os ambientes deverão usar o mesmo backend e a mesma fonte de verdade.

---

# 5. Escopo do MVP

## 5.1 Site público

### Páginas iniciais

- Home.
- Ensaios / experiências.
- Ensaio de aniversário.
- 15 anos.
- Gestante.
- Família.
- **Paixão Clutch / acervo de clutches.**
- Página de descoberta de estilo / quiz.
- Contato / WhatsApp.
- Política de privacidade.
- Termos aplicáveis ao portal e imagens.

### Requisitos

- Design editorial premium baseado no protótipo V2.3.
- Mobile-first.
- Fotos reais deverão substituir gradualmente as imagens ilustrativas do protótipo.
- Preço não deve ser exibido publicamente no MVP, salvo decisão posterior de negócio.
- CTA principal orientado a experiência/conversa, não a comparação de preço.
- Links para WhatsApp devem carregar contexto quando possível.
- SEO técnico correto: metadata, sitemap, robots, canonical e dados estruturados quando aplicável.
- Integração com analytics.
- A Paixão Clutch deve aparecer como parte do ecossistema de styling do estúdio e possuir CTA próprio para consulta de disponibilidade/aluguel.
- O catálogo público de clutches não deve depender de preços públicos; disponibilidade e preço podem ser tratados no contato comercial.

---

## 5.2 Quiz — Descubra sua estética

### Objetivo

Criar engajamento e qualificar o lead antes do contato comercial.

### MVP

- 6 perguntas conforme protótipo.
- Resultado baseado em motor de regras, sem necessidade de IA generativa.
- Personas iniciais:
  - Romântica;
  - Clássica;
  - Intensa;
  - Etérea.
- Recomendar uma experiência sem exibir preço público.
- Explicar o motivo da recomendação.
- Permitir levar o resultado para WhatsApp.
- Com consentimento, persistir o resultado como dado de qualificação do `Lead`.
- A persistência deve registrar origem, persona, respostas relevantes e consentimento, sem criar `Client` prematuramente.
- Ao converter o Lead em Cliente/Ensaio, reaproveitar o resultado em **Minha Experiência** e no styling.

### Não utilizar no copy principal

A tecnologia não deve ser vendida como “IA” quando o recurso for somente motor de regras.

---

## 5.3 Autenticação

### Cliente

Preferência por autenticação passwordless:

- Magic Link por e-mail; ou
- OTP por e-mail.

### Staff/Admin

- E-mail + senha inicialmente.
- Arquitetura preparada para MFA posteriormente.

### Requisitos

- Sessão segura.
- Logout.
- Expiração adequada.
- RBAC.
- Proteção server-side das rotas privadas.
- RLS no banco para dados de clientes sempre que aplicável.

---

# 6. Minha Experiência — Área da Cliente

## 6.1 Home da cliente

Ao acessar, a cliente deverá ver:

- nome;
- experiência contratada;
- data do ensaio;
- countdown quando aplicável;
- próximo passo;
- progresso da preparação;
- resumo de pendências;
- moodboard / referências;
- comunicação ou dica contextual do estúdio;
- atalhos para styling, agenda e galeria.

### Princípio UX

Mostrar prioritariamente o que a cliente precisa fazer naquele momento. Não transformar o portal em um painel administrativo para a cliente.

---

## 6.2 Preparação

Checklist por ensaio.

Exemplos:

- moodboard;
- escolha de figurinos;
- clutch;
- referência de make;
- confirmação de horário;
- pagamento pendente;
- informações específicas do tipo de ensaio.

Cada tarefa deverá possuir:

- status;
- prazo opcional;
- visibilidade para cliente;
- data de conclusão.

---

## 6.3 Styling e Acervo selecionável

MVP:

- referências colaborativas de figurinos, make e cenário;
- seleção de **itens reais do acervo** do estúdio;
- figurinos, clutches, acessórios e props com fotos próprias;
- diferenciar claramente **referência de inspiração** de **item físico reservado**;
- permitir que a equipe vincule itens do acervo ao ensaio;
- permitir que a cliente visualize e, quando habilitado, sinalize preferências;
- salvar preferências e reservas na mesma entidade de ensaio;
- detectar indisponibilidade/conflito de reserva antes da confirmação de um item.

### Regra de produto

`StylingReference`/moodboard não substitui `InventoryItem`. Uma foto de inspiração pode não existir fisicamente no estúdio; um figurino ou clutch do acervo precisa possuir identidade, status e disponibilidade próprios.

### Virtual Try-On

**Fora do P0/P1.**

Pode ser implementado futuramente como “Prévia de Styling” após validação de custo, qualidade, privacidade e consentimento para processamento de imagem por terceiros.

---

## 6.4 Meu ensaio

Mostrar:

- data;
- horário;
- experiência;
- localização;
- orientações;
- status de preparação;
- contato com o estúdio.

---

## 6.5 Reveal e Galeria

### Objetivo

Transformar a entrega em continuação da experiência, evitando uma entrega fria por link/pasta.

### MVP

- schema de Gallery/GalleryAsset desacoplado do provider de storage;
- upload/publicação pela equipe;
- página de Reveal;
- foto de capa;
- título/mensagem personalizada;
- acesso à galeria privada;
- favoritos/seleção;
- controle de download quando permitido;
- estado de publicação;
- pós-entrega;
- eventos de publicação/entrega para automações.

### Upsells do MVP de lançamento

A galeria é também um segundo ponto de conversão. O produto deve permitir cadastrar e ofertar, ao menos:

- fotos adicionais;
- coleção completa;
- álbum;
- impressão/quadro;
- Reel/Stories;
- outros produtos configuráveis.

O pedido de upsell deve possuir status, valor e vínculo com o ensaio. A cobrança pode inicialmente reutilizar o fluxo financeiro/manual existente; gateway online não é requisito do MVP.

A infraestrutura de galeria pode ser própria ou integrada a um provider. O modelo de dados não deve ficar acoplado a um único fornecedor.

---

# 7. Studio OS / Admin

## 7.1 Dashboard

KPIs iniciais:

- ensaios do período;
- faturado;
- recebido;
- a receber;
- despesas;
- resultado;
- ticket médio;
- produção em andamento;
- ensaios finalizados;
- entregas próximas/atrasadas;
- ações que exigem atenção.

O dashboard deve ser calculado a partir dos dados normalizados. Não armazenar indicadores derivados como fonte primária.

---

## 7.2 Clientes / CRM

### Ficha única da cliente

Deverá permitir consultar:

- dados pessoais;
- contato;
- Instagram;
- aniversário;
- origem;
- indicação;
- estilo/perfil;
- observações;
- consentimentos;
- histórico de ensaios;
- receita acumulada;
- pagamentos;
- reviews;
- indicações;
- oportunidades futuras.

Uma cliente pode possuir múltiplos ensaios ao longo do tempo.

---

## 7.3 Leads

Status iniciais:

- Novo;
- Contato;
- Proposta;
- Negociação;
- Ganho;
- Perdido.

Campos relevantes:

- origem;
- ocasião;
- resultado do quiz;
- responsável;
- motivo de perda;
- observações.

A conversão de Lead para Cliente deve reaproveitar o registro, evitando novo cadastro manual.

### Interface operacional obrigatória

O fato de o schema `Lead` existir não caracteriza o funil como entregue. O Studio OS deve possuir:

- lista/funil de Leads;
- ficha do Lead;
- mudança de estágio com auditoria;
- filtros por origem/status/responsável;
- resultado do quiz quando houver consentimento;
- conversão `Lead → Client`;
- criação/reserva de `Shoot` a partir do Lead ganho;
- motivo de perda obrigatório/recomendado ao marcar `Perdido`.

---

## 7.4 Agenda & Ensaios

O **Shoot/Ensaio** é a entidade operacional central.

### Cadastro de ensaio

Campos iniciais:

- cliente;
- experiência/pacote;
- data;
- horário;
- status;
- valor acordado;
- participantes;
- ocasião;
- origem/indicação;
- observações;
- acesso ao portal.

### Criação de ensaio confirmado

Deve ser capaz de gerar automaticamente:

1. registro do ensaio;
2. checklist inicial de preparação;
3. ProductionJob em `Aguardando`;
4. acesso da cliente ao portal;
5. eventos/automação de boas-vindas;
6. vínculo com financeiro sem duplicar valores.

### Agenda

- visão por lista no MVP;
- filtro por data/status/pacote;
- busca por cliente;
- arquitetura preparada para calendário posteriormente.

---

## 7.5 Financeiro

### Regra fundamental

Nunca existir uma “entrada” na ficha do ensaio e outra receita digitada manualmente como se fossem fontes independentes.

### Payment

Campos:

- ensaio;
- valor;
- data;
- forma;
- status;
- comprovante;
- observações.

### Saldo

Deve ser derivado:

`saldo = valor_acordado - soma(pagamentos_confirmados)`

### Status financeiro sugerido

- Não iniciado;
- Parcial;
- Pago;
- Reembolsado;
- Cancelado.

### Expense

Campos:

- data;
- tipo;
- categoria;
- valor;
- método;
- recorrência;
- comprovante;
- observações.

### Conciliação de migração

A primeira importação da planilha deverá possuir etapa explícita de revisão para divergências.

Divergências já identificadas no controle de referência:

1. Maria Silva: valor recebido diverge entre Ensaios e Financeiro.
2. Joana Lopes: existe entrada em Ensaios sem lançamento correspondente no Financeiro.
3. Paula Mendes: aparece em Edição sem ficha equivalente de Ensaio.
4. O saldo da planilha utiliza fórmula inconsistente para pagamentos parciais.
5. Dashboard da planilha não deverá ser migrado como fonte de verdade.

---

## 7.6 Produção & Edição

Cada ensaio confirmado deverá gerar um `ProductionJob`.

### Status

1. `Aguardando`
2. `Iniciado`
3. `Parcial`
4. `Finalizado`
5. `Entregue`

### Campos

- ensaio;
- editor;
- quantidade de fotos;
- prazo de entrega;
- data real;
- status de seleção;
- observações.

### Regras

- `Finalizado` deve permitir/preparar publicação do Reveal.
- `Entregue` deve habilitar ações de pós-venda, review e indicação.
- alterações devem refletir no portal da cliente quando relevantes.

---

## 7.7 Catálogo de experiências

Experiências iniciais:

- Cinderela;
- Bella;
- Aurora;
- Diana.

Campos iniciais:

- nome;
- preço-base interno;
- fotos incluídas;
- duração;
- cenários;
- make;
- limite de figurinos;
- clutch;
- ativo/inativo.

O preço-base é interno e pode diferir do valor acordado em cada ensaio.

---

## 7.8 Acervo físico — P1 do fechamento do MVP

O acervo deixa de ser apenas preparação futura e passa a fazer parte do MVP de lançamento, pois participa diretamente da proposta premium e da Paixão Clutch.

### Tipos iniciais

- figurino;
- clutch;
- acessório;
- prop;
- cenário/item de cenário quando fizer sentido controlar disponibilidade.

### `InventoryItem` — campos mínimos

- id/código interno;
- tipo;
- nome;
- descrição;
- cor/paleta;
- tamanho quando aplicável;
- fotos/mídia;
- status (`disponivel`, `reservado`, `manutencao`, `inativo`);
- preço de aluguel interno quando aplicável;
- ativo/inativo;
- observações.

### Reserva

Um `InventoryItem` pode ser vinculado/reservado para um ensaio por `InventoryReservation`.

Requisitos:

- intervalo/data de reserva;
- vínculo com Shoot;
- status da reserva;
- checagem de conflito;
- histórico;
- liberação/cancelamento.

### Paixão Clutch

Paixão Clutch deve ser tratada simultaneamente como:

1. parte do styling dos ensaios Carol Lucas;
2. categoria do acervo físico;
3. oferta pública complementar no site.

No MVP público, permitir visualizar uma curadoria de clutches e consultar disponibilidade via WhatsApp. O fluxo completo de aluguel avulso (retirada/devolução/caução) pode ser uma evolução P2, mas o modelo não deve impedir esse uso.

---

## 7.9 Automações e notificações — P1 do fechamento do MVP

### Infra mínima

- camada de eventos/outbox ou mecanismo equivalente;
- templates versionados;
- Resend como primeiro provider de e-mail;
- log de tentativa/entrega/falha;
- retry seguro/idempotente;
- scheduler para comunicações temporais.

### Fluxos obrigatórios

- reserva confirmada / boas-vindas;
- D-7;
- D-1;
- produção finalizada quando houver comunicação pertinente;
- galeria/Reveal publicado;
- entrega concluída;
- pedido de avaliação após entrega.

Eventos importantes:

- reserva confirmada;
- pagamento registrado;
- D-7;
- D-1;
- produção finalizada;
- galeria publicada;
- entrega concluída;
- review solicitado/concluído.

### Comportamentos futuros

**Reserva confirmada**
- habilitar Minha Experiência;
- criar checklist;
- enviar boas-vindas.

**Pagamento registrado**
- recalcular saldo;
- atualizar status financeiro;
- liberar etapas condicionadas quando aplicável.

**Produção finalizada**
- criar ação de Reveal;
- atualizar portal.

**Galeria publicada**
- enviar comunicação;
- habilitar favoritos/upsells.

**Entrega concluída**
- solicitar review;
- registrar oportunidade de indicação/recompra.

---

## 7.10 Reviews, indicação e recorrência

A experiência não termina na entrega. O sistema deve fechar o ciclo de relacionamento.

### Review

- registrar quando o pedido foi enviado;
- registrar conclusão quando conhecida;
- armazenar origem/destino do review quando aplicável;
- CTA prioritário para Google Business Profile ou canal configurado;
- não pedir review antes da entrega/Reveal.

### Referral

- manter quem indicou quem;
- distinguir indicação informada de indicação convertida;
- permitir medir clientes e receita por indicação.

### Recorrência

O CRM deve manter histórico de ensaios e suportar oportunidades futuras (aniversário, família, gestante/newborn etc.). Programa formal de fidelidade/benefícios progressivos permanece pós-MVP.

---

# 8. Modelo de dados inicial

Entidades prioritárias:

```text
User / Profile
Role
Client
Lead
ExperiencePackage
Shoot
Payment
Expense
PreparationTask
ProductionJob
Gallery
GalleryAsset
PhotoSelection
UpsellProduct
UpsellOrder
UpsellOrderItem
InventoryItem
InventoryReservation
Review
Referral
AutomationEvent
NotificationDelivery
AuditLog
```

Entidades posteriores:

```text
StandaloneClutchRental
NotificationPreference
VirtualTryOnRequest
LoyaltyAccount / LoyaltyBenefit
```

### Relacionamentos principais

```text
Client 1 ─── N Shoot
Client 1 ─── N Lead
ExperiencePackage 1 ─── N Shoot
Shoot 1 ─── N Payment
Shoot 1 ─── N PreparationTask
Shoot 1 ─── 1 ProductionJob
Shoot 1 ─── 0..1 Gallery
Gallery 1 ─── N GalleryAsset
Gallery 1 ─── N PhotoSelection
Shoot 1 ─── N UpsellOrder
Shoot 1 ─── N InventoryReservation
InventoryItem 1 ─── N InventoryReservation
Client 1 ─── N Review
Client 1 ─── N Referral
AutomationEvent 1 ─── N NotificationDelivery
```

IDs devem ser estáveis e não depender de nome/e-mail como chave natural.

---

# 9. Estados de domínio

## 9.1 Lead

```text
Novo → Contato → Proposta → Negociação → Ganho
                                  └──────→ Perdido
```

## 9.2 Ensaio

Sugestão inicial:

```text
Reserva → Preparação → Realizado → Edição → Finalizado → Reveal → Entregue
```

Estados adicionais podem existir para:

- Cancelado;
- Reagendado.

Evitar representar conceitos diferentes no mesmo status. Ex.: status financeiro deve ser separado do status do ensaio.

## 9.3 Produção

```text
Aguardando → Iniciado → Parcial → Finalizado → Entregue
```

## 9.4 Pagamento

```text
Não iniciado → Parcial → Pago
                    ├──→ Reembolsado
                    └──→ Cancelado
```

---

# 10. Stack técnica recomendada

## 10.1 Aplicação

- **Next.js** em versão estável/LTS aprovada no início da implementação.
- React.
- TypeScript em modo strict.
- App Router.
- Server Components por padrão quando adequado.
- Route Handlers / Server Actions para operações server-side.

## 10.2 UI

- Tailwind CSS.
- CSS variables / design tokens próprios do Stúdio Carol Lucas.
- shadcn/ui prioritariamente para componentes administrativos.
- Site público deve preservar direção editorial própria e evitar aparência genérica de SaaS.

## 10.3 Dados

- Supabase PostgreSQL.
- Drizzle ORM.
- Migrations versionadas no repositório.
- Zod para validação de entrada e schemas compartilhados quando conveniente.

## 10.4 Auth

- Supabase Auth.
- Passwordless para cliente.
- RBAC para equipe/admin.
- RLS.

## 10.5 Storage

### Supabase Storage

Uso inicial:

- avatar;
- comprovantes;
- imagens leves de catálogo;
- thumbnails/documentos pequenos.

### Cloudflare R2

Planejado para:

- galerias;
- fotos em alta;
- vídeos;
- arquivos pesados.

A aplicação deve encapsular acesso ao storage para não espalhar dependência do provider pelo domínio.

## 10.6 E-mail

- Resend.
- Templates versionados.

Sugestões de remetente:

- `ola@studiocarollucas.com.br`
- `experiencia@studiocarollucas.com.br`

## 10.7 Deploy

- Domínio registrado na Hostinger.
- Deploy inicial em Vercel.
- Preview deployments para PRs.
- Produção deve usar plano/infra compatível com uso comercial.

## 10.8 Observabilidade

- Sentry para erros.
- logs estruturados para operações críticas.
- GA4 + Search Console para site público.

## 10.9 Futuro

Não bloquear implementação por estas integrações no MVP:

- Trigger.dev;
- WhatsApp Cloud API;
- gateway de pagamento;
- IA contextual;
- virtual try-on.

---

# 11. Organização recomendada do repositório

```text
studio-carol-lucas/
├── app/
│   ├── (site)/
│   ├── (client)/
│   ├── admin/
│   └── api/
│
├── components/
│   ├── site/
│   ├── client/
│   ├── admin/
│   └── ui/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
│
├── domain/
│   ├── clients/
│   ├── leads/
│   ├── shoots/
│   ├── payments/
│   ├── production/
│   ├── preparation/
│   └── galleries/
│
├── lib/
│   ├── auth/
│   ├── supabase/
│   ├── r2/
│   ├── email/
│   ├── analytics/
│   └── observability/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── TASKS.md
│   ├── DECISIONS.md
│   └── runbooks/
│
└── tests/
```

Evitar microserviços no MVP.

---

# 12. Segurança, privacidade e LGPD

## Obrigatório no MVP

- TLS/HTTPS.
- segredos apenas em secret manager/environment variables.
- nunca expor service role keys ao browser.
- RLS onde dados da cliente forem acessados diretamente via Supabase.
- URLs privadas/assinadas para arquivos sensíveis.
- validação server-side de uploads.
- controle de tipo e tamanho de arquivo.
- logs sem dados sensíveis desnecessários.
- trilha de auditoria para operações críticas.
- consentimento de marketing separado de consentimentos operacionais quando aplicável.
- política de retenção/exclusão de dados e imagens a definir antes da produção completa.

## Virtual Try-On futuro

Antes da implementação:

- definir provider;
- revisar política de processamento da imagem;
- consentimento explícito;
- retenção;
- exclusão;
- informar que a imagem é simulação.

---

# 13. Importação da planilha existente

A planilha é origem temporária para migração, não modelo de domínio.

### Mapeamento

- Ensaios → Client + Shoot.
- Financeiro → Payment + Expense.
- Edição → ProductionJob.
- Pacotes → ExperiencePackage.
- Dashboard → não migrar como dado.

### Processo

1. importar para staging;
2. validar formato;
3. detectar duplicidades;
4. gerar relatório de divergências;
5. conciliar registros;
6. somente então persistir como dados oficiais;
7. manter arquivo original como evidência de migração.

Não corrigir silenciosamente divergências.

---

# 14. Requisitos não funcionais

## Performance

- páginas públicas otimizadas para Core Web Vitals;
- imagens responsivas e otimizadas;
- lazy loading onde adequado;
- queries paginadas em listas administrativas.

## Mobile

- site e portal da cliente mobile-first;
- Admin deve ser utilizável em notebook e tablet;
- ações rápidas do Admin devem continuar possíveis no celular, mesmo que dashboards complexos sejam desktop-first.

## Acessibilidade

- contraste adequado;
- navegação por teclado em componentes críticos;
- labels em formulários;
- alt text para conteúdo editorial quando aplicável;
- foco visível.

## Confiabilidade

- transações ou operações atômicas para fluxos financeiros relevantes;
- idempotência em webhooks/eventos futuros;
- migrations reversíveis quando viável;
- backups de banco configurados conforme plano de produção.

## Manutenibilidade

- TypeScript strict;
- lint/format automatizados;
- testes para regras de negócio;
- nenhuma regra financeira importante somente no frontend.

---

# 15. Estratégia de testes

## Unitários

Prioridade para:

- cálculo de saldo;
- status financeiro;
- transições de produção;
- recomendação do quiz;
- permissões de domínio;
- regras de conciliação/importação.

## Integração

- criação de ensaio;
- registro de pagamento;
- criação de ProductionJob;
- portal da cliente lendo o mesmo ensaio;
- publicação de galeria;
- eventos de automação.

## E2E

Fluxos mínimos:

1. Admin cria cliente/ensaio → cliente acessa Minha Experiência.
2. Admin registra pagamento → saldo/status atualizam.
3. Produção avança → portal reflete estado correto.
4. Galeria é publicada → cliente visualiza Reveal.
5. Cliente favorita imagem → seleção persiste.

---

# 16. Critérios de aceite do MVP

## Fundação

- [ ] aplicação publicada em ambiente de preview;
- [ ] banco e migrations versionados;
- [ ] autenticação funcional;
- [ ] RBAC funcional;
- [ ] ambientes público/cliente/admin separados;
- [ ] CI executa lint, typecheck e testes.

## Clientes e ensaios

- [ ] criar cliente;
- [ ] editar cliente;
- [ ] criar ensaio vinculado;
- [ ] pesquisar e filtrar ensaios;
- [ ] abrir ficha única;
- [ ] histórico por cliente;
- [ ] nenhum dado financeiro duplicado manualmente em múltiplos módulos.

## Financeiro

- [ ] registrar pagamento;
- [ ] calcular saldo automaticamente;
- [ ] registrar despesa;
- [ ] dashboard recalcula indicadores;
- [ ] histórico preservado;
- [ ] operações críticas auditáveis.

## Produção

- [ ] ProductionJob criado por ensaio confirmado;
- [ ] Kanban funcional;
- [ ] transições validadas;
- [ ] prazo/editor/observações persistidos;
- [ ] Finalizado sinaliza Reveal;
- [ ] Entregue sinaliza pós-venda.

## Minha Experiência

- [ ] cliente só acessa seus próprios dados;
- [ ] dashboard mostra ensaio correto;
- [ ] preparação é conectada ao mesmo Shoot;
- [ ] status relevante do Admin reflete no portal;
- [ ] experiência mobile aprovada.

## Site

- [ ] layout baseado no protótipo aprovado;
- [ ] preços públicos ausentes;
- [ ] quiz funcional;
- [ ] CTA contextual para WhatsApp;
- [ ] SEO básico e analytics ativos.

---

# 17. Fora do escopo inicial

Não bloquear o MVP por:

- virtual try-on real;
- agente conversacional avançado;
- WhatsApp Cloud API completa;
- gateway de pagamentos;
- agendamento self-service com pagamento;
- gestão **avançada** de estoque (lavanderia, manutenção detalhada, depreciação, compras);
- aluguel avulso completo da Paixão Clutch com caução, retirada e devolução automatizadas;
- app mobile nativo;
- multi-tenant/SaaS para outros estúdios;
- edição de fotografia dentro do sistema.

A arquitetura não deve inviabilizar esses recursos futuros.

---

# 18. Fases sugeridas

## P0 — Fundação — majoritariamente concluída

- setup do repositório;
- Next.js/TypeScript/Tailwind;
- Supabase;
- Drizzle;
- ambientes;
- Auth;
- RBAC/RLS;
- schema inicial;
- CI/CD;
- observabilidade básica.

## P1A — Operação e Portal — majoritariamente concluída

- Client;
- ExperiencePackage;
- Shoot;
- Payment/Expense;
- dashboard;
- agenda;
- CRM de clientes;
- ProductionJob/Kanban;
- PreparationTask;
- Minha Experiência conectada;
- styling/referências colaborativas;
- contratos privados.

## P1B — Fechamento funcional do MVP — obrigatório antes de declarar produto completo

- UI de Leads e conversão `Lead → Client → Shoot`;
- persistência consentida do Quiz;
- Paixão Clutch pública;
- acervo físico e reservas por ensaio;
- seleção de figurinos/clutches reais no styling;
- Gallery/GalleryAsset + publicação;
- Reveal;
- favoritos/seleção/download;
- upsell pós-ensaio;
- automações de e-mail (boas-vindas, D-7, D-1, Reveal, review);
- review/indicação;
- SEO/Analytics e eventos de conversão.

## P2 — Crescimento

- timeline mais rica da jornada da cliente;
- aluguel avulso Paixão Clutch ponta a ponta;
- WhatsApp Cloud API;
- checkout/gateway;
- automações comerciais avançadas;
- calendário visual e capacidade;
- relatórios de conversão/coortes.

## P3 — Inteligência e fidelização

- Prévia de Styling / Virtual Try-On;
- assistente contextual de preparação;
- agente de dúvidas;
- programa de fidelidade;
- recomendações inteligentes de acervo/upsell.

---

# 19. Protocolo obrigatório para desenvolvimento com agentes em paralelo

Esta seção é **normativa**. Deve ser adotada caso mais de um desenvolvedor/agente execute tarefas simultaneamente.

## 19.1 Fonte de verdade das tarefas

Criar no primeiro commit:

```text
docs/TASKS.md
```

Opcionalmente, usar GitHub Issues/Projects como interface visual, mas `docs/TASKS.md` deve permanecer como snapshot legível pelo repositório e por agentes.

Nenhum agente inicia desenvolvimento sem possuir uma Task ID.

---

## 19.2 Status permitidos

Usar **exatamente** estes estados:

```text
BACKLOG
READY
CLAIMED
IN_PROGRESS
BLOCKED
IN_REVIEW
CHANGES_REQUESTED
MERGE_READY
DONE
DEFERRED
CANCELLED
```

### Significado

**BACKLOG**  
Tarefa conhecida, ainda não refinada/priorizada.

**READY**  
Especificação e dependências suficientes para execução.

**CLAIMED**  
Um agente assumiu a tarefa, mas ainda não começou a alterar código.

**IN_PROGRESS**  
Código sendo alterado ativamente.

**BLOCKED**  
Não pode prosseguir. Deve registrar motivo e Task ID da dependência quando existir.

**IN_REVIEW**  
Implementação concluída e PR aberto, aguardando revisão/testes.

**CHANGES_REQUESTED**  
Review encontrou alterações necessárias.

**MERGE_READY**  
Review, CI e critérios de aceite aprovados; pronto para merge.

**DONE**  
Merge concluído na branch principal e task validada.

**DEFERRED**  
Adiada conscientemente para fase posterior.

**CANCELLED**  
Não será executada.

---

## 19.3 Transições permitidas

Fluxo padrão:

```text
BACKLOG → READY → CLAIMED → IN_PROGRESS → IN_REVIEW → MERGE_READY → DONE
```

Fluxos alternativos:

```text
IN_PROGRESS → BLOCKED → READY/CLAIMED → IN_PROGRESS
IN_REVIEW → CHANGES_REQUESTED → IN_PROGRESS
BACKLOG/READY → DEFERRED
BACKLOG/READY → CANCELLED
```

Um agente **não deve marcar sua própria tarefa como DONE antes do merge**.

---

## 19.4 Formato obrigatório da task

Cada tarefa deve conter no mínimo:

```markdown
### SCL-XXX — Título curto

- Status: READY
- Priority: P0 | P1 | P2 | P3
- Area: auth | db | admin | client | site | finance | production | gallery | infra
- Owner: unassigned | human:<name> | agent:<id/name>
- Branch: —
- PR: —
- Depends on: SCL-000, ... | none
- Blocks: SCL-000, ... | none
- Files/Scope: app/admin/**, domain/shoots/**
- Migration: yes/no
- Updated at: YYYY-MM-DD HH:mm TZ

**Goal**
...

**Acceptance criteria**
- [ ] ...
- [ ] ...

**Implementation notes**
...

**Blocker/Hand-off notes**
...
```

---

## 19.5 Regra de claim

Antes de editar código, o agente deve:

1. atualizar a task de `READY` para `CLAIMED`;
2. preencher `Owner`;
3. preencher `Branch`;
4. declarar `Files/Scope` esperado;
5. verificar se outra task `CLAIMED` ou `IN_PROGRESS` está alterando os mesmos arquivos/entidades;
6. somente então mover para `IN_PROGRESS`.

Se houver overlap material, não iniciar silenciosamente: dividir task ou coordenar dependência.

---

## 19.6 Regra de ownership temporário

Uma task em `CLAIMED` ou `IN_PROGRESS` possui ownership temporário sobre seu escopo declarado.

### Áreas sensíveis que exigem coordenação explícita

- `db/schema/**`
- `db/migrations/**`
- configuração de Auth/RLS;
- arquivos globais de layout/design tokens;
- `package.json` / lockfile;
- configuração de CI;
- variáveis de ambiente compartilhadas;
- contratos públicos de API;
- tipos centrais de domínio.

Para essas áreas, evitar dois agentes trabalhando em paralelo sem uma task de integração/coordenação.

---

## 19.7 Regra especial para migrations

**Migrations são serializadas.**

Somente uma task com `Migration: yes` deve gerar uma migration de banco por vez, salvo coordenação explícita do tech lead.

Procedimento:

1. claim da task;
2. atualizar schema;
3. gerar migration;
4. testar contra banco limpo;
5. testar upgrade do estado anterior;
6. PR;
7. merge antes de nova migration conflitante.

Nunca renumerar, editar ou apagar migration já mergeada para “facilitar” conflito.

---

## 19.8 Branches

Convenção recomendada:

```text
feat/SCL-123-shoot-create
fix/SCL-205-payment-balance
chore/SCL-010-ci
```

Uma branch deve representar preferencialmente uma task principal.

Evitar branches gigantes agrupando módulos independentes.

---

## 19.9 Commits

Incluir Task ID:

```text
SCL-123: create shoot service
SCL-123: add shoot form validation
```

Commits devem ser pequenos e semanticamente coerentes.

---

## 19.10 Pull Requests

Título:

```text
[SCL-123] Criar ensaio e ProductionJob
```

Descrição mínima:

- problema/objetivo;
- solução;
- screenshots quando houver UI;
- migrations;
- variáveis de ambiente novas;
- testes executados;
- riscos;
- checklist dos acceptance criteria;
- tasks dependentes desbloqueadas pelo merge.

---

## 19.11 Hand-off entre agentes

Quando um agente encerrar a sua janela de execução sem finalizar a task, deve atualizar **Blocker/Hand-off notes** com:

- o que foi concluído;
- o que falta;
- decisões tomadas;
- arquivos alterados;
- comandos relevantes;
- testes que passaram/falharam;
- próximo passo exato.

Não deixar estado crítico apenas no contexto da conversa do agente.

---

## 19.12 Atualização de status

Status deve ser atualizado:

- antes de iniciar;
- quando houver blocker;
- ao abrir PR;
- ao receber changes requested;
- ao ficar merge-ready;
- após merge.

Agentes não devem trabalhar por longos períodos com task ainda marcada como `READY`.

---

## 19.13 Dependências

Uma task `READY` deve possuir dependências resolvidas.

Exemplo:

```text
SCL-101 Schema Client/Shoot         DONE
       ↓
SCL-120 Shoot service               READY
       ↓
┌───────────────┬─────────────────┐
SCL-130 Admin UI SCL-131 Portal UI
```

Paralelizar somente depois que o contrato comum estiver estável.

---

## 19.14 Contratos antes da paralelização

Quando dois agentes dependerem da mesma entidade/API, criar primeiro uma task curta de contrato contendo:

- schema;
- tipos;
- interface do serviço;
- DTO/input/output;
- erros esperados;
- autorização.

Após merge desse contrato, UI/Admin/Portal podem avançar paralelamente.

---

## 19.15 Arquivo de decisões

Criar:

```text
docs/DECISIONS.md
```

ou ADRs em:

```text
docs/adr/
```

Registrar decisões que afetem múltiplos agentes, por exemplo:

- Supabase Auth vs auth customizado;
- política de RLS;
- provider de galeria;
- estratégia de storage;
- convenção de status;
- forma de cálculo financeiro.

Agentes devem consultar as decisões antes de alterar arquitetura já definida.

---

# 20. Backlog canônico revisado

O `TASKS.md` do repositório é a fonte operacional de status. Esta lista define a cobertura funcional esperada e os IDs reservados para novas frentes.

## Epic 0 — Fundação

SCL-001–009 — já existentes/implementados conforme `TASKS.md`.

## Epic 1 — Core de dados

SCL-100–108 — já existentes/implementados conforme `TASKS.md`.

## Epic 2 — Studio OS

SCL-200–240 — núcleo operacional já existente. Acrescentar:

- **SCL-250** — Funil/lista de Leads no Admin.
- **SCL-251** — Ficha do Lead.
- **SCL-252** — Transição de estágio + auditoria/motivo de perda.
- **SCL-253** — Converter Lead → Client.
- **SCL-254** — Converter Lead ganho → Shoot/reserva.

## Epic 3 — Minha Experiência

SCL-300–305 — já existentes. Acrescentar:

- **SCL-306** — Timeline da experiência (P2).

## Epic 4 — Site e Conversão

- **SCL-400** — Home editorial.
- **SCL-401** — Catálogo de experiências.
- **SCL-402** — Páginas verticais.
- **SCL-403** — Quiz.
- **SCL-404** — Persistência consentida do Quiz **(P1)**.
- **SCL-405** — CTA WhatsApp contextual e tracking.
- **SCL-406** — SEO técnico + Analytics + eventos de conversão.

## Epic 5 — Reveal, Galeria e Pós-venda

- **SCL-500** — Schema Gallery.
- **SCL-501** — GalleryAsset + abstração/storage privado.
- **SCL-502** — Gestão/publicação da galeria no Admin.
- **SCL-503** — Reveal da cliente.
- **SCL-504** — Favoritos/PhotoSelection.
- **SCL-505** — Download autorizado.
- **SCL-506** — Catálogo de produtos/upsells.
- **SCL-507** — Pedido de upsell + integração com financeiro.

## Epic 5B — Acervo & Paixão Clutch

- **SCL-550** — Schema InventoryItem.
- **SCL-551** — Mídia privada/pública dos itens de acervo.
- **SCL-552** — CRUD Admin do Acervo.
- **SCL-553** — InventoryReservation por ensaio + conflitos.
- **SCL-554** — Seleção/preferências de itens pela cliente.
- **SCL-555** — Integrar referências de Styling com itens reais reservados.
- **SCL-556** — Curadoria/catalogação Paixão Clutch no Admin.
- **SCL-557** — Página/seção pública Paixão Clutch + consulta de disponibilidade.
- **SCL-558** — Aluguel avulso Paixão Clutch ponta a ponta (P2).

## Epic 6 — Migração do legado

IDs históricos **SCL-600–604** permanecem reservados para parser/conciliação/importação da planilha caso essa migração ainda seja necessária. Não reutilizar estes IDs para Acervo.

## Epic 7 — Comunicação e Automações

- **SCL-700** — Infra de eventos/outbox + Resend + templates.
- **SCL-701** — Boas-vindas após reserva.
- **SCL-702** — Scheduler D-7 / D-1.
- **SCL-703** — Comunicação de produção/Reveal/galeria.
- **SCL-704** — Pedido de review pós-entrega.
- **SCL-705** — Delivery log, retry e idempotência.

## Epic 7B — Reviews, indicação e recorrência

- **SCL-720** — Schema/serviços Review + Referral.
- **SCL-721** — Fluxo de avaliação/Google Business Profile.
- **SCL-722** — Tracking de indicação e conversão.
- **SCL-723** — Oportunidades de recorrência no CRM (P2).

## Epic 8 — Recursos futuros

- **SCL-800** — Avaliar/implementar Virtual Try-On (DEFERRED/P3).
- **SCL-810** — Assistente contextual de preparação (DEFERRED/P3).
- **SCL-811** — Agente de dúvidas da cliente (DEFERRED/P3).
- **SCL-820** — Programa de fidelidade (DEFERRED/P3).

---

# 21. Ordem sugerida para o fechamento do MVP

Como o núcleo P0/P1A já está amplamente implementado, a ordem agora deve minimizar retrabalho entre as frentes faltantes.

### Onda A — Contratos compartilhados

Executar primeiro, com migrations serializadas:

```text
SCL-250/251 (UI Lead pode iniciar sem migration nova)
SCL-404 (contrato de persistência do quiz)
SCL-500/501 (Gallery + assets/storage)
SCL-550/551 (Inventory + media)
SCL-700 (eventos/notificações)
SCL-720 (Review/Referral)
```

### Onda B — Paralelização por domínio

Após os contratos acima estabilizarem, podem trabalhar em paralelo:

```text
Comercial:  SCL-252 → 253 → 254
Galeria:    SCL-502 → 503/504/505 → 506/507
Acervo:     SCL-552 → 553 → 554/555/556/557
Automação:  SCL-701/702/703/704 → 705
Growth:     SCL-721/722 + SCL-405/406
```

### Regra de integração

- `SCL-554` e `SCL-555` dependem do contrato de `InventoryItem/InventoryReservation`;
- `SCL-506/507` dependem da galeria e devem reutilizar `Payment`/Financeiro, sem novo saldo paralelo;
- `SCL-704/721` dependem do evento real de entrega;
- `SCL-404` deve integrar com `Lead`, não criar CRM paralelo;
- todas as migrations permanecem serializadas conforme §19.7.

---

# 21.1 Release Gate funcional — quando podemos chamar o MVP de completo

Antes de declarar o produto funcionalmente completo para lançamento, devem estar `DONE` ou conscientemente removidas do release pelo Product Owner:

- Site público: SCL-400–406, incluindo Paixão Clutch (SCL-557);
- Comercial: SCL-250–254 + SCL-404;
- Studio OS/Portal: núcleo já implementado e contratos concluídos;
- Acervo: SCL-550–557;
- Galeria/Reveal: SCL-500–507;
- Comunicação: SCL-700–705;
- Review/indicação: SCL-720–722;
- contratos privados SCL-310 ou decisão explícita de release sem emissão.

Virtual Try-On, agente, fidelidade e aluguel avulso completo não bloqueiam o MVP.

---

# 22. Definition of Done global

Uma task somente pode ser considerada `DONE` quando:

- [ ] código mergeado na branch principal;
- [ ] acceptance criteria atendidos;
- [ ] typecheck passa;
- [ ] lint passa;
- [ ] testes relevantes passam;
- [ ] autorização revisada quando houver acesso a dados;
- [ ] migration validada quando aplicável;
- [ ] documentação atualizada se contrato/comportamento mudou;
- [ ] nenhum segredo foi commitado;
- [ ] PR possui contexto suficiente para manutenção futura;
- [ ] tasks dependentes foram atualizadas/desbloqueadas.

---

# 23. Entregável esperado do marco de fechamento do MVP

O primeiro marco de produto deverá permitir demonstrar o seguinte fluxo real:

1. Admin autentica.
2. Cria uma cliente.
3. Cria um ensaio Aurora para essa cliente.
4. Sistema cria preparação e ProductionJob.
5. Admin registra um pagamento parcial.
6. Dashboard e saldo atualizam.
7. Cliente recebe/acessa Minha Experiência por autenticação.
8. Portal mostra o mesmo ensaio e checklist.
9. Admin avança produção.
10. Portal reflete o novo estado.

Quando esse fluxo estiver funcional de ponta a ponta, a fundação do Studio OS estará validada.

---

# 24. Materiais a entregar ao desenvolvedor junto deste PRD

1. `PRD-Studio-Carol-Lucas-Experience-Studio-OS-v1.0.md` — este documento.
2. `studio-carol-lucas-prototipo-v2.3-studio-os.html` — referência visual e funcional.
3. `studio-carol-lucas-v2.3-modelo-dados.md` — modelo de domínio elaborado durante prototipagem.
4. `StudioCarolLucas_Controle.xlsx` — controle legado para entendimento e futura migração.
5. Imagens temporárias/ilustrativas usadas no protótipo, apenas como referência visual até substituição pelo acervo real.

---

## Nota ao desenvolvedor

O protótipo é **referência de produto, fluxo e direção visual**, não código de produção a ser copiado literalmente.

Antes de implementar cada módulo:

1. identificar entidade/contrato de domínio envolvido;
2. confirmar autorização;
3. confirmar fonte de verdade;
4. escrever/atualizar a task em `docs/TASKS.md`;
5. só então implementar a UI.

O objetivo não é reproduzir uma planilha na web. O objetivo é transformar o processo atual em um sistema integrado onde cada informação é registrada uma vez e reutilizada em toda a jornada da cliente e na operação do estúdio.
