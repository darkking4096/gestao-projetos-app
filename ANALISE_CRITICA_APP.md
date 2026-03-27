# Análise Crítica — Sistema "Atividades" (App.jsx e ecossistema)
> Revisão completa: arquitetura, segurança, lógica de negócio, performance e UX
> Data: Março 2026

---

## Resumo Executivo

O sistema é tecnicamente ambicioso e bem pensado do ponto de vista de produto — gamificação, streaks, maestria, missões diárias, loja, objetivos hierárquicos. A refatoração modular foi um bom passo. No entanto, existem **problemas graves** que comprometem segurança, confiabilidade e manutenibilidade, além de um conjunto considerável de problemas médios e menores. A boa notícia: nada aqui é irreparável. Todos os problemas têm solução direta.

---

## 🔴 CRÍTICO — Segurança e Confiabilidade

### 1. Credenciais hardcoded no código-fonte (`armazenamento.js`, linhas 5–6)

```js
const SUPABASE_URL = "https://ersisusnwmxkdvatynvn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dziqIYjdAn-uaqSroTXUdg_ZiO7tAjO";
```

**O problema:** Essas strings estão no código-fonte e no histórico Git. Qualquer pessoa que clonar o repositório, ver o código no GitHub ou inspecionar o bundle `dist/` pode ler essas credenciais. A chave anon do Supabase, embora seja "pública por design" para o frontend, permite que qualquer pessoa faça requisições diretamente ao seu banco — incluindo chamar sua API de amizades, consultar `user_profiles`, tentar criar contas, etc.

**O risco real:** Se as Row Level Security (RLS) policies do Supabase não estiverem corretamente configuradas, qualquer pessoa pode ler ou escrever dados de qualquer usuário.

**A solução:** Variáveis de ambiente com o prefixo `VITE_`:
```js
// .env (nunca commitado)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=sb_publishable_...

// armazenamento.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```
E adicionar `.env` ao `.gitignore`. O que está no Git atualmente não dá para apagar com retroatividade a menos que se faça um force-push, mas ao menos pare de usar essas credenciais públicas e rotacione a chave no painel do Supabase.

---

### 2. Efeito colateral dentro do corpo de render (`App.jsx`, linha 726)

```js
// Dentro do corpo da função App(), fora de qualquer useEffect
setCurrentTheme(_computedTheme);
```

**O problema:** `setCurrentTheme` é chamada diretamente no corpo do componente, o que significa que ela executa a cada render. Isso viola a regra fundamental do React: funções de componente devem ser puras. Em modo `StrictMode` (que está ativo em `main.jsx`), React executa renders duplos intencionalmente em desenvolvimento — então `setCurrentTheme` chamará duas vezes, com valores potencialmente inconsistentes.

**O risco real:** O sistema inteiro de temas depende da variável global `C` (de `temas.js`) estar correta. Se `setCurrentTheme` for chamada em momentos inesperados, filhos que importam `C` diretamente podem ver um valor desatualizado, causando renderizações com cores erradas.

---

### 3. Variável global mutável como sistema de temas (`temas.js`)

```js
export let C = THEMES.obsidiana;
export function setCurrentTheme(tema) {
  C = tema; // mutação de variável exportada
}
```

Todos os arquivos fazem `import { C } from '../temas.js'` e usam `C.gold`, `C.bg` etc. **O React não sabe que `C` mudou.** O sistema funciona apenas porque `setCurrentTheme` é chamado durante o render do App pai, que força re-render de todos os filhos — mas isso é uma coincidência frágil, não uma garantia arquitetural.

**O risco real:** Em qualquer cenário onde um filho renderize sem que o App pai tenha renderizado antes (lazy loading, Suspense, portais, hot reload), `C` pode estar desatualizado.

**A solução correta:** React Context para o tema, ou ao menos mover `setCurrentTheme` para dentro de `useEffect`.

---

## 🟠 ALTO — Bugs de Lógica e Dados

### 4. Stale closure no reset diário (`App.jsx`, linhas 146–211)

```js
// tasks é capturado em closure no momento da montagem do componente
const currentTasks = tasks; // use current state reference
const toArchive = currentTasks.filter(t => {
  ...
});
```

**O problema:** O `useEffect` de reset diário tem como dependência apenas `[loaded]`. Isso significa que `tasks` dentro desse efeito é o valor do estado no momento em que o efeito foi criado — que é `[]` (array vazio inicial). Quando o `setLoaded(true)` dispara após o carregamento do Supabase, os dados já foram carregados, mas o `useEffect` de reset que escuta `[loaded]` pode estar vendo o estado anterior.

