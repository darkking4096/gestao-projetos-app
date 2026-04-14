# Cleanup Audit - 2026-04-14

Auditoria de organizacao do repositorio. O objetivo e deixar claro o que e codigo de produto, o que e documento vivo, o que foi arquivado e o que esta em quarentena antes de qualquer delecao definitiva.

## Linha de Base

- `npm run build`: passou em 2026-04-14 antes e depois da quarentena.
- `npm run lint`: nao existe em `package.json`.
- `npm run typecheck`: nao existe em `package.json`.
- `npm test`: nao existe em `package.json`.
- App principal permanece funcional e concentrado em `App.jsx`.
- Backend/persistencia permanecem em Supabase.

## Limpeza Ja Aplicada

Documentos antigos movidos para `docs/archive/legacy-2026-04-14/`:

- `PRD.md`
- `DESIGN_SYSTEM.md`
- `MISSOES_REFERENCIA.txt`
- `Analise_App_Gamificado.docx`
- `TEMPLATE_NOVO_PROJETO.md`
- `docs/AI_SQUAD.md`
- `docs/CHECKUP_MUDANCAS_2026-04-01.md`
- `docs/HANDOFF_CONTEXTO_2026-04-01.md`
- `docs/MOBILE_UX_CHECKUP_2026-04-01.md`
- `AGENTS.md.backup.2026-04-01T23-40-54-640Z`

Itens movidos para `_quarantine/2026-04-14/`:

- `.ai-squad/`
- `.aiox-core/`
- `.antigravity/`
- `.claude/`
- `.codex/`
- `.cursor/`
- `.gemini/`
- `.github/`
- `Gestao Projetos/` ou variante com acento/encoding
- `meu-projeto/`
- `tools/`
- `vite.config.js.timestamp-*.mjs`

Esses itens nao foram apagados. Eles ficaram separados para revisao.

## O Que Deve Permanecer No Fluxo Principal

Codigo de produto:

- `App.jsx`
- `main.jsx`
- `index.html`
- `src/`
- `public/`
- `vite.config.js`

Pacotes e ambiente:

- `package.json`
- `package-lock.json`
- `.env.example`

Banco:

- `importar_dados_supabase.sql`
- `supabase_rls_setup.sql`
- `social_tables.sql`

Documentacao viva:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/PROJECT_MAP.md`
- `docs/CLEANUP_AUDIT_2026-04-14.md`
- `docs/stories/`

## O Que Nao Deve Entrar No Git

- `.env`
- `node_modules/`
- `dist/`
- `_quarantine/`
- `build/`
- `*.log`
- `vite.config.js.timestamp-*.mjs`
- duplicatas locais como `meu-projeto/` e `Gestao Projetos/`
- backups como `AGENTS.md.backup.*`

## Decisoes Tomadas

- Documentos antigos foram arquivados, nao apagados.
- Duplicatas e ferramentas antigas foram colocadas em quarentena, nao apagadas.
- `AGENTS.md` e `CLAUDE.md` passaram a ser as instrucoes vivas para agentes.
- `README.md` e `docs/PROJECT_MAP.md` passaram a ser a referencia atual para entendimento do projeto.
- `npm run build` e o unico gate de qualidade executavel no momento.

## Decisoes Abertas

- Definir se o projeto vai adicionar scripts reais para `lint`, `typecheck` e `test`.
- Definir quando `_quarantine/2026-04-14/` pode ser apagada definitivamente.
- Definir a primeira tranche de refatoracao de `App.jsx`.
- Decidir se algum conteudo arquivado deve voltar como documento vivo, depois de revisao.

## Riscos Atuais

- `App.jsx` ainda concentra estado, UI, integracao e regras, aumentando risco em mudancas grandes.
- Existem arquivos em quarentena que contem `.env`; revisar antes de qualquer acao de Git ou compartilhamento.
- Ha historico de encoding misto em documentos com portugues.
- Scripts de qualidade citados nas instrucoes ainda nao existem.
- Sem testes automatizados, regressao funcional depende principalmente de build e verificacao manual.

## Proxima Limpeza Recomendada

1. Manter `_quarantine/2026-04-14/` fora do Git.
2. Revisar se ha algum arquivo unico dentro da quarentena que precisa ser recuperado.
3. Confirmar que nenhum `.env` sera versionado ou compartilhado.
4. Rodar `npm run build`.
5. So depois decidir delecao definitiva da quarentena.

## Comandos De Referencia

```bash
npm run build
git status --short
```
