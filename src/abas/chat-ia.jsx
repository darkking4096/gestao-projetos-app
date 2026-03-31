import { useState, useRef, useEffect, useMemo } from "react";
import { C } from '../temas.js';
import { uid, td, fmtFreq, migrateFreq } from '../utilidades.js';

/* ══════════════════════════════════════════════════
   PROMPT DO SISTEMA — define o comportamento da IA
══════════════════════════════════════════════════ */
const SYSTEM_PROMPT = `Você é o Assistente de Produtividade do app "Atividades" — um sistema gamificado de gestão pessoal com ENERGIA ⚡, moedas e ranks (de F- a MAX).

SEU ÚNICO PROPÓSITO: Sugerir atividades (tarefas, rotinas ou projetos) altamente relevantes e personalizadas para o usuário, baseadas no histórico e perfil fornecidos.

═══ REGRAS INVIOLÁVEIS ═══
1. Responda SEMPRE em português brasileiro, de forma direta e motivadora
2. Analise o contexto para detectar padrões: tarefas correlatas (→ projeto), ações repetitivas (→ rotina), áreas de crescimento
3. Sugira SEMPRE entre 2 e 5 atividades — nem mais, nem menos
4. Se o usuário não tiver histórico, conduza o QUESTIONÁRIO antes de sugerir
5. NÃO responda perguntas ou pedidos fora do escopo de sugestão de atividades
6. Se fora do escopo, responda no formato fora_escopo e redirecione gentilmente
7. Nunca repita sugestões já recusadas na mesma sessão
8. Calibre dificuldades com precisão:
   - 1-2: trivial (2-5 min) · 3-4: fácil (15-30 min) · 5-7: moderado (30-90 min)
   - 8-10: desafiador (2-4h) · 11-14: difícil (dia) · 15-19: épico (semana) · 20: máximo

═══ FORMATO OBRIGATÓRIO — retorne SOMENTE JSON puro ═══

Para SUGESTÕES:
{"tipo":"sugestoes","mensagem":"Frase breve e motivadora","sugestoes":[{"tipo":"task","nome":"Nome claro e objetivo","descricao":"O que fazer e por que vale a pena","dificuldade":5,"categoria":"Trabalho"},{"tipo":"routine","nome":"Nome do hábito","descricao":"Por que criar esse hábito agora","dificuldade":3,"categoria":"Saúde"},{"tipo":"project","nome":"Nome do projeto","descricao":"Visão do projeto e suas etapas principais","dificuldade":8,"categoria":"Estudos"}]}

Para QUESTIONÁRIO (usuário novo):
{"tipo":"questionario","mensagem":"Texto introdutório ou bridge entre perguntas","pergunta":"Pergunta clara e direta","opcoes":["Opção A","Opção B","Opção C","Outra"]}

Para RESPOSTA FORA DO ESCOPO:
{"tipo":"fora_escopo","mensagem":"Mensagem redirecionando ao propósito do chat"}

Tipos: "task" (única, pontual) | "routine" (hábito recorrente) | "project" (conjunto de etapas)
Categorias: "Saúde" | "Trabalho" | "Estudos" | "Pessoal" | "Finanças" | "Hobby" | "Social" | "Casa" | "Esportes" | "Outros"

═══ QUESTIONÁRIO PARA USUÁRIOS SEM HISTÓRICO (5 perguntas) ═══
Conduza uma pergunta por vez nesta ordem:
P1: Qual área da sua vida você mais quer desenvolver agora? (Saúde, Carreira, Estudos, Finanças, Relacionamentos, Outro)
P2: Qual é o seu principal objetivo nos próximos 3 meses?
P3: Quantas horas por dia você tem disponíveis para atividades pessoais?
P4: Você prefere tarefas pontuais, hábitos diários ou projetos maiores?
P5: O que costuma impedir você de ser mais produtivo hoje?
Após as 5 respostas, analise tudo e retorne sugestões altamente personalizadas.

═══ ANÁLISE DE PADRÕES (para usuários com histórico) ═══
Busque ativamente:
- 3+ tarefas com tema similar → sugira transformar em PROJETO
- Ações concluídas semanalmente → sugira criar ROTINA
- Áreas sem nenhuma atividade nos últimos 7 dias → sugira exploração
- Projetos parados (baixo progresso) → sugira tarefa de desbloqueio
- Alta taxa de conclusão → sugira aumentar desafio (dificuldade maior)`;

