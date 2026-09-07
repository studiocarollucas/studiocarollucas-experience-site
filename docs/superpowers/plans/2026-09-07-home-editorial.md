# Home editorial — Implementation Plan

**Goal:** Implementar a direção editorial aprovada com curadoria de 15 anos, aniversário feminino, gestante e newborn.

**Architecture:** Home estática em Server Component, CSS Module isolado, next/image e fotos WebP locais. Contato contextual usa NEXT_PUBLIC_STUDIO_WHATSAPP_URL com fallback público autorizado pelo usuário: https://wa.me/5592984140492; portal aponta para /minha-experiencia. Sem dependência de banco na home.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Sharp já disponível, Cormorant Garamond e Jost existentes.

## Direção aprovada e refinamentos

Frase: “Uma experiência com a sua identidade. Fotografias com a nossa assinatura.” Base clara, ameixa, retratos grandes e galeria assimétrica. No celular, preservar proporção da fotografia horizontal da guitarra. Mostrar referências, styling e checklist como partes concretas da experiência. Sem depoimentos, métricas, preços ou dados de clientes inventados.

## Execução

- [x] Curadoria: criar scripts/prepare-home-images.mjs, exportando seis originais para public/images/site/home em WebP, máximo 1920 px, sem ampliação ou alteração de pessoas. Registrar origem e dimensões. Manter originais locais, excluir pastas brutas do versionamento/deploy.
- [x] Implementar app/(site)/page.tsx e home.module.css com cabeçalho, hero, quatro experiências, preparação/portal e contato. Links por experiência adicionam mensagem ao WhatsApp validado. Configuração ausente ou inválida utiliza o número comercial informado durante a implementação.
- [x] Verificar destinos, imagens e visual em desktop/mobile. Rodar lint, typecheck e build. Nenhum teste live de banco é necessário para esse trabalho.
- [x] Atualizar board e registrar resultados e limitações. Entregar preview local; publicação conforme fluxo do marco.

## Curadoria

| Uso | Origem | Saída |
| --- | --- | --- |
| Hero 15 anos | 15-anos/IMG_7315.JPG.jpeg | quinze-guitarra.webp |
| Hero aniversário | aniversario-adulto/IMG_0225.JPG.jpeg | aniversario-dourado.webp |
| Categoria 15 anos | 15-anos/IMG_4456.JPG.jpeg | quinze-azul.webp |
| Categoria aniversário | aniversario-adulto/IMG_2004.JPG.jpeg | aniversario-rosa.webp |
| Categoria gestante | gestante/IMG_7170.JPG.jpeg | gestante-vermelho.webp |
| Categoria newborn | newborn/IMG_5604.JPG.jpeg | newborn-neutro.webp |

Os arquivos newborn encontrados dentro de gestante (IMG_5608, IMG_5611 e IMG_6331) ficam fora desta seleção inicial. IMG_3037.PNG não foi incluído porque a leitura visual falhou.

## Evidências da execução

- Build de produção concluído com sucesso, incluindo TypeScript e geração estática de `/`. Lint: zero erros, cinco avisos preexistentes nos testes de domínio. `git diff --check` sem erros.

- Seis WebP somam 1.071.332 bytes, contra 7.160.741 bytes dos originais selecionados (85% menor). IMG_7315 recebeu rotação de 90° na cópia exportada para corrigir orientação lateral.
- Verificação no navegador em 1440 px e 390 px; oito instâncias de imagem carregadas, sem overflow horizontal em 390 px. Cinco links WhatsApp apontam para o número autorizado e incluem a experiência no texto.
- Primeira compilação passou no bundler e encontrou duplicação de trechos nos arquivos gerados .next/dev/types/routes.d.ts e validator.ts. Preview foi encerrado e os dois arquivos descartáveis removidos antes de repetir o build. Nenhum código de domínio foi alterado para contornar o erro.