**Prova:** O comentário `// use current state reference` sugere que o desenvolvedor estava ciente do problema, mas a "solução" (`const currentTasks = tasks`) não resolve a stale closure — continua usando o `tasks` da closure.

**Consequência:** Tarefas vencidas nunca são arquivadas automaticamente porque `toArchive` sempre filtra um array vazio. A funcionalidade de "auto-archive tasks overdue 3+ days" provavelmente não funciona.

---

### 5. Race condition na função `earn` (`App.jsx`, linhas 220–243)

```js
const earn = useCallback((xp, coins, msg, onEarned) => {
  let popupXp = xp, popupCoins = coins, popupMsg = msg;
  let levelUpData = null;
  setProfile(p => {
    // ... calcula valores ...
    popupXp = finalXp; // MUTAÇÃO DE VARIÁVEL EXTERNA DENTRO DE UPDATER
    levelUpData = { level: newLv, ... }; // IDEM
    return { ...p, ... };
  });
  setTimeout(() => { setRewardPopup({ xp: popupXp, ... }); if (onEarned) onEarned(popupXp, popupCoins); }, 10);
  setTimeout(() => { if (levelUpData) setLevelUpNotif(levelUpData); }, 600);
}, []);
```

**O problema:** Dentro do updater funcional do `setProfile`, variáveis externas (`popupXp`, `levelUpData`) estão sendo modificadas. Isso é um antipadrão grave. Os updaters funcionais do React **devem ser funções puras sem efeitos colaterais**. Em StrictMode, o React executa updaters duas vezes para detectar efeitos colaterais — o que significa que `popupXp` pode ser sobrescrito duas vezes com valores calculados sobre estados diferentes.

**Consequência:** O popup pode mostrar valores de XP incorretos, e `levelUpData` pode ser `null` na segunda execução se as condições não forem atendidas, silenciando notificações de level-up.

---

### 6. Múltiplas escritas Supabase sem debounce (`App.jsx`, linhas 136–144)

```js
useEffect(() => { if (loaded) S.set("projects", projects); }, [projects, loaded]);
useEffect(() => { if (loaded) S.set("routines", routines); }, [routines, loaded]);
// ... +7 efeitos similares
```

**O problema:** Cada mudança de estado dispara uma escrita imediata no Supabase. Ao completar uma tarefa de projeto, você dispara simultaneamente: escrita de `projects` (atualiza phases/progress), escrita de `profile` (atualiza XP/coins/tasksCompleted), e possivelmente escrita de `objectives`. São 3+ requisições de rede simultâneas por ação.

**Consequência:** Muitas requisições desnecessárias, alto consumo de quota do Supabase, possíveis conflitos de escrita (race conditions no banco).

**A solução:** Debounce de 800ms–1s em cada `useEffect` de persistência, similar ao que já existe no `syncProfileRef`.

---

### 7. Carregamento dos dados é sequencial, não paralelo (`App.jsx`, linhas 116–134)

```js
const p = await S.get("projects"); if (p) setProjects(p);
const r = await S.get("routines"); if (r) setRoutines(r);
// ... 7 chamadas await sequenciais
```

**O problema:** São 9 chamadas `await` em sequência. Cada uma espera a resposta da anterior antes de começar a próxima. Se cada chamada Supabase leva ~200ms de latência, o carregamento inicial leva ~1800ms de espera de rede, quando poderia ser ~200ms.

**A solução:**
```js
const [p, r, t, ob, tr, rn, rf, at, pr] = await Promise.all([
  S.get("projects"), S.get("routines"), S.get("tasks"), ...
]);
```

---

### 8. `calcObjectiveXp` pode entrar em loop infinito (`utilidades.js`, linha 150–173)

```js
export function calcObjectiveXp(objectiveId, projects, routines, tasks, objectives) {
  // ...
  (obj.linkedObjectives || [])
    .filter(l => l.relation === "menor")
    .forEach(l => {
      total += calcObjectiveXp(l.id, ...); // recursão sem limite de profundidade
    });
}
```

**O problema:** `wouldCreateCycle` é verificado apenas ao criar links, não durante o cálculo. Se dados corrompidos (por bug, importação manual ou versão antiga) contiverem um ciclo nas linkedObjectives, esta função entra em recursão infinita e trava o browser inteiro.

**A solução:** Adicionar um `Set` de IDs visitados:
```js
export function calcObjectiveXp(objectiveId, ..., _visited = new Set()) {
  if (_visited.has(objectiveId)) return 0; // proteção anti-ciclo
  _visited.add(objectiveId);
  // ...
}
```

---

### 9. `deleteObjective(id, deleteAll=true)` faz deleção permanente silenciosa

