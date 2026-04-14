# Project Map

Mapa tecnico do estado atual do sistema em 2026-04-14. Use este documento para entender onde cada responsabilidade vive antes de limpar, refatorar ou adicionar funcionalidades.

## Produto

O projeto e uma SPA React 18 + Vite de produtividade gamificada. O usuario autenticado trabalha com:

- projetos, fases e tarefas de projeto
- rotinas recorrentes
- tarefas avulsas
- objetivos e vinculos com atividades
- historico e recuperacao
- loja, cosmeticos, upgrades e baus
- relatorios e notas
- perfil, configuracoes e recursos sociais

Supabase e usado para autenticacao, persistencia e tabelas sociais.

## Fluxo de Entrada

1. `index.html` carrega `main.jsx`.
2. `main.jsx` consulta `Auth.getUser()` em `src/armazenamento.js`.
3. Sem usuario autenticado, renderiza `src/Login.jsx`.
4. Com usuario autenticado, renderiza `App.jsx`.
5. `App.jsx` carrega as telas principais com `React.lazy` e `Suspense`.

## Centro da Aplicacao

`App.jsx` e o arquivo mais critico do sistema. Ele concentra:

- estado principal de projetos, rotinas, tarefas, objetivos, lixeira, perfil, relatorios e atributos
- navegacao por aba, subaba, detalhes e formularios
- carregamento inicial via `S.getAll`
- salvamento por chave via `S.set`
- regras de conclusao, recompensa, undo e historico
- modais globais, confirmacoes e estado visual compartilhado
- integracao entre entidades que ainda nao foi extraida para modulos menores

Regra pratica: mexer em `App.jsx` exige mudancas pequenas, build validado e atencao a retrocompatibilidade dos dados.

## Modulos de Dominio

- `src/armazenamento.js`: cria o cliente Supabase e exporta `Auth`, `S` e `Social`.
- `src/utilidades.js`: concentra regras de datas, frequencia, energia, moedas, XP legado, ranks, maestria, baus, objetivos e validacoes.
- `src/constantes.js`: guarda tabelas fixas e valores de referencia como categorias, prioridades, frequencias, ranks, recompensas e presets.
- `src/temas.js`: define temas, tons derivados e o objeto `C` usado pela UI.

## UI Compartilhada

- `src/componentes-base.jsx`: botoes, cards, modais, inputs, badges, barras e componentes comuns.
- `src/formularios.jsx`: formularios de criacao/edicao para entidades principais.
- `src/icones.jsx`: SVGs inline, itens visuais da loja, raridades, upgrades e labels.

O projeto usa majoritariamente estilos inline. Cores de interface devem vir dos tokens `C.*`.

## Abas

- `src/abas/dashboard.jsx`: resumo, energia, progresso, atributos e atalhos.
- `src/abas/atividades.jsx`: listas, filtros e criacao de atividades.
- `src/abas/detalhes.jsx`: detalhes de projeto, rotina, tarefa e objetivo.
- `src/abas/historico.jsx`: historico, lixeira e recuperacao.
- `src/abas/loja.jsx`: loja, cosmeticos, upgrades, baus e recompensas.
- `src/abas/configuracoes.jsx`: perfil, conta, backup, social e preferencias.
- `src/abas/relatorios.jsx`: notas, pastas e relatorios.
- `src/abas/chat-ia.jsx`: assistente contextual usado nas atividades.
- `src/abas/atributos.jsx`: visualizacao e distribuicao de atributos.

## Dados e Supabase

Arquivos SQL mantidos na raiz:

- `importar_dados_supabase.sql`: carga/estrutura principal mais ampla.
- `supabase_rls_setup.sql`: politicas e configuracao RLS.
- `social_tables.sql`: tabelas sociais.

Ambiente:

- `.env.example`: contrato publico de variaveis esperadas.
- `.env`: configuracao local e secreta. Nao versionar.

Compatibilidade:

- O campo `totalXp` deve continuar existindo por retrocompatibilidade.
- Texto de produto pode falar em ENERGIA, mas a persistencia ainda pode depender de nomes antigos.
- Qualquer mudanca de schema precisa preservar dados existentes do Supabase ou vir acompanhada de migracao clara.

## Organizacao do Repositorio

Arquivos e pastas de produto que devem permanecer no fluxo principal:

- `App.jsx`
- `main.jsx`
- `index.html`
- `src/`
- `public/`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `.env.example`
- `*.sql`
- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/`

Itens gerados ou locais:

- `node_modules/`: dependencias instaladas.
- `dist/`: build gerado.
- `.env`: ambiente local.
- `_quarantine/`: itens separados para revisao antes de delecao.

## Documentos

Documentos vivos:

- `README.md`
- `docs/PROJECT_MAP.md`
- `docs/CLEANUP_AUDIT_2026-04-14.md`
- `docs/stories/2026-04-14-organizacao-base.md`
- `AGENTS.md`
- `CLAUDE.md`

Documentos historicos ficam em `docs/archive/legacy-2026-04-14/`. Eles nao sao fonte de verdade atual.

## Qualidade

Gate executavel atual:

```bash
npm run build
```

Scripts ausentes no momento:

```bash
npm run lint
npm run typecheck
npm test
```

Enquanto esses scripts nao existirem, qualquer validacao formal deve registrar essa limitacao.

## Ordem Segura Para Proximas Mudancas

1. Fechar a decisao sobre scripts de qualidade.
2. Manter build verde.
3. Evitar funcionalidades grandes ate a base documental estar fechada.
4. Refatorar `App.jsx` por responsabilidade, uma etapa por vez.
5. Revisar `_quarantine/` antes de qualquer delecao definitiva.
