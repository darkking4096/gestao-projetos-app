# Handoff de Contexto - 2026-04-01

## Estado geral

Este projeto é um app React/Vite de produtividade gamificada com:

- projetos
- rotinas
- tarefas
- objetivos
- histórico
- loja
- relatórios
- perfil/configurações

A lógica central continua concentrada em `App.jsx`, com UI dividida por abas em `src/abas`.

## O que já foi feito nesta sequência

### 1. Squad / automação

Foi criado um fluxo de squad com comando único:

- `AGENTS.md`
- `docs/AI_SQUAD.md`
- `tools/squad.js`
- scripts no `package.json`

### 2. Correções funcionais anteriores

Já foram aplicadas e validadas correções como:

- exclusão de objetivos sem deixar vínculos órfãos
- restauração da lixeira com recomposição melhor de vínculos
- reset/penalidade de rotinas considerando gaps reais de dias
- backup/import/reset incluindo relatórios e atributos
- lazy loading e chunk splitting para reduzir peso inicial

### 3. Tranche de Mobile UX já deployada

Foi publicada no commit `c8d4e38` a tranche principal de UX mobile.

Entrou em produção:

- remoção do swipe horizontal global entre abas
- shell mobile com `100dvh`
- `safe-area` na barra inferior
- `viewport-fit=cover`
- fundo consistente em `html`, `body` e `#root`
- priorização de scroll vertical com `touchAction`
- dashboard mobile reorganizado
- touch targets maiores em componentes compartilhados
- melhoria de tabs, filtros, botões e ações em telas principais
- menor chance de drag acidental em relatórios

Arquivos publicados nessa tranche:

- `App.jsx`
- `index.html`
- `src/abas/atividades.jsx`
- `src/abas/dashboard.jsx`
- `src/abas/loja.jsx`
- `src/abas/relatorios.jsx`
- `src/componentes-base.jsx`
- `docs/MOBILE_UX_CHECKUP_2026-04-01.md`

## Documentos já existentes

- `docs/CHECKUP_MUDANCAS_2026-04-01.md`
- `docs/MOBILE_UX_CHECKUP_2026-04-01.md`
- `docs/AI_SQUAD.md`

## O que está pendente

### 1. Arquivos ainda sensíveis por encoding/texto

Os principais pontos restantes são:

- `src/abas/configuracoes.jsx`
- `src/abas/detalhes.jsx`

Esses arquivos têm histórico de encoding misto e exigem cuidado. A recomendação é tratar com passada dedicada de saneamento de texto, sem misturar com novas mudanças funcionais.

### 2. Documento operacional local

`CLAUDE.md` está modificado localmente e não foi publicado. Ele não deve ser tratado como fonte de verdade até ser revisado e commitado.

### 3. Worktree local fora do fluxo principal

Itens locais que não foram incluídos no fluxo principal:

- `.ai-squad/`
- `.claude/`
- `Gestão Projetos/` (pasta aninhada)
- `TEMPLATE_NOVO_PROJETO.md`

## Regras práticas para próximos chats

1. Partir do commit publicado `c8d4e38` como base estável de mobile UX.
2. Não misturar saneamento de encoding com grandes refactors visuais no mesmo passo.
3. Ao mexer em `configuracoes.jsx` ou `detalhes.jsx`, validar texto visível e rodar build antes de qualquer push.
4. Priorizar mudanças visíveis ao usuário em mobile antes de mexer em documentação interna.
5. Manter o padrão já adotado de:
   - menos gesto implícito
   - mais alvos de toque
   - mais consistência com tema
   - menos densidade visual no celular

## Próximo passo recomendado

Próxima rodada ideal:

1. saneamento limpo de `src/abas/configuracoes.jsx`
2. saneamento limpo de `src/abas/detalhes.jsx`
3. revisão final de microcopy visível
4. commit/push dessa limpeza como tranche separada
