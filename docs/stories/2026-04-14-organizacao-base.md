# Story: Organizacao Base do Sistema Atual

## Status

In Progress

## Contexto

O projeto esta publicado e funcional, mas o repositorio acumulou documentos antigos, ferramentas de agentes, backups, builds locais e instalacoes duplicadas. A prioridade desta story e registrar o estado real do sistema, separar historico de fonte viva e reduzir risco antes de novas funcionalidades ou refatoracoes maiores.

## Objetivo

Deixar a base do repositorio compreensivel e verificavel:

- documentar o produto e a arquitetura atual
- classificar arquivos vivos, historicos, gerados e locais
- manter uma trilha segura para limpeza
- validar que a reorganizacao nao quebra o build
- registrar lacunas de qualidade ainda abertas

## Acceptance Criteria

- [x] Estrutura atual inventariada.
- [x] Build de producao validado.
- [x] Arquivos centrais do app documentados.
- [x] Candidatos a limpeza classificados por risco.
- [x] Nenhum arquivo de producao removido sem confirmacao.
- [x] Scripts de qualidade auditados.
- [x] Quarentena criada para duplicatas/backups.
- [x] Build validado apos quarentena.
- [x] Documentacao viva reescrita para refletir o estado atual.
- [ ] Scripts reais de `lint`, `typecheck` e `test` definidos ou decisao documentada.
- [x] File list atualizada.

## Plano Tecnico

1. Estabilizar build atual.
2. Criar mapa tecnico do projeto.
3. Criar auditoria de limpeza.
4. Atualizar `.gitignore` para reduzir risco de versionar artefatos locais.
5. Mover documentos antigos para `docs/archive/legacy-2026-04-14/`.
6. Mover duplicatas, ferramentas antigas e backups para `_quarantine/2026-04-14/`.
7. Reescrever a documentacao viva para servir como fonte atual.
8. Fechar a decisao sobre scripts de qualidade.

## Validacao

Ja registrado na story:

- `npm run build`: passou antes e depois da quarentena.
- `npm run lint`: falhou porque o script nao existe.
- `npm run typecheck`: falhou porque o script nao existe.
- `npm test`: falhou porque o script nao existe.

Validacao desta reescrita:

- `npm run build`: passou em 2026-04-14 apos a reescrita documental.
- `git status --short`: revisado; o worktree ja continha mudancas pendentes da reorganizacao.

## Estado Atual Documentado

Fonte viva:

- `README.md`
- `docs/PROJECT_MAP.md`
- `docs/CLEANUP_AUDIT_2026-04-14.md`
- `docs/stories/2026-04-14-organizacao-base.md`
- `AGENTS.md`
- `CLAUDE.md`

Historico:

- `docs/archive/legacy-2026-04-14/`

Quarentena:

- `_quarantine/2026-04-14/`

Gate atual:

- `npm run build`

## File List

- `.gitignore`
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/PROJECT_MAP.md`
- `docs/CLEANUP_AUDIT_2026-04-14.md`
- `docs/stories/2026-04-14-organizacao-base.md`
- `docs/archive/legacy-2026-04-14/`
- `_quarantine/2026-04-14/`
- `package.json`
- `App.jsx`

## Proxima Decisao

Definir se a proxima etapa sera:

- adicionar infraestrutura minima de `lint`, `typecheck` e `test`; ou
- registrar formalmente que, por enquanto, o unico gate do projeto sera `npm run build`.
