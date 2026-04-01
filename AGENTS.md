# AGENTS.md

Instrucoes operacionais para agentes trabalhando neste projeto.

## Projeto

Aplicativo web pessoal de gestao de projetos gamificado com tema RPG.

- Stack: React 18 + Vite + Supabase
- Entrada principal: `App.jsx`
- Modulos principais: `src/`
- Persistencia: `src/armazenamento.js`
- Regras de gamificacao: `src/utilidades.js` e `src/constantes.js`
- UI por abas: `src/abas/`

## Regras de implementacao

- Nao use TypeScript.
- Nao crie arquivos CSS nem Tailwind.
- Use estilos inline.
- Use cores via `C.{token}` de `src/temas.js`.
- Nao use emojis na interface.
- Use SVG inline para icones.
- Preserve retrocompatibilidade do campo `totalXp`.

## Squad Operacional

Quando o pedido envolver mudancas, trate como um squad coordenado por um orquestrador:

1. `product-owner`
Responsavel por interpretar o pedido, alinhar com o PRD e definir criterio de aceite.

2. `frontend-react`
Responsavel por `App.jsx`, componentes base, formularios e abas.

3. `gamification-engineer`
Responsavel por ENERGIA, PODER, ranks, streak, missoes, loja e progresso.

4. `supabase-data`
Responsavel por auth, sync, persistencia e SQL.

5. `ux-guardian`
Responsavel por consistencia visual, tema e padroes da interface.

6. `qa-guard`
Responsavel por regressao, build e checagens finais.

## Roteamento

- Pedidos com UI, layout, tela, card, botao, aba, modal: acione `frontend-react` e `ux-guardian`.
- Pedidos com XP, ENERGIA, rank, streak, missao, recompensa, moedas, loja: acione `gamification-engineer`.
- Pedidos com login, usuario, sync, Supabase, banco, social, SQL: acione `supabase-data`.
- Todo pedido de mudanca real termina com `qa-guard`.

## Execucao

- Analise primeiro o impacto do pedido.
- Liste arquivos provaveis de mudanca.
- Faca as alteracoes.
- Rode `npm run build` quando a mudanca tocar comportamento da aplicacao.
- Resuma o que mudou, riscos residuais e como validar.
