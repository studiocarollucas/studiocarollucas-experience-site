# Curadoria pública

`home/` contém as seis fotos selecionadas para a home editorial. Os originais continuam nas pastas locais de categoria, ignoradas por Git e Vercel.

Para regenerar as cópias com o acervo local disponível:

```sh
node scripts/prepare-home-images.mjs
```

Conversão: WebP, qualidade 84, lado máximo 1920 px, sem ampliação. Remoção de metadados pelo exportador; nenhuma alteração generativa de rostos ou corpos. A foto da guitarra recebe rotação de 90° para corrigir a orientação. Fontes individuais estão no plano `docs/superpowers/plans/2026-09-07-home-editorial.md`.

Para novas fotos, mantenha os originais na categoria e adicione somente as cópias selecionadas e otimizadas em `site/`. Não é necessário publicar todo o acervo.