/* ══════════════════════════════════════════════════
   CHAMADA À API GROQ
══════════════════════════════════════════════════ */
async function callGroq(apiKey, messages) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.65,
      max_tokens: 2000
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Erro ${res.status}${errText ? " — " + errText.slice(0, 120) : ""}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseAIResponse(raw) {
  try {
    let cleaned = raw.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
    return JSON.parse(cleaned);
  } catch {
    return { tipo: "erro", mensagem: raw };
  }
}

/* ══════════════════════════════════════════════════
   CONSTRUÇÃO DO CONTEXTO DO USUÁRIO
══════════════════════════════════════════════════ */
function buildUserContext(projects, routines, tasks, profile) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const dailyLog = profile.dailyLog || [];
  const recentLog = dailyLog.filter(d => d.date >= weekAgoStr);
  const weekXp = recentLog.reduce((s, d) => s + (d.xp || 0), 0);
  const activeDays = recentLog.filter(d => (d.xp || 0) > 0).length;

  const activeProjects = projects.filter(p => p.status === "Ativo");
  const activeRoutines = routines.filter(r => r.status === "Ativa");
  const pendingTasks = tasks.filter(t => t.status === "Pendente");
  const doneTasks = tasks.filter(t => t.status === "Concluída" && (t.completedAt || "") >= weekAgoStr);

  const routineCompletions = activeRoutines.flatMap(r =>
    (r.completionLog || []).filter(l => l.date >= weekAgoStr).map(l => r.name)
  );

  const lines = [
    "PERFIL:",
    `- ENERGIA acumulada: ${(profile.totalXp || 0).toLocaleString()} ⚡  |  PODER: ${Math.floor((profile.totalXp || 0) / 100)}`,
    `- Streak atual: ${profile.streak || 0} dias  |  Total de tarefas concluídas: ${profile.tasksCompleted || 0}`,
    "",
    "ÚLTIMA SEMANA:",
    `- ENERGIA ganha: ${weekXp} ⚡  |  Dias ativos: ${activeDays}/7`,
    `- Rotinas completadas: ${routineCompletions.length}x  |  Tarefas concluídas: ${doneTasks.length}`,
    "",
    `PROJETOS ATIVOS (${activeProjects.length}):`,
    ...activeProjects.slice(0, 6).map(p =>
      `- "${p.name}" — ${p.progress || 0}% concluído${p.objective ? ` | Objetivo: ${p.objective.slice(0, 60)}` : ""}`
    ),
    activeProjects.length === 0 ? "- Nenhum" : "",
    "",
    `ROTINAS ATIVAS (${activeRoutines.length}):`,
    ...activeRoutines.slice(0, 8).map(r => {
      const compThisWeek = routineCompletions.filter(n => n === r.name).length;
      return `- "${r.name}" — streak ${r.streak || 0}d | ${fmtFreq(r)} | completou ${compThisWeek}x esta semana | dif ${r.difficulty || 1}`;
    }),
    activeRoutines.length === 0 ? "- Nenhuma" : "",
    "",
    `TAREFAS PENDENTES (${pendingTasks.length}):`,
    ...pendingTasks.slice(0, 10).map(t =>
      `- "${t.name}" | dif ${t.difficulty || 1}${t.category ? ` | ${t.category}` : ""}${t.deadline ? ` | prazo ${t.deadline}` : ""}`
    ),
    pendingTasks.length === 0 ? "- Nenhuma" : "",
  ];

  return lines.filter(l => l !== "").join("\n");
}

