# Template: Como Iniciar um Novo Projeto com Claude

Siga esse ritual toda vez que começar um projeto novo. Leva ~20 minutos e evita horas de retrabalho.

---

## Passo 1 — Criar a pasta e a estrutura

```
meu-projeto/
├── CLAUDE.md                        ← cérebro do projeto (obrigatório)
└── .claude/
    └── skills/
        ├── nova-feature/
        │   └── SKILL.md
        ├── discutir-ideia/
        │   └── SKILL.md
        └── corrigir-bug/
            └── SKILL.md
```

---

## Passo 2 — Preencher o CLAUDE.md

Cole o template abaixo e preencha cada seção. Quanto mais específico, menos tokens você gasta nas conversas.

```markdown
# CLAUDE.md — [Nome do Projeto]

---

## TL;DR — Contexto em 60 segundos

**O que é:** [1 frase descrevendo o projeto]
**Stack:** [ex: React 18 + Vite, backend Node/Supabase/Firebase, deploy Vercel/Netlify]
**Repo:** [link do GitHub ou "local apenas"]
**Objetivo do usuário final:** [o que o usuário faz no app]

**Regras invioláveis deste projeto:**
- [regra 1]
- [regra 2]
- [regra 3]

**Arquivos-chave:**
- `src/App.jsx` → [o que faz]
- `src/utils.js` → [o que faz]
- [outros arquivos importantes]

**Decisões de design importantes:**
- [Por que escolheu X em vez de Y]
- [Restrições que não podem mudar]

---

## Stack Técnica

| Camada | Tecnologia | Observação |
|---|---|---|
| UI | [ex: React 18] | [ex: sem TypeScript] |
| Backend | [ex: Supabase] | [ex: tabelas: users, items] |
| Deploy | [ex: Vercel] | [ex: auto-deploy no push em main] |
| Estilos | [ex: Tailwind / inline / CSS modules] | |

---

## Estrutura de Arquivos

[cole a árvore de pastas com comentário em cada arquivo relevante]

---

## Lógica Principal

[Explique em prosa como o app funciona. Fluxos principais. O que acontece quando o usuário faz X.]

---

## Convenções de Código

- **Nomenclatura:** [ex: camelCase para funções, PascalCase para componentes]
- **IDs:** [ex: crypto.randomUUID() / nanoid() / Date.now()]
- **Datas:** [ex: ISO 8601 string, sempre UTC]
- **Estado global:** [ex: Context API / Zustand / useState em App.jsx]
- **Estilos:** [ex: Tailwind utility classes / CSS Modules / inline]

---

## Bugs Conhecidos / Débitos Técnicos

[Liste aqui qualquer coisa que você sabe que está errada ou incompleta. Isso evita que Claude "corrija" coisas que são gambiarras intencionais.]

---

## Como Rodar

\`\`\`bash
npm install
npm run dev
\`\`\`

Variáveis de ambiente necessárias (arquivo .env):
\`\`\`
VITE_API_URL=...
\`\`\`
```

---

## Passo 3 — Preencher as Skills

### SKILL.md de nova-feature (adapte ao projeto)
Cole o conteúdo da skill do projeto Gestão Gamificado como base e ajuste:
- As regras invioláveis do SEU projeto
- Os padrões de código do SEU projeto
- Os arquivos que normalmente serão tocados

### SKILL.md de discutir-ideia
Cole o conteúdo da skill do projeto Gestão Gamificado como base e ajuste:
- O que você sabe sobre o domínio do projeto
- Restrições específicas (ex: não usar X biblioteca, não adicionar Y)
- Como deve ser o produto final de uma discussão (plano de ação)

### SKILL.md de corrigir-bug
Cole o conteúdo da skill do projeto Gestão Gamificado como base e ajuste:
- Liste os bugs conhecidos desde o início
- Descreva áreas delicadas do código que exigem cuidado

---

## Passo 4 — Como iniciar toda conversa nova

Use sempre uma dessas frases de abertura. Claude vai ler o CLAUDE.md automaticamente e já ter contexto:

**Para discutir uma ideia:**
> "Projeto [Nome]. Quero discutir uma ideia: [ideia em 1 frase]."

**Para implementar algo:**
> "Projeto [Nome]. Quero implementar: [feature em 1 frase]. Pode usar a skill nova-feature."

**Para corrigir um bug:**
> "Projeto [Nome]. Bug: [descreva o comportamento errado]. Pode usar a skill corrigir-bug."

---

## Passo 5 — Manter o CLAUDE.md atualizado

Toda vez que uma feature importante for implementada:
- Adicione ela na seção de arquivos-chave se criar novos arquivos
- Documente decisões de design que não eram óbvias
- Liste novos bugs conhecidos

O CLAUDE.md deve sempre refletir o estado atual do projeto, não o estado inicial.

---

## Dicas para economizar tokens

1. **TL;DR sempre no topo** — Claude lê de cima pra baixo. O TL;DR evita ler o resto.
2. **Skills para tarefas recorrentes** — em vez de explicar como fazer uma feature toda vez, a skill já carrega esse conhecimento.
3. **Seja específico no pedido** — "Adicionar botão de deletar na tela de detalhes de projeto" é melhor que "Quero poder deletar projetos". Menos idas e vindas.
4. **Um chat por tarefa** — chats longos com muitos arquivos lidos = contexto pesado. Prefira chats focados: um para discussão, outro para implementação.
5. **Separe discussão de implementação** — use a skill `discutir-ideia` em um chat para fechar o plano. Depois abra um chat novo e use `nova-feature` com o plano já definido.
