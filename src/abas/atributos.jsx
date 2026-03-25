import { useState, useEffect, useRef } from "react";
import { C } from '../temas.js';
import { uid, td } from '../utilidades.js';
import { COLORS } from '../constantes.js';
import { Btn, Card, Badge, TopBar, Field, Input, ColorPick, SLabel, Modal, ConfirmModal } from '../componentes-base.jsx';

/* ══════════════════════════════════════════
   GROQ API — geração de questionário via IA
══════════════════════════════════════════ */

async function gerarQuestionarioGroq(atributo, apiKey, tentativa = 0) {
  const MAX_TENTATIVAS = 3;

  const instrucaoFormato = tentativa === 0
    ? "Retorne APENAS JSON válido, sem markdown, sem texto adicional."
    : tentativa === 1
    ? "ATENÇÃO: Retorne SOMENTE o objeto JSON puro, sem ```json, sem texto antes ou depois."
    : "Responda APENAS com JSON puro. Sem qualquer texto fora do JSON. Estrutura exata abaixo.";

  const prompt = `Você é especialista em psicometria e avaliação comportamental. Crie um questionário para avaliar o atributo pessoal descrito.

ATRIBUTO:
Nome: ${atributo.nome}
${atributo.definicao ? `Definição: ${atributo.definicao}` : ""}
${atributo.contexto ? `Contexto: ${atributo.contexto}` : ""}
${(atributo.comportamentos || []).length ? `Comportamentos relacionados: ${atributo.comportamentos.join(", ")}` : ""}

REQUISITOS:
- Exatamente 10 perguntas
- Mix obrigatório: 4-5 tipo "likert" (escala 1-5), 3-4 tipo "multipla_escolha" (4 opções), 1-2 tipo "frequencia" (5 níveis)
- Perguntas específicas e comportamentais (não filosóficas nem genéricas)
- Relacionadas diretamente à definição e comportamentos do atributo
- Em português do Brasil

${instrucaoFormato}

ESTRUTURA JSON OBRIGATÓRIA (sem variações):
{
  "questoes": [
    {
      "id": 1,
      "tipo": "likert",
      "texto": "texto da pergunta aqui",
      "escala_min": "Discordo totalmente",
      "escala_max": "Concordo totalmente"
    },
    {
      "id": 2,
      "tipo": "multipla_escolha",
      "texto": "texto da pergunta aqui",
      "opcoes": [
        {"valor": 1, "texto": "opção A"},
        {"valor": 2, "texto": "opção B"},
        {"valor": 3, "texto": "opção C"},
        {"valor": 4, "texto": "opção D"}
      ]
    },
    {
      "id": 3,
      "tipo": "frequencia",
      "texto": "texto da pergunta aqui",
      "opcoes": ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
    }
  ],
  "maximo_pontos": 50,
  "interpretacoes": [
    {"min": 0, "max": 25, "texto": "Desenvolvimento inicial nesta área"},
    {"min": 26, "max": 37, "texto": "Desenvolvimento moderado"},
    {"min": 38, "max": 45, "texto": "Bom desenvolvimento"},
    {"min": 46, "max": 50, "texto": "Excelente desenvolvimento"}
  ]
}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 3000
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Erro na API: ${response.status}${errText ? " — " + errText.slice(0, 100) : ""}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Limpar e parsear JSON
  let parsed;
  try {
    let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
    parsed = JSON.parse(cleaned);
  } catch {
    if (tentativa < MAX_TENTATIVAS - 1) {
      return gerarQuestionarioGroq(atributo, apiKey, tentativa + 1);
    }
    throw new Error("Não foi possível gerar um questionário válido após 3 tentativas. Tente novamente.");
  }

  // Validar estrutura
  if (!parsed.questoes || !Array.isArray(parsed.questoes) || parsed.questoes.length < 5) {
    if (tentativa < MAX_TENTATIVAS - 1) {
      return gerarQuestionarioGroq(atributo, apiKey, tentativa + 1);
    }
    throw new Error("Questionário incompleto gerado. Tente novamente.");
  }

  // Garantir maximo_pontos
  if (!parsed.maximo_pontos) {
    parsed.maximo_pontos = parsed.questoes.length * 5;
  }

  // Garantir interpretacoes padrão se ausente
  if (!parsed.interpretacoes || !Array.isArray(parsed.interpretacoes)) {
    const max = parsed.maximo_pontos;
    parsed.interpretacoes = [
      { min: 0, max: Math.round(max * 0.4), texto: "Desenvolvimento inicial" },
      { min: Math.round(max * 0.4) + 1, max: Math.round(max * 0.65), texto: "Desenvolvimento moderado" },
      { min: Math.round(max * 0.65) + 1, max: Math.round(max * 0.85), texto: "Bom desenvolvimento" },
      { min: Math.round(max * 0.85) + 1, max: max, texto: "Excelente desenvolvimento" },
    ];
  }

  return parsed;
}

function calcularScore(respostas, questionario) {
  let soma = 0;
  (questionario.questoes || []).forEach((q, i) => {
    const resp = respostas[i];
    if (resp === undefined || resp === null) return;
    soma += Number(resp);
  });
  const max = questionario.maximo_pontos || questionario.questoes.length * 5;
  return Math.min(100, Math.max(0, Math.round((soma / max) * 100)));
}

function getInterpretacao(score, questionario) {
  // score é 0-100, precisa converter para pontos brutos
  const max = questionario.maximo_pontos || 50;
  const pontos = Math.round((score / 100) * max);
  const interps = questionario.interpretacoes || [];
  for (const i of interps) {
    if (pontos >= i.min && pontos <= i.max) return i.texto;
  }
  return "";
}

/* ══════════════════════════════════════════
   RADAR CHART — gráfico de teia SVG
══════════════════════════════════════════ */

function RadarChart({ atributos, size = 260 }) {
  const dados = atributos.filter(a => a.historico && a.historico.length > 0);
  const n = dados.length;

  if (n < 3) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ display: "block", margin: "0 auto 10px", opacity: 0.25 }}>
          <polygon points="32,4 60,20 60,44 32,60 4,44 4,20" fill="none" stroke={C.tx3} strokeWidth="2" />
          <polygon points="32,14 50,24 50,40 32,50 14,40 14,24" fill="none" stroke={C.tx3} strokeWidth="1" />
          <polygon points="32,22 42,28 42,36 32,42 22,36 22,28" fill="none" stroke={C.tx3} strokeWidth="1" />
        </svg>
        <div style={{ fontSize: 11, color: C.tx3 }}>
          Responda ao menos 3 questionários<br />para visualizar o gráfico
        </div>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.33;
  const labelR = r + 22;
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getAngle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const getPoint = (i, pct) => ({
    x: cx + r * pct * Math.cos(getAngle(i)),
    y: cy + r * pct * Math.sin(getAngle(i)),
  });

  // Polígonos de grid
  const gridPolygons = gridLevels.map(level =>
    dados.map((_, i) => {
      const p = getPoint(i, level);
      return `${p.x},${p.y}`;
    }).join(" ")
  );

  // Pontos dos dados
  const dataPoints = dados.map((a, i) => {
    const score = a.historico[a.historico.length - 1]?.score || 0;
    return getPoint(i, score / 100);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  // Labels
  const labels = dados.map((a, i) => {
    const angle = getAngle(i);
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    const anchor = Math.abs(Math.cos(angle)) < 0.1 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
    const nome = a.nome.length > 11 ? a.nome.slice(0, 10) + "…" : a.nome;
    const score = a.historico[a.historico.length - 1]?.score || 0;
    return { lx, ly, anchor, nome, score, cor: a.cor };
  });

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      {/* Grid polygons */}
      {gridPolygons.map((pts, gi) => (
        <polygon key={gi} points={pts} fill="none" stroke={C.brd} strokeWidth={gi === 4 ? "0.8" : "0.5"} />
      ))}

      {/* Percentual no grid */}
      {gridLevels.map((lv, gi) => {
        const p = getPoint(0, lv);
        return (
          <text key={gi} x={p.x + 2} y={p.y - 2} fontSize="5.5" fill={C.tx4} textAnchor="start">
            {Math.round(lv * 100)}%
          </text>
        );
      })}

      {/* Linhas dos eixos */}
      {dados.map((_, i) => {
        const end = getPoint(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={C.brd} strokeWidth="0.5" />;
      })}

      {/* Polígono dos dados */}
      <polygon points={dataPolygon} fill={C.gold + "22"} stroke={C.gold} strokeWidth="1.5" />

      {/* Pontos nos vértices */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={dados[i].cor || C.gold} stroke={C.bg} strokeWidth="1" />
      ))}

      {/* Labels */}
      {labels.map((l, i) => (
        <g key={i}>
          <text x={l.lx} y={l.ly - 3} textAnchor={l.anchor} fontSize="7.5" fill={l.cor || C.tx3} fontWeight="500">
            {l.nome}
          </text>
          <text x={l.lx} y={l.ly + 8} textAnchor={l.anchor} fontSize="7" fill={C.tx4}>
            {l.score}%
          </text>
        </g>
      ))}

      {/* Centro */}
      <circle cx={cx} cy={cy} r={2} fill={C.gold + "60"} />
    </svg>
  );
}

/* ══════════════════════════════════════════
   FORMULÁRIO DE ATRIBUTO
══════════════════════════════════════════ */

function AtributoForm({ item, onSave, onCancel, groqApiKey, onGerarQuestionario }) {
  const [nome, setNome] = useState(item?.nome || "");
  const [definicao, setDefinicao] = useState(item?.definicao || "");
  const [contexto, setContexto] = useState(item?.contexto || "");
  const [comportamentoInput, setComportamentoInput] = useState("");
  const [comportamentos, setComportamentos] = useState(item?.comportamentos || []);
  const [cor, setCor] = useState(item?.cor || COLORS[1]);

  const addComportamento = () => {
    const v = comportamentoInput.trim();
    if (v && !comportamentos.includes(v)) {
      setComportamentos(prev => [...prev, v]);
    }
    setComportamentoInput("");
  };

  const rmComportamento = (idx) => setComportamentos(prev => prev.filter((_, i) => i !== idx));

  const save = () => {
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), definicao, contexto, comportamentos, cor });
  };

  return (
    <div style={{ padding: 14 }}>
      <TopBar title={item ? "Editar Atributo" : "Novo Atributo"} onBack={onCancel} />

      <Field label="Nome" req>
        <Input value={nome} onChange={setNome} placeholder="Ex: Coragem, Disciplina, Saúde..." />
      </Field>

      <Field label="O que significa para você?">
        <Input value={definicao} onChange={setDefinicao} placeholder="Descreva o que você quer desenvolver nessa área" multiline />
      </Field>

      <Field label="Contexto">
        <Input value={contexto} onChange={setContexto} placeholder="Ex: Pessoal, profissional, relações..." />
      </Field>

      <Field label="Comportamentos relacionados">
        <div style={{ display: "flex", gap: 6, marginBottom: comportamentos.length ? 6 : 0 }}>
          <Input
            value={comportamentoInput}
            onChange={setComportamentoInput}
            placeholder="Ex: Falar verdade, acordar cedo..."
            style={{ flex: 1 }}
          />
          <Btn small primary onClick={addComportamento}>+</Btn>
        </div>
        {comportamentos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {comportamentos.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: C.goldDim, border: "0.5px solid " + C.goldBrd, borderRadius: 12, fontSize: 11, color: C.gold }}>
                {c}
                <span onClick={() => rmComportamento(i)} style={{ cursor: "pointer", color: C.tx4, marginLeft: 2, fontSize: 13, lineHeight: 1 }}>×</span>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="Cor">
        <ColorPick value={cor} onChange={setCor} />
      </Field>

      {!groqApiKey && (
        <div style={{ background: C.card, border: "1px solid " + C.orange + "40", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.orange, marginBottom: 3, fontWeight: 500 }}>Chave da API não configurada</div>
          <div style={{ fontSize: 11, color: C.tx3 }}>Configure a chave da API Groq em Perfil → Configurações para gerar questionários automaticamente.</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn primary onClick={save} style={{ flex: 1 }}>
          {item ? "Salvar" : "Criar Atributo"}
        </Btn>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   UI DE QUESTIONÁRIO — responder perguntas
══════════════════════════════════════════ */

function QuestionarioUI({ atributo, onConcluir, onCancelar }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime]);

  const questoes = atributo.questionario?.questoes || [];
  const total = questoes.length;
  const q = questoes[currentIdx];

  if (!q) return null;

  const setResp = (val) => setRespostas(r => ({ ...r, [currentIdx]: val }));

  const podeAvancar = respostas[currentIdx] !== undefined;
  const isUltima = currentIdx === total - 1;
  const respondidas = Object.keys(respostas).length;

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const concluir = () => {
    const score = calcularScore(
      questoes.map((_, i) => respostas[i] || 0),
      atributo.questionario
    );
    onConcluir({ score, respostas: questoes.map((_, i) => respostas[i] || 0), tempoSegundos: elapsed });
  };

  return (
    <div style={{ padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span onClick={onCancelar} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.tx }}>{atributo.nome}</div>
            <div style={{ fontSize: 11, color: C.tx4 }}>Questionário de avaliação</div>
          </div>
        </div>
        {/* Cronômetro */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: C.card, borderRadius: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span style={{ fontSize: 12, color: C.tx4, fontVariantNumeric: "tabular-nums" }}>{fmtTime(elapsed)}</span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx4, marginBottom: 4 }}>
          <span>Pergunta {currentIdx + 1} de {total}</span>
          <span style={{ color: respondidas >= total ? C.green : C.tx4 }}>{respondidas}/{total} respondidas</span>
        </div>
        <div style={{ height: 3, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: ((currentIdx + 1) / total * 100) + "%", background: C.gold, borderRadius: 2, transition: "width .3s" }} />
        </div>
      </div>

      {/* Pergunta */}
      <Card style={{ marginBottom: 14, borderLeft: "3px solid " + (atributo.cor || C.gold) }}>
        <div style={{ fontSize: 11, color: C.tx4, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {q.tipo === "likert" ? "Escala de concordância" : q.tipo === "frequencia" ? "Frequência" : "Escolha uma opção"}
        </div>
        <div style={{ fontSize: 13, color: C.tx, lineHeight: 1.6, fontWeight: 500 }}>{q.texto}</div>
      </Card>

      {/* Opções de resposta */}
      {q.tipo === "likert" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.tx4, marginBottom: 8, paddingLeft: 2, paddingRight: 2 }}>
            <span>{q.escala_min || "Discordo totalmente"}</span>
            <span>{q.escala_max || "Concordo totalmente"}</span>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[1, 2, 3, 4, 5].map(v => {
              const sel = respostas[currentIdx] === v;
              return (
                <div
                  key={v}
                  onClick={() => setResp(v)}
                  style={{
                    width: 44, height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    background: sel ? (atributo.cor || C.gold) : C.card,
                    color: sel ? C.bg : C.tx2,
                    border: "1.5px solid " + (sel ? (atributo.cor || C.gold) : C.brd2),
                    transition: "background .12s, color .12s, border-color .12s",
                    boxShadow: sel ? "0 2px 8px " + (atributo.cor || C.gold) + "40" : "none",
                  }}
                >{v}</div>
              );
            })}
          </div>
        </div>
      )}

      {q.tipo === "frequencia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {(q.opcoes || ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]).map((op, idx) => {
            const val = idx + 1;
            const sel = respostas[currentIdx] === val;
            return (
              <div
                key={idx}
                onClick={() => setResp(val)}
                style={{
                  padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: sel ? 500 : 400,
                  background: sel ? (atributo.cor || C.gold) + "20" : C.card,
                  color: sel ? (atributo.cor || C.gold) : C.tx2,
                  border: "1px solid " + (sel ? (atributo.cor || C.gold) + "80" : C.brd),
                  transition: "background .12s, color .12s, border-color .12s",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span>{op}</span>
                {sel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
            );
          })}
        </div>
      )}

      {q.tipo === "multipla_escolha" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {(q.opcoes || []).map((op) => {
            const sel = respostas[currentIdx] === op.valor;
            return (
              <div
                key={op.valor}
                onClick={() => setResp(op.valor)}
                style={{
                  padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: sel ? 500 : 400,
                  background: sel ? (atributo.cor || C.gold) + "20" : C.card,
                  color: sel ? (atributo.cor || C.gold) : C.tx2,
                  border: "1px solid " + (sel ? (atributo.cor || C.gold) + "80" : C.brd),
                  transition: "background .12s, color .12s, border-color .12s",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 9, border: "1.5px solid " + (sel ? (atributo.cor || C.gold) : C.brd2), background: sel ? (atributo.cor || C.gold) : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .12s, border-color .12s" }}>
                  {sel && <div style={{ width: 8, height: 8, borderRadius: 4, background: C.bg }} />}
                </div>
                <span style={{ flex: 1 }}>{op.texto}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Navegação */}
      <div style={{ display: "flex", gap: 8 }}>
        {currentIdx > 0 && (
          <Btn onClick={() => setCurrentIdx(i => i - 1)} style={{ flex: 1 }}>
            ← Anterior
          </Btn>
        )}
        {!isUltima ? (
          <Btn primary onClick={() => { if (podeAvancar) setCurrentIdx(i => i + 1); }} style={{ flex: 1, opacity: podeAvancar ? 1 : 0.5 }}>
            Próxima →
          </Btn>
        ) : (
          <Btn primary onClick={concluir} style={{ flex: 1, opacity: respondidas >= total ? 1 : 0.5 }}>
            {respondidas >= total ? "Ver Resultado" : `Responda todas (${respondidas}/${total})`}
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   RESULTADO DO QUESTIONÁRIO
══════════════════════════════════════════ */

function ResultadoView({ atributo, score, onVoltar }) {
  const interpretacao = getInterpretacao(score, atributo.questionario);
  const historico = atributo.historico || [];
  const anterior = historico.length >= 2 ? historico[historico.length - 2].score : null;
  const delta = anterior !== null ? score - anterior : null;

  const getCor = (s) => {
    if (s >= 75) return C.green;
    if (s >= 50) return C.gold;
    if (s >= 25) return C.orange;
    return C.red || "#e74c3c";
  };
  const cor = getCor(score);
  const corAttr = atributo.cor || C.gold;

  return (
    <div style={{ padding: 14 }}>
      <TopBar title="Resultado" onBack={onVoltar} />

      {/* Score principal */}
      <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
        <div style={{ marginBottom: 10 }}>
          <svg viewBox="0 0 120 120" width="130" height="130" style={{ display: "block", margin: "0 auto" }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke={C.brd} strokeWidth="8" />
            <circle cx="60" cy="60" r="50" fill="none" stroke={corAttr} strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 50 * score / 100} ${2 * Math.PI * 50 * (1 - score / 100)}`}
              strokeDashoffset={2 * Math.PI * 50 * 0.25}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
            <text x="60" y="55" textAnchor="middle" fontSize="26" fontWeight="700" fill={C.tx}>{score}%</text>
            <text x="60" y="72" textAnchor="middle" fontSize="9" fill={C.tx4}>{atributo.nome}</text>
          </svg>
        </div>

        {interpretacao && (
          <div style={{ display: "inline-block", background: corAttr + "18", border: "1px solid " + corAttr + "40", borderRadius: 12, padding: "4px 14px", fontSize: 12, color: corAttr, fontWeight: 500 }}>
            {interpretacao}
          </div>
        )}

        {delta !== null && (
          <div style={{ marginTop: 10, fontSize: 12, color: delta > 0 ? C.green : delta < 0 ? (C.red || "#e74c3c") : C.tx4, fontWeight: 500 }}>
            {delta > 0 ? "↑ +" : delta < 0 ? "↓ " : "→ "}{Math.abs(delta)}% vs última medição
          </div>
        )}
      </div>

      {/* Histórico resumido */}
      {historico.length > 1 && (
        <Card style={{ marginBottom: 12 }}>
          <SLabel>Histórico de medições</SLabel>
          {[...historico].reverse().slice(0, 5).map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < Math.min(historico.length - 1, 4) ? "0.5px solid " + C.brd : "none" }}>
              <span style={{ fontSize: 11, color: C.tx4, flex: 1 }}>{h.data ? h.data.slice(0, 10) : "—"}</span>
              <div style={{ flex: 2, height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: h.score + "%", background: corAttr, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: getCor(h.score), minWidth: 34, textAlign: "right" }}>{h.score}%</span>
            </div>
          ))}
        </Card>
      )}

      <Btn primary onClick={onVoltar} style={{ width: "100%" }}>
        Fechar
      </Btn>
    </div>
  );
}

