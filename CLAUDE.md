# CLAUDE.md - Claude

Instrucoes para Claude trabalhar neste projeto. Este arquivo deve permanecer alinhado com `AGENTS.md`.

## Contexto

Este e um app React 18 + Vite de produtividade gamificada, com Supabase para autenticacao, persistencia e recursos sociais. O usuario gerencia projetos, rotinas, tarefas, objetivos, historico, loja, relatorios e perfil.

O sistema esta publicado e funcional. Antes de adicionar funcionalidades grandes, preserve estabilidade, organize com criterio e mantenha build verde.

## Regras principais

1. Leia o contexto minimo necessario antes de editar.
2. Faca mudancas pequenas e rastreaveis.
3. Nao invente requisitos.
4. Nao apague arquivos sem criterio. Quando houver duvida, arquive ou coloque em quarentena.
5. Preserve retrocompatibilidade com os dados existentes.
6. Use a story ativa em `docs/stories/` para checklist e file list.
7. Nao reverta alteracoes do usuario sem pedido explicito.

## Fonte de verdade

- `README.md`
- `docs/PROJECT_MAP.md`
- `docs/CLEANUP_AUDIT_2026-04-14.md`
- `docs/stories/`
- `AGENTS.md`

Documentos em `docs/archive/` sao historico. Use apenas se precisar recuperar contexto antigo.

## Arquitetura atual

- `main.jsx`: inicia React e decide entre login e app autenticado.
- `App.jsx`: concentra estado global, navegacao, carregamento/salvamento e recompensas.
- `src/armazenamento.js`: Supabase, Auth, `S.get`, `S.getAll`, `S.set` e `Social`.
- `src/utilidades.js`: regras de energia, moedas, ranks, maestria, datas e validacoes.
- `src/constantes.js`: tabelas e presets.
- `src/temas.js`: temas e tokens `C.*`.
- `src/componentes-base.jsx`: UI compartilhada.
- `src/formularios.jsx`: formularios.
- `src/abas/`: dashboard, atividades, detalhes, historico, loja, configuracoes, relatorios, chat e atributos.

## Convencoes

- JavaScript e JSX apenas.
- Estilos inline, como o projeto ja usa.
- Cores de interface via `C.*`.
- Icones em SVG inline.
- Sem emoji na interface.
- Nao renomear `totalXp` no banco sem migracao planejada.
- Evite dependencia nova sem necessidade clara.

## Qualidade

Use como gate minimo:

```bash
npm run build
```

Atualmente nao existem scripts para `lint`, `typecheck` ou `test`. Se uma tarefa depender deles, registre a lacuna ou implemente os scripts como parte da tarefa.

## Como responder

- Seja direto.
- Liste arquivos alterados quando relevante.
- Informe comandos executados e resultado.
- Aponte riscos reais, especialmente em Supabase, gamificacao e dados existentes.

## Limpeza

- Raiz do projeto deve conter apenas arquivos operacionais e documentos vivos.
- Documentos antigos ficam em `docs/archive/`.
- Duplicatas, backups e gerados ficam fora do fluxo principal.
- `.env`, `node_modules/`, `dist/` e snapshots temporarios nao devem entrar no Git.
