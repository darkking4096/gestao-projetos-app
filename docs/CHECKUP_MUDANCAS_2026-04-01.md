# Mudanças Aplicadas no Checkup Geral

Este documento resume as mudanças implementadas na sequência de saneamento do projeto.

## Objetivo da rodada

Melhorar consistência funcional, UX/UI, responsividade e performance inicial do app sem alterar a proposta central do sistema.

## Mudanças funcionais

- Exclusão de objetivos agora remove vínculos órfãos entre objetivos.
- Restauração da lixeira ficou mais íntegra:
  - religa atividades com objetivos quando possível
  - religa `phaseRef` de rotinas e projetos quando aplicável
  - evita duplicar item já restaurado
- Backup, importação e reset passaram a incluir:
  - `reportNotes`
  - `reportFolders`
  - `atributos`
- Sync público do perfil passou a contar apenas objetivos ativos.
- Penalidade de rotinas no reset diário passou a considerar gaps reais de vários dias sem abrir o app.

## Mudanças de interface e UX

- Dashboard principal ficou mais responsivo no mobile:
  - cards de resumo não ficam presos em 4 colunas fixas
  - tipografia e espaçamento ficaram menos comprimidos
- Card de objetivos do dashboard foi alinhado ao tema real.
- Detalhe de projeto saiu de fundo hardcoded para token visual do tema.
- Lixeira/configurações ganhou ação de restauração visualmente mais coerente.
- Componentes compartilhados melhorados:
  - modal com largura e altura mais adequadas para telas menores
  - scroll interno em modal
  - botões `danger` e checkbox sem hardcodes centrais de cor
- Painel dev ficou visualmente mais próximo do design system do app.

## Saneamento de texto/encoding

- A tela de histórico foi recriada em UTF-8 limpo.
- Textos visíveis do histórico deixaram de exibir mojibake.

## Performance e build

- Abas e detalhes pesados passaram para `lazy loading` com `Suspense`.
- O `vite.config.js` recebeu `manualChunks` para separar:
  - `react-vendor`
  - `supabase`
  - `vendor`
- Resultado prático:
  - o chunk principal caiu de aproximadamente `955 kB` para aproximadamente `389 kB` minificado
  - várias áreas do app agora carregam sob demanda

## Arquivos principais alterados

- `App.jsx`
- `src/abas/configuracoes.jsx`
- `src/abas/dashboard.jsx`
- `src/abas/detalhes.jsx`
- `src/abas/historico.jsx`
- `src/componentes-base.jsx`
- `vite.config.js`

## Pendências conhecidas

- `src/abas/configuracoes.jsx` ainda tem textos com encoding inconsistente em alguns pontos.
- `CLAUDE.md` continua fora de sync com partes do código e não entrou nesta rodada.
- Ainda há espaço para reduzir mais o bundle principal.