/* ══════════════════════════════════════════
   ABA PRINCIPAL DE ATRIBUTOS
══════════════════════════════════════════ */

export function AtributosSection({ atributos, setAtributos, groqApiKey, subTab }) {
  const [view, setView] = useState("lista"); // "lista" | "criar" | "editar" | "gerando" | "responder" | "resultado"
  const [selected, setSelected] = useState(null);
  const [gerandoId, setGerandoId] = useState(null);
  const [erroGeracao, setErroGeracao] = useState(null);
  const [resultadoRecente, setResultadoRecente] = useState(null); // {score}
  const [confirmDelete, setConfirmDelete] = useState(null);

  const criarAtributo = (dados) => {
    const novo = {
      id: uid(),
      criadoEm: td(),
      historico: [],
      questionario: null,
      scoreAtual: null,
      ...dados,
    };
    setAtributos(prev => [...prev, novo]);

    // Se há API key, gerar questionário automaticamente
    if (groqApiKey) {
      gerarQuestionario(novo);
    }
    setView("lista");
  };

  const editarAtributo = (dados) => {
    const atualizado = { ...selected, ...dados };
    setAtributos(prev => prev.map(a => a.id === selected.id ? atualizado : a));

    // Regen questionário se mudou definição ou nome
    if (groqApiKey && (dados.nome !== selected.nome || dados.definicao !== selected.definicao || dados.comportamentos?.join() !== selected.comportamentos?.join())) {
      gerarQuestionario(atualizado);
    }
    setView("lista");
    setSelected(null);
  };

  const deletarAtributo = (id) => {
    setAtributos(prev => prev.filter(a => a.id !== id));
    setConfirmDelete(null);
  };

  const gerarQuestionario = async (atributo) => {
    if (!groqApiKey) return;
    setGerandoId(atributo.id);
    setErroGeracao(null);
    try {
      const q = await gerarQuestionarioGroq(atributo, groqApiKey);
      setAtributos(prev => prev.map(a => a.id === atributo.id ? { ...a, questionario: q } : a));
    } catch (e) {
      setErroGeracao({ id: atributo.id, msg: e.message });
    } finally {
      setGerandoId(null);
    }
  };

  const concluirQuestionario = ({ score, respostas, tempoSegundos }) => {
    const entrada = {
      data: new Date().toISOString(),
      respostas,
      score,
      tempoSegundos,
    };
    setAtributos(prev => prev.map(a =>
      a.id === selected.id
        ? { ...a, historico: [...(a.historico || []), entrada], scoreAtual: score }
        : a
    ));
    // Atualiza selected localmente para mostrar resultado
    setSelected(prev => prev ? { ...prev, historico: [...(prev.historico || []), entrada], scoreAtual: score } : prev);
    setResultadoRecente({ score });
    setView("resultado");
  };

  /* ── Render: criando/editando ── */
  if (view === "criar") {
    return (
      <AtributoForm
        groqApiKey={groqApiKey}
        onSave={criarAtributo}
        onCancel={() => setView("lista")}
      />
    );
  }

  if (view === "editar" && selected) {
    return (
      <AtributoForm
        item={selected}
        groqApiKey={groqApiKey}
        onSave={editarAtributo}
        onCancel={() => { setView("lista"); setSelected(null); }}
      />
    );
  }

  /* ── Render: respondendo questionário ── */
  if (view === "responder" && selected) {
    return (
      <QuestionarioUI
        atributo={selected}
        onConcluir={concluirQuestionario}
        onCancelar={() => { setView("lista"); setSelected(null); }}
      />
    );
  }

  /* ── Render: resultado ── */
  if (view === "resultado" && selected) {
    return (
      <ResultadoView
        atributo={selected}
        score={resultadoRecente?.score ?? selected.scoreAtual ?? 0}
        onVoltar={() => { setView("lista"); setSelected(null); setResultadoRecente(null); }}
      />
    );
  }

  /* ── Render: lista principal ── */
  const temAtributos = atributos.length > 0;

  return (
    <div style={{ padding: 14 }}>
      {/* ── Sub-view: PROGRESSO (radar chart) ── */}
      {subTab === "progresso" && (
        <>
          {/* Radar chart */}
          {temAtributos ? (
            <Card style={{ marginBottom: 12, padding: "16px 8px" }}>
              <div style={{ fontSize: 11, color: C.tx2, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, textAlign: "center", marginBottom: 12 }}>
                Mapa de Desenvolvimento
              </div>
              <RadarChart atributos={atributos} size={260} />
            </Card>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 20px", color: C.tx3, fontSize: 11 }}>
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" style={{ display: "block", margin: "0 auto 10px", opacity: 0.3 }}>
                <polygon points="32,4 60,20 60,44 32,60 4,44 4,20" fill="none" stroke={C.tx3} strokeWidth="2.5" />
                <polygon points="32,16 48,25 48,39 32,48 16,39 16,25" fill="none" stroke={C.tx3} strokeWidth="1.5" />
              </svg>
              Crie atributos e responda questionários para ver seu progresso aqui
            </div>
          )}

          {/* Lista de atributos com scores */}
          {temAtributos && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.tx, marginBottom: 8, marginTop: 4 }}>
                Atributos ({atributos.length})
              </div>
              {atributos.map(a => {
                const score = a.scoreAtual ?? (a.historico?.length ? a.historico[a.historico.length - 1].score : null);
                const pendente = !a.questionario;
                const gerando = gerandoId === a.id;
                const erro = erroGeracao?.id === a.id;
                return (
                  <Card key={a.id} style={{ borderLeft: "3px solid " + (a.cor || C.gold), marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, marginBottom: 2 }}>{a.nome}</div>
                        {a.definicao && <div style={{ fontSize: 11, color: C.tx4, marginBottom: 4 }} >{a.definicao.length > 60 ? a.definicao.slice(0, 57) + "…" : a.definicao}</div>}
                        {gerando ? (
                          <div style={{ fontSize: 11, color: C.gold }}>Gerando questionário…</div>
                        ) : erro ? (
                          <div style={{ fontSize: 11, color: C.orange }}>Erro ao gerar. <span onClick={() => gerarQuestionario(a)} style={{ cursor: "pointer", textDecoration: "underline" }}>Tentar de novo</span></div>
                        ) : pendente ? (
                          <Badge color={C.orange}>Sem questionário</Badge>
                        ) : score !== null ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: score + "%", background: a.cor || C.gold, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: a.cor || C.gold }}>{score}%</span>
                          </div>
                        ) : (
                          <Badge color={C.purple}>Questionário pendente</Badge>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <span onClick={() => { setSelected(a); setView("editar"); }} style={{ cursor: "pointer", padding: 6, display: "flex", alignItems: "center", color: C.tx4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </span>
                        <span onClick={() => setConfirmDelete(a.id)} style={{ cursor: "pointer", padding: 6, display: "flex", alignItems: "center", color: C.tx4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ── Sub-view: QUESTIONÁRIOS ── */}
      {subTab === "questionarios" && (
        <>
          {!temAtributos ? (
            <div style={{ textAlign: "center", padding: "30px 20px", color: C.tx3, fontSize: 11 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px", opacity: 0.5 }}>
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Nenhum atributo ainda.<br />Crie um atributo na aba de Progresso.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: C.tx3, marginBottom: 12, lineHeight: 1.5 }}>
                Responda os questionários para medir seu progresso em cada atributo. Quanto mais você praticar, melhor será sua avaliação.
              </div>
              {atributos.map(a => {
                const score = a.scoreAtual ?? (a.historico?.length ? a.historico[a.historico.length - 1].score : null);
                const gerando = gerandoId === a.id;
                const erro = erroGeracao?.id === a.id;
                const temQuestionario = !!a.questionario;
                const ultimaMedicao = a.historico?.length ? a.historico[a.historico.length - 1].data?.slice(0, 10) : null;

                return (
                  <Card key={a.id} style={{ borderLeft: "3px solid " + (a.cor || C.gold), marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.tx }}>{a.nome}</span>
                          {!temQuestionario && !gerando && !erro && (
                            <Badge color={C.orange}>Pendente</Badge>
                          )}
                          {a.historico?.length > 0 && (
                            <Badge color={C.green}>✓ {a.historico.length}x medido</Badge>
                          )}
                        </div>
                        {ultimaMedicao && (
                          <div style={{ fontSize: 11, color: C.tx4 }}>Última medição: {ultimaMedicao}</div>
                        )}
                        {score !== null && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <div style={{ flex: 1, height: 5, background: C.brd, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: score + "%", background: a.cor || C.gold, borderRadius: 3, transition: "width .4s" }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: a.cor || C.gold, minWidth: 34, textAlign: "right" }}>{score}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {gerando ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                        <div style={{ width: 12, height: 12, border: "2px solid " + C.gold, borderTopColor: "transparent", borderRadius: 6, animation: "spin 0.8s linear infinite" }} />
                        <span style={{ fontSize: 11, color: C.gold }}>Gerando questionário com IA…</span>
                      </div>
                    ) : erro ? (
                      <div>
                        <div style={{ fontSize: 11, color: C.orange, marginBottom: 6 }}>Erro ao gerar: {erroGeracao.msg}</div>
                        <Btn small onClick={() => gerarQuestionario(a)}>Tentar novamente</Btn>
                      </div>
                    ) : !temQuestionario ? (
                      <div>
                        {groqApiKey ? (
                          <Btn small primary onClick={() => gerarQuestionario(a)}>
                            Gerar questionário com IA
                          </Btn>
                        ) : (
                          <div style={{ fontSize: 11, color: C.tx4 }}>Configure a API Groq em Perfil para gerar automaticamente.</div>
                        )}
                      </div>
                    ) : (
                      <Btn small primary onClick={() => { setSelected(a); setView("responder"); }} style={{ width: "100%" }}>
                        {score !== null ? "Refazer Questionário" : "Responder Questionário"}
                      </Btn>
                    )}
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}

      {/* Botão novo atributo — sempre visível */}
      <div style={{ marginTop: 12 }}>
        <Btn primary onClick={() => setView("criar")} style={{ width: "100%" }}>
          + Novo Atributo
        </Btn>
        {!groqApiKey && (
          <div style={{ fontSize: 11, color: C.tx4, textAlign: "center", marginTop: 8 }}>
            Dica: Configure sua chave Groq em Perfil para gerar questionários automaticamente.
          </div>
        )}
      </div>

      {/* Modal de confirmação de deleção */}
      {confirmDelete && (
        <ConfirmModal
          title="Deletar atributo?"
          subtitle="Todo o histórico de medições será perdido."
          actions={[
            { label: "Deletar", danger: true, onClick: () => deletarAtributo(confirmDelete) },
            { label: "Cancelar", onClick: () => setConfirmDelete(null) },
          ]}
        />
      )}
    </div>
  );
}

/* Animação spinner usada no loading */
const spinStyle = document.createElement("style");
spinStyle.textContent = `@keyframes spin{to{transform:rotate(360deg)}}`;
if (!document.head.querySelector("[data-atrib-spin]")) {
  spinStyle.setAttribute("data-atrib-spin", "1");
  document.head.appendChild(spinStyle);
}

export { RadarChart };
