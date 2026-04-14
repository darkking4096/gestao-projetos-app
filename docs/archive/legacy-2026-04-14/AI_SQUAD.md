# AI Squad

## O que este projeto e

Este repositorio contem uma SPA React/Vite de produtividade gamificada com:

- gerenciamento de projetos, rotinas, tarefas e objetivos
- sistema de progressao com ENERGIA, PODER, ranks e streak
- persistencia e autenticacao via Supabase
- interface dark com estilos inline e tokens em `src/temas.js`

## Como o squad pensa

O comando do squad nao tenta adivinhar tudo do zero. Ele injeta um contexto fixo do projeto e classifica seu pedido em trilhas especializadas.

Especialistas ativos:

- `product-owner`: traduz o pedido em objetivo claro e criterio de aceite
- `frontend-react`: implementa a mudanca na SPA
- `gamification-engineer`: protege regras de recompensa, ranking e progressao
- `supabase-data`: protege sync, auth e schema
- `ux-guardian`: protege padrao visual e consistencia
- `qa-guard`: valida regressao e build

## Um comando

Use:

```powershell
npm run squad -- "seu pedido aqui"
```

Exemplos:

```powershell
npm run squad -- "adicione filtro por prioridade na aba de tarefas"
npm run squad -- "corrija o reset diario do streak e valide a regra"
npm run squad -- "melhore a tela de login mantendo o visual do app"
```

## Modos

Preparar sem executar:

```powershell
npm run squad:prepare -- "seu pedido aqui"
```

Isso gera o briefing em `.ai-squad/last-brief.md`.

## O que o comando faz

1. Classifica o pedido.
2. Seleciona especialistas.
3. Mapeia areas e arquivos provaveis.
4. Gera um briefing operacional com contexto do projeto.
5. Opcionalmente dispara `codex exec` no proprio repositorio.

## Limitacoes

- O roteamento e heuristico, nao magico.
- Se o pedido for muito amplo, o squad ainda depende do agente principal decompor a execucao.
- O comando usa `codex exec`; se o login do Codex nao estiver valido, a execucao nao vai prosseguir.