```js
if (deleteAll) {
  (obj.linkedActivities || []).forEach(link => {
    if (link.type === "project") setProjects(prev => prev.filter(p => p.id !== link.id));
    // ...
  });
}
```

**O problema:** Quando o usuário deleta um objetivo com a opção "deletar tudo", os projetos/rotinas/tarefas vinculados são removidos diretamente sem ir para a lixeira. Isso é uma perda permanente de dados, contornando o sistema de trash que existe justamente para recuperação.

---

## 🟡 MÉDIO — Performance e UX

### 10. Variáveis globais no `window` para swipe (`App.jsx`, linhas 791–804)

```js
onTouchStart={(e) => { window._swipeX = e.touches[0].clientX; window._swipeY = e.touches[0].clientY; }}
```

**O problema:** `window._swipeX` e `window._swipeY` são variáveis globais que poluem o namespace global. Qualquer biblioteca de terceiros pode sobrescrever ou ler esses valores. Além disso, se o componente for desmontado durante um swipe, o valor persiste no `window`.

**A solução:** Usar `useRef` para armazenar os valores do swipe:
```js
const swipeRef = useRef({ x: null, y: null });
```

---

### 11. `nav` recria referência frequentemente (`App.jsx`, linha 245)

```js
const nav = useCallback((t, st, v, id, tp) => {
  // ...
}, [view, tab, subTab, selId, selType]);
```

**O problema:** `nav` é passado como prop para praticamente todos os componentes filhos. Toda vez que `tab`, `view`, `selId` ou `selType` mudam (o que acontece com toda navegação), `nav` tem sua referência atualizada, invalidando a memória de todos os filhos que a recebem, mesmo aqueles que não usam `nav` naquele render.

---

### 12. Achievement notification reaparece entre sessões sem ser coletada

`shownAchieveIds` é um `useRef` que existe apenas em memória. Ao recarregar a página, ele zera. Se um usuário dispensar a notificação de conquista sem clicar "coletar", na próxima sessão a notificação aparece novamente, mesmo que ela seja "nova" por parecer.

O `achievementsUnlocked` no profile previne dupla coleta de moedas, mas não evita que a popup apareça novamente — causando confusão.

---

### 13. Erro de storage com mensagem enganosa

```
"Erro ao salvar dados. Verifique o armazenamento do dispositivo."
```

O erro na verdade é uma falha de escrita no **Supabase** (rede, autenticação, quota). A mensagem diz "armazenamento do dispositivo", o que induz o usuário a procurar o problema no local errado.

---

### 14. Missão diária sem tratamento de dias sem atividades registradas

O log diário (`dailyLog`) só recebe uma entrada quando há virada de dia ativa. Se o usuário ficar offline vários dias e retornar, o log acumulará apenas a data do último dia ativo, pulando os dias intermediários. Isso distorce gráficos de atividade no dashboard que dependem de `dailyLog`.

---

### 15. Streak logic não lida com gaps maiores que 1 dia

```js
if (wasActive) {
  newStreak = (profile.streak || 0) + 1;
} else if (profile.shieldActive) {
  shieldUsed = true;
} else {
  newStreak = Math.max(0, (profile.streak || 0) - 5);
}
```

Se o usuário ficar ausente 5 dias, o streak cai 5 de uma vez. Mas se o usuário ficar ausente 15 dias consecutivos e aí voltar, **o app só executa o reset uma vez** (na próxima abertura), reduzindo o streak por apenas 5, não 75. O reset é executado uma vez por abertura do app, não uma vez por dia ausente. Usuários podem "acumular" streak indevidamente ao não abrir o app por dias e depois abrir apenas uma vez.

---

### 16. Fluxo de logout mobile vs desktop inconsistente

```js
{tab === "config" && <ConfigTab ... onSignOut={!isDesktop ? onSignOut : null} ... />}
```

No desktop, o botão de logout está na sidebar. No mobile, está dentro da aba "Perfil/Config". Mas se o usuário estiver em uma tela diferente do mobile e quiser sair, não tem acesso fácil ao logout. A inconsistência de UX pode confundir.

---

## 🔵 ARQUITETURAL — Débitos Técnicos

### 17. App.jsx com ~950 linhas é ainda muito monolítico

Mesmo após refatoração, `App.jsx` gerencia: toda a navegação, todas as operações CRUD, toda a lógica de gamificação (XP, streak, missões, baús, conquistas), toda a lógica de persistência, e toda a UI de overlays/popups. O arquivo é o "deus objeto" do app.

**Problemas concretos:** difícil testar isoladamente qualquer função, impossível trabalhar em features novas sem tocar o arquivo central, alto risco de regressão a cada mudança.

