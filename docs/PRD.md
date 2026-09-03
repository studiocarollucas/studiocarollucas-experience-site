# PRD — Stúdio Carol Lucas Experience + Studio OS

**Versão:** 1.0  
**Status:** Aprovado para início do desenvolvimento  
**Domínio:** `studiocarollucas.com.br`  
**Produto:** Site público + Minha Experiência + Studio OS / Admin  
**Protótipo de referência:** `studio-carol-lucas-prototipo-v2.3-studio-os.html`  
**Documento de modelagem de referência:** `studio-carol-lucas-v2.3-modelo-dados.md`

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
- Caso haja identificação do visitante, salvar o resultado no Lead/Client.
- Ao converter em cliente, permitir reaproveitar o resultado em **Minha Experiência**.

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

## 6.3 Styling

MVP:

- referências de figurinos;
- referências de cenário;
- clutches e acessórios;
- informações relevantes de styling;
- salvar preferências quando necessário.

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

- página de Reveal;
- foto de capa;
- título/mensagem personalizada;
- acesso à galeria privada;
- favoritos;
- controle de download quando permitido;
- estado de publicação;
- pós-entrega.

### Upsells planejados

- fotos adicionais;
- coleção completa;
- álbum;
- impressão/quadro;
- Reel/Stories;
- outros produtos futuros.

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

## 7.8 Acervo

P2/P3, arquitetura preparada desde o início.

Tipos:

- figurino;
- clutch;
- cenário;
- prop/acessório.

Deverá futuramente permitir reservas por ensaio e detecção de conflito.

---

## 7.9 Automações

### MVP

Criar uma camada de eventos, mesmo que nem todas as comunicações sejam automatizadas na primeira entrega.

Eventos importantes:

- reserva confirmada;
- pagamento registrado;
- D-7;
- D-1;
- produção finalizada;
- galeria publicada;
- entrega concluída.

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
UpsellOrder
Review
Referral
AutomationEvent
AuditLog
```

Entidades posteriores:

```text
Asset
AssetReservation
NotificationPreference
VirtualTryOnRequest
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
Client 1 ─── N Review
Client 1 ─── N Referral
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
- gestão avançada de estoque;
- conflitos automáticos de figurinos/clutches;
- app mobile nativo;
- multi-tenant/SaaS para outros estúdios;
- edição de fotografia dentro do sistema.

A arquitetura não deve inviabilizar esses recursos futuros.

---

# 18. Fases sugeridas

## P0 — Fundação

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

## P1 — Operação essencial

- Client;
- ExperiencePackage;
- Shoot;
- Payment;
- Expense;
- dashboard;
- agenda/lista de ensaios;
- CRM;
- ProductionJob/Kanban;
- PreparationTask;
- Minha Experiência conectada.

## P2 — Experiência e crescimento

- quiz persistente/CRM;
- Reveal;
- Gallery;
- favoritos;
- upsells;
- review;
- indicação;
- automações reais.

## P3 — Acervo e inteligência

- Asset;
- AssetReservation;
- figurinos/clutches/cenários;
- prevenção de conflito;
- assistente contextual;
- prévia de styling/virtual try-on se validado.

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

# 20. Backlog inicial recomendado

## Epic 0 — Fundação

- **SCL-001** — Inicializar repositório Next.js/TypeScript/Tailwind.
- **SCL-002** — Configurar lint, format, typecheck e testes.
- **SCL-003** — Configurar CI e preview deploys.
- **SCL-004** — Criar projeto Supabase e ambientes.
- **SCL-005** — Integrar Drizzle e strategy de migrations.
- **SCL-006** — Implementar Auth base.
- **SCL-007** — Implementar roles/RBAC/RLS base.
- **SCL-008** — Configurar observabilidade e logging.
- **SCL-009** — Criar design tokens e layout base.
- **SCL-010** — Criar `docs/TASKS.md` e protocolo de agentes.

## Epic 1 — Core de dados

- **SCL-100** — Schema Client.
- **SCL-101** — Schema Lead.
- **SCL-102** — Schema ExperiencePackage.
- **SCL-103** — Schema Shoot.
- **SCL-104** — Schema Payment/Expense.
- **SCL-105** — Schema PreparationTask.
- **SCL-106** — Schema ProductionJob.
- **SCL-107** — AuditLog.
- **SCL-108** — Seeds de experiências.

## Epic 2 — Studio OS

- **SCL-200** — Shell/Admin navigation.
- **SCL-201** — Dashboard.
- **SCL-202** — Lista de clientes.
- **SCL-203** — Ficha da cliente.
- **SCL-204** — Cadastro de cliente.
- **SCL-210** — Lista Agenda/Ensaios.
- **SCL-211** — Criar ensaio.
- **SCL-212** — Ficha do ensaio.
- **SCL-220** — Registrar pagamento.
- **SCL-221** — Financeiro/dashboard financeiro.
- **SCL-222** — Despesas.
- **SCL-230** — Kanban Produção.
- **SCL-231** — Alterar status ProductionJob.
- **SCL-240** — Checklist de preparação interno.

## Epic 3 — Minha Experiência

- **SCL-300** — Auth passwordless da cliente.
- **SCL-301** — Shell do portal.
- **SCL-302** — Home/countdown/progresso.
- **SCL-303** — Checklist da cliente.
- **SCL-304** — Meu ensaio.
- **SCL-305** — Styling/moodboard base.

## Epic 4 — Site

- **SCL-400** — Home editorial.
- **SCL-401** — Experiências.
- **SCL-402** — Páginas verticais de ensaio.
- **SCL-403** — Quiz.
- **SCL-404** — Resultado/persistência do quiz.
- **SCL-405** — CTA WhatsApp contextual.
- **SCL-406** — SEO/analytics.

## Epic 5 — Reveal/Galeria

- **SCL-500** — Schema Gallery/GalleryAsset.
- **SCL-501** — Storage abstraction.
- **SCL-502** — Publicação de galeria.
- **SCL-503** — Reveal.
- **SCL-504** — Favoritos.
- **SCL-505** — Downloads autorizados.

## Epic 6 — Migração

- **SCL-600** — Parser/import staging da planilha.
- **SCL-601** — Detecção de duplicidade.
- **SCL-602** — Relatório de divergências.
- **SCL-603** — Fluxo de conciliação.
- **SCL-604** — Import final.

---

# 21. Ordem sugerida para desenvolvimento paralelo

A paralelização deve ocorrer por contratos estáveis, e não simplesmente por telas.

### Onda 1 — Sequencial / fundação

```text
SCL-001 → SCL-004/SCL-005 → SCL-006/SCL-007 → Core schemas
```

### Onda 2 — Contratos do domínio

Após Client, ExperiencePackage, Shoot, Payment e ProductionJob estarem estáveis:

```text
                      ┌─ Admin Clientes
Core Domain ──────────┼─ Admin Ensaios
                      ├─ Financeiro
                      ├─ Produção
                      └─ Portal da Cliente
```

Essas frentes podem rodar em paralelo desde que não alterem independentemente os contratos comuns.

### Onda 3 — Site público

Pode rodar em paralelo mais cedo, pois possui baixo acoplamento com o Studio OS, desde que design tokens e componentes base já estejam definidos.

### Onda 4 — Reveal/Galeria

Iniciar após contratos de Shoot/Client/Auth e abstração de storage estarem definidos.

### Onda 5 — Migração

Pode ser desenvolvida em paralelo após o schema alvo estabilizar. Não importar dados definitivos antes de fechar o modelo P1.

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

# 23. Entregável esperado do primeiro marco

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
