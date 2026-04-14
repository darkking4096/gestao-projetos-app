# AGENTS.md - Codex

Instrucoes para o Codex trabalhar neste projeto.

## Projeto

Este repositorio contem uma SPA React 18 + Vite de produtividade gamificada. O usuario gerencia projetos, rotinas, tarefas, objetivos, historico, loja, relatorios e perfil. O backend e Supabase.

## Regras de trabalho

1. Entenda o codigo antes de editar.
2. Prefira mudancas pequenas, verificaveis e alinhadas ao padrao existente.
3. Nao invente funcionalidades fora do pedido ou dos documentos ativos.
4. Nao apague dados, documentos ou pastas sem criterio claro. Para limpeza, use quarentena antes de delecao definitiva.
5. Preserve compatibilidade com dados existentes do Supabase.
6. Sempre atualize a story em `docs/stories/` quando a mudanca fizer parte de uma story aberta.
7. Nao reverta alteracoes do usuario sem pedido explicito.

## Fonte de verdade

- `README.md`: visao rapida, comandos e mapa inicial.
- `docs/PROJECT_MAP.md`: mapa tecnico do sistema atual.
- `docs/CLEANUP_AUDIT_2026-04-14.md`: auditoria de limpeza e candidatos a quarentena.
- `docs/stories/`: trabalho planejado e checklist.
- `CLAUDE.md`: instrucoes equivalentes para Claude.

Documentos antigos ficam em `docs/archive/` e nao devem ser tratados como fonte de verdade sem revisao.

## Arquivos centrais

- `main.jsx`: bootstrap React, auth inicial e selecao login/app.
- `App.jsx`: estado principal, navegacao, integracao entre entidades e fluxo de recompensas.
- `src/armazenamento.js`: Supabase, Auth, persistencia e social.
- `src/utilidades.js`: regras de dominio, datas, energia, moedas, ranks e maestria.
- `src/constantes.js`: tabelas fixas e presets.
- `src/temas.js`: temas e tokens de cor.
- `src/componentes-base.jsx`: componentes compartilhados.
- `src/formularios.jsx`: formularios de entidades.
- `src/abas/`: telas principais carregadas por lazy loading.
- `public/`: manifest, favicon e icones PWA.
- `*.sql`: schema, carga e politicas Supabase.

## Convencoes do app

- Use JavaScript e JSX. Nao introduza TypeScript sem decisao explicita.
- Use estilos inline, seguindo o padrao atual.
- Use tokens de tema `C.*` para cores de interface.
- Use SVG inline para icones. Nao use emoji na interface.
- Mantenha o campo `totalXp` por retrocompatibilidade, mesmo quando o texto do produto fala em ENERGIA.
- Evite bibliotecas novas quando uma solucao local simples e consistente resolver.

## Qualidade

Gate executavel atual:

```bash
npm run build
```

O projeto ainda nao possui scripts reais para:

```bash
npm run lint
npm run typecheck
npm test
```

Se uma tarefa exigir esses gates, primeiro adicione a infraestrutura ou registre explicitamente que eles ainda nao existem.

## Fluxo recomendado

1. Leia a story ativa em `docs/stories/`, se existir.
2. Localize os arquivos com `rg` antes de abrir arquivos grandes.
3. Edite o menor conjunto possivel.
4. Rode `npm run build`.
5. Atualize checklist e file list da story.
6. Resuma o que mudou, os testes rodados e qualquer risco restante.

## Limpeza e organizacao

- Nao delete direto quando houver duvida.
- Use `_quarantine/` ou `docs/archive/` para separar itens antigos.
- `node_modules/`, `dist/`, timestamps do Vite, backups e instalacoes duplicadas nao fazem parte do codigo fonte.
- `.env` e qualquer segredo nunca entram no Git.
- Pastas de ferramentas de agente devem ser versionadas apenas se forem fonte de verdade do projeto.

## Git

- Nao rode `git push` sem pedido explicito.
- Nao use `git reset --hard` nem `git checkout --` para limpar trabalho alheio.
- Antes de finalizar, consulte `git status --short`.