**Sugestão:** Extrair um `useGameEngine` hook que centralize as funções `earn`, `completeTask`, `completeRoutine`, `claimMission`, `recoverStreak` etc.

---

### 18. Nenhum sistema de gerenciamento de estado global (Context/Zustand)

Todo o estado é prop-drilled. Componentes como `ConfigTab` recebem 15+ props. `DashboardTab` recebe 12+ props. Isso torna o rastreamento de onde cada prop veio extremamente difícil e impede testes unitários.

---

### 19. Sem TypeScript

O sistema tem estruturas de dados complexas e aninhadas — projetos com fases com tarefas, objetivos com links bidirecionais, profile com dezenas de campos opcionais. Sem TypeScript, é impossível saber o shape de um objeto sem ler todo o código. Erros de typo em nomes de campos são silenciosos e só aparecem em runtime.

---

### 20. Arquivos de timestamp do Vite commitados no repositório

```
vite.config.js.timestamp-1774444974611-e769f8aea18da.mjs
vite.config.js.timestamp-1774470043028-37cf2144637c1.mjs
vite.config.js.timestamp-1774470058263-1bbacd5dab6ae.mjs
```

Esses arquivos são gerados automaticamente pelo Vite e não devem estar no repositório. Devem ser adicionados ao `.gitignore`.

---

## 💡 OPORTUNIDADES — Sugestões para o Futuro

Estas são melhorias que enriqueceriam o sistema, partindo do que já existe:

### A. Modo Offline com localStorage como fallback
O único ponto que requer online é a autenticação e o sync social. Todo o restante poderia operar offline com `localStorage` ou `IndexedDB` como camada primária, sincronizando com Supabase quando online. Isso eliminaria a dependência de rede para uso diário e tornaria o app muito mais rápido.

**Implementação sugerida:** Um hook `useStorage` que tenta Supabase e, em caso de falha, usa localStorage. No retorno da conexão, sincroniza.

### B. Integração com IA para "Próxima Ação" inteligente
O campo `groqApiKey` já existe no perfil, mas não é usado de forma profunda. Uma sugestão de "O que fazer agora?" baseada em deadline, energia disponível, ou padrões históricos seria uma feature poderosa e diferenciadora. O contexto necessário já está todo no estado do app.

### C. Notificações Push para deadlines e missão diária
Como PWA (o manifesto já existe), o app poderia solicitar permissão de notificações e enviar lembretes para: missão diária disponível, tarefa com deadline amanhã, streak em risco. Isso aumentaria muito a retenção diária.

### D. Exportação e backup de dados
Não existe hoje uma forma de o usuário fazer backup de seus dados ou exportar para outro sistema. Um botão "Exportar JSON" ou "Exportar CSV" seria simples de implementar e daria muito mais confiança ao usuário sobre seus dados.

### E. Histórico de XP por atividade ("replay" do progresso)
O `completionLog` das rotinas e o `xpAccum` dos projetos já rastreiam histórico individual. Uma visualização de "linha do tempo de progresso" por atividade seria poderosa e motivante.

### F. Atributos mais integrados ao sistema de gamificação
A aba de `atributos` existe mas parece desconectada da mecânica principal. Vincular atributos a categorias de atividades (ex: tarefas de "Saúde" aumentam o atributo "Vitalidade") criaria uma camada de profundidade RPG interessante sem quebrar o que existe.

---

## Priorização Recomendada

| Prioridade | Item | Complexidade |
|------------|------|-------------|
| 🔴 Imediato | Credenciais em variável de ambiente | Baixa |
| 🔴 Imediato | `setCurrentTheme` → mover para `useEffect` | Baixa |
| 🔴 Imediato | Proteção anti-ciclo em `calcObjectiveXp` | Baixa |
| 🟠 Alta | `earn()` remover mutações no updater | Média |
| 🟠 Alta | Carregamento paralelo com `Promise.all` | Baixa |
| 🟠 Alta | Debounce nas escritas de estado → Supabase | Média |
| 🟠 Alta | Stale closure no reset diário | Média |
| 🟡 Média | Swipe com `useRef` em vez de `window._swipeX` | Baixa |
| 🟡 Média | `deleteObjective` → passar por trash | Baixa |
| 🟡 Média | Mensagem de erro de storage correta | Baixa |
| 🔵 Longo prazo | TypeScript | Alta |
| 🔵 Longo prazo | Context/Zustand para estado global | Alta |
| 🔵 Longo prazo | Modo offline com localStorage fallback | Alta |

---

*Análise gerada com base na leitura completa de: `App.jsx`, `main.jsx`, `armazenamento.js`, `utilidades.js`, `constantes.js`, `temas.js`, `Login.jsx`, `dashboard.jsx`.*
