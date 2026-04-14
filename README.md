# Coofe

SPA React 18 + Vite para produtividade gamificada. O app permite gerenciar projetos, fases, tarefas, rotinas, objetivos, historico, loja, relatorios, perfil e recursos sociais. O backend usado pelo app e Supabase.

## Estado Atual

- Produto publicado e funcional.
- Build de producao validado em 2026-04-14 com `npm run build`.
- Estrutura principal organizada em raiz, `src/`, `public/`, `docs/` e scripts SQL.
- Documentacao antiga movida para `docs/archive/legacy-2026-04-14/`.
- Ferramentas antigas de agentes, duplicatas locais e backups movidos para `_quarantine/2026-04-14/`.
- O centro funcional ainda esta concentrado em `App.jsx`; qualquer refatoracao deve ser incremental.

## Como Rodar

```bash
npm install
npm run dev
npm run build
npm run preview
```

Comandos mobile:

```bash
npm run mobile:android:sync
npm run mobile:android:open
npm run mobile:ios:sync
npm run mobile:ios:open
npm run mobile:assets
```

Variaveis de ambiente:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use `.env.example` como referencia. O arquivo `.env` e local, contem segredo/configuracao de ambiente e nao deve entrar no Git.

## Estrutura Viva

- `index.html`: entrada HTML usada pelo Vite.
- `main.jsx`: bootstrap React, leitura inicial de autenticacao e escolha entre login e app autenticado.
- `App.jsx`: orquestracao principal, estado global, navegacao, integracao entre entidades, persistencia e recompensas.
- `src/Login.jsx`: tela de login.
- `src/armazenamento.js`: cliente Supabase, `Auth`, persistencia `S` e recursos sociais `Social`.
- `src/utilidades.js`: regras de dominio, datas, energia, moedas, ranks, maestria, objetivos e compatibilidade.
- `src/constantes.js`: tabelas fixas, categorias, frequencias, ranks, recompensas e presets.
- `src/temas.js`: temas, tons derivados e tokens de cor `C.*`.
- `src/componentes-base.jsx`: componentes compartilhados de UI.
- `src/formularios.jsx`: formularios de projeto, rotina, tarefa e objetivo.
- `src/icones.jsx`: icones SVG inline, loja visual e dados de upgrades.
- `src/abas/`: telas carregadas sob demanda por `React.lazy`.
- `public/`: manifest, favicon e icones PWA.
- `capacitor.config.json`: configuracao mobile Capacitor.
- `assets/`: fontes para geracao de icones e splash mobile.
- `android/`: projeto Android gerado pelo Capacitor.
- `ios/`: projeto iOS gerado pelo Capacitor.
- `*.sql`: carga, schema social e politicas Supabase.
- `docs/`: documentos vivos, auditorias, stories e arquivo historico.

## Documentacao

Fonte de verdade atual:

- `README.md`: visao rapida para rodar e entender o repositorio.
- `docs/PROJECT_MAP.md`: mapa tecnico do sistema atual.
- `docs/CLEANUP_AUDIT_2026-04-14.md`: auditoria de limpeza, quarentena e riscos.
- `docs/stories/2026-04-14-organizacao-base.md`: story ativa da reorganizacao.
- `docs/stories/2026-04-14-mobile-notificacoes.md`: story de mobile e notificacoes.
- `docs/MOBILE_RELEASE_CHECKLIST_2026-04-14.md`: requisitos Android/iOS e checklist de publicacao.
- `docs/PRIVACY_POLICY_COOFE.md`: base de politica de privacidade para publicacao.
- `AGENTS.md` e `CLAUDE.md`: instrucoes para agentes trabalharem no projeto.

Documentos em `docs/archive/` sao historico. Eles podem conter ideias uteis, mas nao devem ser tratados como requisito atual sem revisao.

## Qualidade

Scripts existentes hoje em `package.json`:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run mobile:android:sync`
- `npm run mobile:android:open`
- `npm run mobile:ios:sync`
- `npm run mobile:ios:open`
- `npm run mobile:assets`

Gate confiavel atual:

```bash
npm run build
```

Ainda nao existem scripts reais para:

```bash
npm run lint
npm run typecheck
npm test
```

A decisao sobre adicionar ou nao esses gates ainda esta aberta na story de organizacao.

## Convencoes Importantes

- Use JavaScript e JSX. Nao introduza TypeScript sem decisao explicita.
- Siga o padrao atual de estilos inline.
- Use tokens de tema `C.*` para cores de interface.
- Use SVG inline para icones.
- Nao use emoji na interface.
- Preserve o campo `totalXp` por retrocompatibilidade, mesmo quando a comunicacao de produto fala em ENERGIA.
- Evite novas dependencias quando uma solucao local simples resolver.

## Proximos Passos Recomendados

1. Fechar a decisao sobre `lint`, `typecheck` e `test`.
2. Manter `npm run build` verde antes e depois de qualquer mudanca.
3. Refatorar `App.jsx` por dominio, em tranches pequenas.
4. Apagar itens em `_quarantine/` somente depois de uma rodada de uso sem regressao e revisao do que contem `.env`.