/* ══════════════════════════════════════════════════
   CARD DE SUGESTÃO (convite aceitar/recusar)
══════════════════════════════════════════════════ */
function SuggestionCard({ suggestion, onAccept, onReject, accepted }) {
  const typeLabel = { task: "TAREFA", routine: "ROTINA", project: "PROJETO" }[suggestion.tipo] || "ATIVIDADE";
  const typeColor = { task: C.orange, routine: C.purple, project: C.gold }[suggestion.tipo] || C.gold;
  const [hA, setHA] = useState(false);
  const [hR, setHR] = useState(false);

  if (accepted) {
    return (
      <div style={{
        background: C.card, border: "1px solid " + C.green + "40", borderLeft: "3px solid " + C.green,
        borderRadius: 10, padding: "10px 12px", marginBottom: 8,
        display: "flex", alignItems: "center", gap: 8, opacity: 0.6
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <div style={{ fontSize: 11, color: C.tx3 }}>
          <span style={{ color: C.green, fontWeight: 600 }}>{typeLabel}</span> "{suggestion.nome}" adicionado!
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.card, border: "1px solid " + typeColor + "35",
      borderLeft: "3px solid " + typeColor, borderRadius: 10,
      padding: "10px 12px", marginBottom: 8
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 1, color: typeColor,
          textTransform: "uppercase", background: typeColor + "18",
          padding: "2px 7px", borderRadius: 4
        }}>{typeLabel}</span>
        <span style={{ fontSize: 9, color: C.tx4 }}>Dif. {suggestion.dificuldade}</span>
        {suggestion.categoria && <span style={{ fontSize: 9, color: C.tx4 }}>· {suggestion.categoria}</span>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, marginBottom: 3 }}>{suggestion.nome}</div>
      <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.55, marginBottom: 9 }}>{suggestion.descricao}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onMouseEnter={() => setHA(true)} onMouseLeave={() => setHA(false)}
          onClick={onAccept}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: hA ? C.gold + "25" : C.goldDim, color: C.gold,
            border: "1px solid " + C.goldBrd, cursor: "pointer",
            transition: "background .12s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5
          }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Aceitar
        </button>
        <button
          onMouseEnter={() => setHR(true)} onMouseLeave={() => setHR(false)}
          onClick={onReject}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: hR ? "#ffffff08" : "transparent", color: C.tx4,
            border: "1px solid " + C.brd, cursor: "pointer",
            transition: "background .12s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5
          }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Recusar
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — CHAT IA
══════════════════════════════════════════════════ */
export default function ChatIA({
  projects, routines, tasks, profile,
  groqApiKey, setTasks, setRoutines, setProjects,
  onClose, isDesktop
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [qaCount, setQaCount] = useState(0);
  const [qaAnswers, setQaAnswers] = useState([]);
  const [currentQa, setCurrentQa] = useState(null); // { pergunta, opcoes }
  const [rejectedNames, setRejectedNames] = useState(new Set());
  const [acceptedKeys, setAcceptedKeys] = useState(new Set());
  const [cardStates, setCardStates] = useState({}); // key -> "pending"|"accepted"|"rejected"
  const messagesEndRef = useRef(null);
  const conversationRef = useRef([]); // histórico para enviar à API
  const currentQaRef = useRef(null); // ref anti-stale para closures
  const qaCountRef = useRef(0);
  const qaAnswersRef = useRef([]);

  const hasHistory = useMemo(() => {
    return tasks.length > 0 || routines.length > 0 || projects.length > 0;
  }, [tasks, routines, projects]);

  // Sincroniza refs
  useEffect(() => { currentQaRef.current = currentQa; }, [currentQa]);
  useEffect(() => { qaCountRef.current = qaCount; }, [qaCount]);
  useEffect(() => { qaAnswersRef.current = qaAnswers; }, [qaAnswers]);

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages, loading]);

  const addMsg = (role, content, meta = null) => {
    const id = uid();
    setMessages(prev => [...prev, { id, role, content, meta, ts: Date.now() }]);
    return id;
  };

  /* Envia mensagem à Groq e processa resposta */
  const sendToGroq = async (userText, autoPrompt = null) => {
    setLoading(true);
    try {
      // Monta histórico de conversa para enviar
      const history = conversationRef.current;
      const userContent = autoPrompt || userText;

      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userContent }
      ];

      // Adiciona ao histórico local
      conversationRef.current = [...history, { role: "user", content: userContent }];

      const raw = await callGroq(groqApiKey, apiMessages);
      conversationRef.current = [...conversationRef.current, { role: "assistant", content: raw }];

      const parsed = parseAIResponse(raw);

      if (parsed.tipo === "sugestoes") {
        const valid = (parsed.sugestoes || []).filter(s => !rejectedNames.has(s.nome));
        // Gera key única por sugestão para controle individual
        const msgId = uid();
        const initialStates = {};
        valid.forEach(s => { initialStates[msgId + "_" + s.nome] = "pending"; });
        setCardStates(prev => ({ ...prev, ...initialStates }));
        addMsg("assistant", parsed.mensagem || "", { tipo: "sugestoes", sugestoes: valid, msgId });
      } else if (parsed.tipo === "questionario") {
        const qa = { pergunta: parsed.pergunta, opcoes: parsed.opcoes || [] };
        setCurrentQa(qa);
        addMsg("assistant", (parsed.mensagem ? parsed.mensagem + "\n\n" : "") + parsed.pergunta, { tipo: "questionario", opcoes: parsed.opcoes || [] });
      } else if (parsed.tipo === "fora_escopo") {
        addMsg("assistant", parsed.mensagem || "Este chat é focado em sugestão de atividades.");
      } else {
        addMsg("assistant", parsed.mensagem || raw);
      }
    } catch (e) {
      addMsg("assistant", "❌ " + (e.message || "Erro ao conectar com a IA. Verifique sua chave Groq em Configurações."));
    }
    setLoading(false);
  };

  /* Inicia o chat — com ou sem histórico */
  const handleStart = async () => {
    setStarted(true);
    if (!groqApiKey) {
      addMsg("assistant", "⚠️ Chave da API Groq não configurada. Vá em Perfil → Configurações e insira sua chave Groq gratuita para usar este assistente.");
      return;
    }
    if (hasHistory) {
      const ctx = buildUserContext(projects, routines, tasks, profile);
      const prompt = `Analise o perfil e histórico do usuário abaixo e sugira entre 3 e 4 atividades personalizadas. Busque padrões para recomendar projetos ou rotinas quando fizer sentido.\n\n${ctx}`;
      addMsg("user", "Quero sugestões baseadas no meu histórico");
      await sendToGroq(null, prompt);
    } else {
      await sendToGroq(null, "O usuário é completamente novo e não tem nenhuma atividade ainda. Inicie o questionário com a pergunta 1.");
    }
  };

  /* Envia mensagem manual ou resposta de opção */
  const handleSend = async (textOverride = null) => {
    const text = textOverride ?? input.trim();
    if (!text || loading) return;
    if (!textOverride) setInput("");

    addMsg("user", text);

    // Verifica se é resposta ao questionário
    const qa = currentQaRef.current;
    const count = qaCountRef.current + 1;
    const answers = [...qaAnswersRef.current, { pergunta: qa?.pergunta || "", resposta: text }];

    if (qa) {
      setCurrentQa(null);
      setQaCount(count);
      setQaAnswers(answers);

      if (count >= 5) {
        const ctx = answers.map((a, i) => `P${i + 1}: ${a.pergunta}\nR: ${a.resposta}`).join("\n\n");
        await sendToGroq(null, `${text}\n\n=== RESUMO DO QUESTIONÁRIO ===\n${ctx}\n\nAgora, com base em todas as respostas, sugira entre 3 e 4 atividades iniciais altamente personalizadas para este usuário.`);
      } else {
        await sendToGroq(text);
      }
    } else {
      await sendToGroq(text);
    }
  };

  /* Aceitar sugestão — cria a atividade diretamente */
  const handleAccept = (key, suggestion) => {
    setCardStates(prev => ({ ...prev, [key]: "accepted" }));

    const newId = uid();
    const now = td();

    if (suggestion.tipo === "task") {
      setTasks(prev => [...prev, {
        id: newId, name: suggestion.nome,
        description: suggestion.descricao || "",
        difficulty: suggestion.dificuldade || 5,
        category: suggestion.categoria || "",
        status: "Pendente", createdAt: now
      }]);
    } else if (suggestion.tipo === "routine") {
      setRoutines(prev => [...prev, {
        id: newId, name: suggestion.nome,
        description: suggestion.descricao || "",
        difficulty: suggestion.dificuldade || 5,
        category: suggestion.categoria || "",
        freq: "Diária", days: [],
        createdAt: now, status: "Ativa",
        xpAccum: 0, streak: 0, bestStreak: 0,
        totalCompletions: 0, consecutiveFails: 0, completionLog: []
      }]);
    } else if (suggestion.tipo === "project") {
      setProjects(prev => [...prev, {
        id: newId, name: suggestion.nome,
        objective: suggestion.descricao || "",
        difficulty: suggestion.dificuldade || 5,
        category: suggestion.categoria || "",
        color: "#534AB7", phases: [],
        createdAt: now, status: "Ativo",
        xpAccum: 0, progress: 0
      }]);
    }
  };

  /* Recusar sugestão */
  const handleReject = (key, suggestion) => {
    setCardStates(prev => ({ ...prev, [key]: "rejected" }));
    setRejectedNames(prev => new Set([...prev, suggestion.nome]));
  };

  /* Layout responsivo */
  const panelStyle = isDesktop ? {
    position: "fixed", right: 0, top: 0, bottom: 0,
    width: 420, zIndex: 300,
    background: C.bg, borderLeft: "0.5px solid " + C.brd,
    display: "flex", flexDirection: "column",
    boxShadow: "-6px 0 32px #00000050"
  } : {
    position: "fixed", inset: 0, zIndex: 500,
    background: C.bg, display: "flex", flexDirection: "column"
  };

  return (
    <>
      {/* Backdrop */}
      {isDesktop && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, zIndex: 299,
          background: "#00000045", backdropFilter: "blur(2px)"
        }} />
      )}
      <style>{`
        @keyframes iaTyping{0%,80%,100%{transform:scale(0.5);opacity:0.3}40%{transform:scale(1);opacity:1}}
        @keyframes iaSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ia-msg{animation:iaSlide .2s ease}
        .ia-opt-btn:hover{filter:brightness(1.1)}
        .ia-opt-btn:active{opacity:.75}
      `}</style>

      <div style={panelStyle}>
        {/* ── Header ── */}
        <div style={{
          padding: "13px 16px", flexShrink: 0,
          borderBottom: "0.5px solid " + C.brd,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 17, flexShrink: 0,
            background: "linear-gradient(135deg,#534AB722,#9b59b622)",
            border: "1px solid #534AB760",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>✨</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.tx }}>Assistente IA</div>
            <div style={{ fontSize: 10, color: C.tx4 }}>Sugestões personalizadas de atividades</div>
          </div>
          <span
            onClick={onClose}
            style={{ cursor: "pointer", padding: "4px", color: C.tx3, display: "flex", alignItems: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </div>

        {/* ── Tela de boas-vindas (antes de iniciar) ── */}
        {!started && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, overflowY: "auto" }}>
            <div style={{
              background: "linear-gradient(135deg,#534AB712,#9b59b610)",
              border: "1px solid #534AB740", borderRadius: 12, padding: 16, marginBottom: 14
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 8 }}>🤖 O que este chat faz:</div>
              <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.7, marginBottom: 4 }}>
                Analisa seu histórico e sugere <strong style={{ color: C.tx2 }}>tarefas, rotinas e projetos</strong> personalizados para você evoluir no que importa.
              </div>
              <div style={{ fontSize: 11, color: C.tx4, lineHeight: 1.6 }}>
                Cada sugestão aparece como um convite — você escolhe aceitar ou recusar.
              </div>
            </div>

            {/* Exemplos visuais */}
            {[
              { icon: "📋", label: "TAREFA", desc: "Ação pontual e imediata", color: C.orange },
              { icon: "🔄", label: "ROTINA", desc: "Hábito recorrente que você repete", color: C.purple },
              { icon: "🗂️", label: "PROJETO", desc: "Meta maior com várias etapas", color: C.gold },
            ].map(({ icon, label, desc, color }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", background: C.card, borderRadius: 8,
                border: "0.5px solid " + C.brd, marginBottom: 6
              }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.8 }}>{label}</span>
                  <div style={{ fontSize: 11, color: C.tx3 }}>{desc}</div>
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 8, padding: "8px 12px", background: C.card,
              border: "0.5px solid " + C.brd2, borderRadius: 8,
              fontSize: 10, color: C.tx4, lineHeight: 1.6
            }}>
              ⚠️ Este chat <em>não responde perguntas gerais</em>. É focado exclusivamente em sugerir atividades para o seu crescimento.
            </div>

            <div style={{ flex: 1 }} />

            {!groqApiKey ? (
              <div style={{
                padding: "10px 14px", background: C.card,
                border: "1px solid " + C.orange + "50", borderRadius: 10,
                fontSize: 11, color: C.orange, lineHeight: 1.6, textAlign: "center"
              }}>
                ⚠️ Configure sua chave da API Groq em <strong>Perfil → Configurações</strong> para usar este assistente.
              </div>
            ) : (
              <button
                onClick={handleStart}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: "linear-gradient(135deg," + C.goldDim + "," + C.gold + "18)",
                  color: C.gold, border: "1px solid " + C.goldBrd,
                  transition: "filter .12s", letterSpacing: 0.3
                }}>
                {hasHistory ? "🔍 Analisar meu histórico →" : "📝 Responder questionário →"}
              </button>
            )}
          </div>
        )}

        {/* ── Área de mensagens ── */}
        {started && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>
              {messages.map(msg => (
                <div key={msg.id} className="ia-msg">
                  {/* Mensagem do usuário */}
                  {msg.role === "user" && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                      <div style={{
                        maxWidth: "80%", padding: "8px 12px",
                        borderRadius: "12px 12px 3px 12px",
                        background: C.goldDim, border: "1px solid " + C.goldBrd,
                        fontSize: 11, color: C.tx, lineHeight: 1.55
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  )}

                  {/* Mensagem da IA */}
                  {msg.role === "assistant" && (
                    <div style={{ marginBottom: 10 }}>
                      {msg.content && (
                        <div style={{
                          display: "inline-block", maxWidth: "88%",
                          padding: "8px 12px", borderRadius: "12px 12px 12px 3px",
                          background: C.card, border: "0.5px solid " + C.brd,
                          fontSize: 11, color: C.tx2, lineHeight: 1.6,
                          marginBottom: msg.meta?.tipo === "sugestoes" ? 10 : (msg.meta?.tipo === "questionario" ? 8 : 0),
                          whiteSpace: "pre-wrap"
                        }}>
                          {msg.content}
                        </div>
                      )}

                      {/* Opções do questionário */}
                      {msg.meta?.tipo === "questionario" && msg.meta.opcoes?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                          {msg.meta.opcoes.map((opt, i) => (
                            <button
                              key={i}
                              className="ia-opt-btn"
                              onClick={() => handleSend(opt)}
                              style={{
                                padding: "7px 12px", borderRadius: 7, fontSize: 11,
                                textAlign: "left", background: C.bg, color: C.tx3,
                                border: "0.5px solid " + C.brd, cursor: "pointer",
                                transition: "filter .12s"
                              }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Cards de sugestão */}
                      {msg.meta?.tipo === "sugestoes" && (msg.meta.sugestoes || []).map(s => {
                        const key = msg.meta.msgId + "_" + s.nome;
                        const state = cardStates[key];
                        if (state === "rejected") return null;
                        return (
                          <SuggestionCard
                            key={key}
                            suggestion={s}
                            accepted={state === "accepted"}
                            onAccept={() => handleAccept(key, s)}
                            onReject={() => handleReject(key, s)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading dots */}
              {loading && (
                <div style={{ display: "flex", gap: 5, padding: "6px 0", marginBottom: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: 4,
                      background: C.gold + "90",
                      animation: `iaTyping 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div style={{
              padding: "10px 12px", flexShrink: 0,
              borderTop: "0.5px solid " + C.brd,
              display: "flex", gap: 8, alignItems: "flex-end"
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={currentQa ? "Digite sua resposta ou escolha uma opção acima..." : "Peça mais sugestões ou refine..."}
                rows={1}
                style={{
                  flex: 1, padding: "8px 10px",
                  background: C.card, border: "1px solid " + C.brd2,
                  borderRadius: 8, color: C.tx, fontSize: 11,
                  fontFamily: "inherit", outline: "none", resize: "none",
                  lineHeight: 1.5, maxHeight: 80, overflowY: "auto"
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: input.trim() && !loading ? C.goldDim : "transparent",
                  border: "1px solid " + (input.trim() && !loading ? C.goldBrd : C.brd),
                  color: input.trim() && !loading ? C.gold : C.tx4,
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .12s, color .12s, border-color .12s"
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
