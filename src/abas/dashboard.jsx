import { useState, useMemo } from "react";
import { C } from '../temas.js';
import { td, getLevelInfo, getMastery, getXp, getCoins, fmtD, fmtFreq, getMasteryBonus, getMultiplier, isRoutineDueToday, calcObjectiveXp, pickDailyMission, getMissionProgress, scoreNextAction, migrateFreq } from '../utilidades.js';
import { MISSION_POOL, MASTERY_LEVELS, PRI_ORDER, COLORS } from '../constantes.js';
import { ACHIEVEMENTS } from '../utilidades.js';
import { Btn, Card, Badge, PBar, XpBar, Chk, TopBar, FilterBtn, FilterModal } from '../componentes-base.jsx';
import { IconSVG, ConsumableSVG, BorderSVG, TitleBanner, MaestriaSVG, SHOP_BORDERS, SHOP_TITLES, getTitleTargetColor, getTitleBannerColor, getTitleStyle, getUpgradeCost, getBorderStyle, UPGRADE_LABELS, RARITY_LABELS, RARITY_COLORS } from '../icones.jsx';
import { AtributosSection } from './atributos.jsx';

function DashboardTab({ profile, levelInfo, projects, routines, tasks, objectives, nav, completeTask, completeRoutine, earn, claimMission, atributos, setAtributos, groqApiKey }) {
  const [dashSubTab, setDashSubTab] = useState("overview");
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({ key: null, mode: null });
  const [chartRange, setChartRange] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [nextActionSkip, setNextActionSkip] = useState(0);

  const allItems = useMemo(() => {
    const items = [
      ...projects.map(p => ({ ...p, _t: "project", _xp: p.xpAccum || 0, _mastery: getMastery(p.xpAccum || 0), _pct: p.progress || 0, _pri: p.priority, _diff: 0, _streak: 0, _deadline: p.deadline })),
      ...routines.map(r => ({ ...r, _t: "routine", _xp: r.xpAccum || 0, _mastery: getMastery(r.xpAccum || 0), _pct: 0, _pri: r.priority, _diff: r.difficulty || 0, _streak: r.streak || 0, _deadline: null })),
      ...tasks.map(t => ({ ...t, _t: "task", _xp: getXp(t.difficulty || 1), _mastery: null, _pct: t.status === "Concluída" ? 100 : 0, _pri: t.priority, _diff: t.difficulty || 0, _streak: 0, _deadline: t.deadline })),
    ];
    if (filter.key) {
      const { key, mode } = filter;
      if (key === "type") return items.filter(i => i._t === mode);
      const dir = mode === "asc" ? 1 : -1;
      const mastOrd = { Bronze: 1, Prata: 2, Ouro: 3, Platina: 4, Diamante: 5, Mestre: 6 };
      const sortFns = {
        xp: (a, b) => (a._xp - b._xp) * dir,
        streak: (a, b) => (a._streak - b._streak) * dir,
        mastery: (a, b) => ((mastOrd[a._mastery && a._mastery.name] || 0) - (mastOrd[b._mastery && b._mastery.name] || 0)) * dir,
        priority: (a, b) => ((PRI_ORDER[a._pri] || 4) - (PRI_ORDER[b._pri] || 4)) * dir,
        deadline: (a, b) => (a._deadline || "9999").localeCompare(b._deadline || "9999") * dir,
        difficulty: (a, b) => (a._diff - b._diff) * dir,
      };
      if (sortFns[key]) items.sort(sortFns[key]);
    }
    return items;
  }, [projects, routines, tasks, filter]);

  const dailyLog = profile.dailyLog || [];
  const todayEntry = { date: td(), xp: profile.xpToday, coins: profile.coinsToday };
  const allDays = [...dailyLog, todayEntry];
  const chartData = useMemo(() => {
    let from, to;
    const now = new Date();
    to = td();
    if (chartRange === "7d") { const d = new Date(now); d.setDate(d.getDate() - 6); from = d.toISOString().split("T")[0]; }
    else if (chartRange === "30d") { const d = new Date(now); d.setDate(d.getDate() - 29); from = d.toISOString().split("T")[0]; }
    else if (chartRange === "90d") { const d = new Date(now); d.setDate(d.getDate() - 89); from = d.toISOString().split("T")[0]; }
    else if (chartRange === "custom" && customFrom && customTo) { from = customFrom; to = customTo; }
    else { const d = new Date(now); d.setDate(d.getDate() - 6); from = d.toISOString().split("T")[0]; }
    const filtered = allDays.filter(d => d.date >= from && d.date <= to);
    if (filtered.length > 15) {
      const weeks = {};
      filtered.forEach(d => { const dt = new Date(d.date); const weekStart = new Date(dt); weekStart.setDate(dt.getDate() - dt.getDay()); const key = weekStart.toISOString().split("T")[0]; if (!weeks[key]) weeks[key] = { date: key, xp: 0, coins: 0, days: 0, label: "" }; weeks[key].xp += (d.xp || 0); weeks[key].coins += (d.coins || 0); weeks[key].days++; });
      const arr = Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date));
      arr.forEach(w => { w.label = fmtD(w.date).slice(0, 5); });
      return arr;
    }
    return filtered.map(d => ({ ...d, label: d.date ? d.date.slice(8, 10) + "/" + d.date.slice(5, 7) : "" }));
  }, [allDays, chartRange, customFrom, customTo]);

  const maxXp = Math.max(1, ...chartData.map(d => d.xp || 0));
  const totalXpRange = chartData.reduce((s, d) => s + (d.xp || 0), 0);
  const totalCoinsRange = chartData.reduce((s, d) => s + (d.coins || 0), 0);
  const totalActive = projects.filter(p => p.status === "Ativo").length + routines.filter(r => r.status === "Ativa").length + tasks.filter(t => t.status === "Pendente").length;

  const filterOpts = [
    { key: "type", label: "Tipo de atividade", values: ["project", "routine", "task"] },
    { key: "xp", label: "XP ganho", modes: ["asc", "desc"] },
    { key: "streak", label: "Sequência", modes: ["asc", "desc"] },
    { key: "mastery", label: "Maestria", modes: ["asc", "desc"] },
    { key: "priority", label: "Prioridade", modes: ["asc", "desc"] },
    { key: "deadline", label: "Prazo", modes: ["asc", "desc"] },
    { key: "difficulty", label: "Dificuldade", modes: ["asc", "desc"] },
  ];

  // V2: Top 3 active objectives — memoized (calcObjectiveXp faz DFS recursivo)
  const activeObjectives = useMemo(() =>
    (objectives || []).filter(o => o.status === "Ativo").map(o => ({
      ...o,
      xpMirror: calcObjectiveXp(o.id, projects, routines, tasks, objectives || [])
    })).sort((a, b) => b.xpMirror - a.xpMirror).slice(0, 3),
    [objectives, projects, routines, tasks]
  );

  // Próxima Ação — lista ordenada memoizada (evita reordenar a cada render)
  const sortedActionItems = useMemo(() => {
    const today = td();
    const items = [
      ...projects.filter(p => p.status === "Ativo").flatMap(p =>
        (p.phases || []).flatMap(ph => (ph.tasks || []).filter(t => t.status !== "Concluída").map(t => ({
          id: t.id, name: t.name, _pri: p.priority || t.priority, _diff: t.difficulty || 1, _deadline: p.deadline,
          _label: p.name, _t: "projTask", _pId: p.id, _phId: ph.id, color: p.color
        })))
      ),
      ...tasks.filter(t => t.status === "Pendente").map(t => ({
        id: t.id, name: t.name, _pri: t.priority, _diff: t.difficulty || 1, _deadline: t.deadline,
        _label: "Tarefa avulsa", _t: "task", color: C.orange
      })),
      ...routines.filter(r => r.status === "Ativa" && isRoutineDueToday(r) && !(r.completionLog || []).some(l => l.date === today) && migrateFreq(r).freq !== "Livre").map(r => ({
        id: r.id, name: r.name, _pri: r.priority, _diff: r.difficulty || 1, _deadline: null,
        _label: fmtFreq(r), _t: "routine", color: r.color || C.purple
      })),
    ];
    items.sort((a, b) => scoreNextAction(b, profile.nextActionWeights) - scoreNextAction(a, profile.nextActionWeights));
    return items;
  }, [projects, routines, tasks, profile.nextActionWeights]);

  return (
    <div style={{ padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <BorderSVG level={(profile.upgradeLevels || {})[profile.equippedBorder] || 0} color={C.gold} accentColor={(SHOP_BORDERS.find(b => b.id === profile.equippedBorder) || SHOP_BORDERS[0]).color} size={54}><IconSVG id={profile.equippedIcon || "i_estrela"} size={20} color={C.gold} /></BorderSVG>
            <div style={{ position: "absolute", bottom: -2, right: -2, background: C.gold, borderRadius: 4, padding: "0 4px", fontSize: 11, fontWeight: 700, color: C.bg, lineHeight: "14px" }}>{levelInfo.level}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.tx }}>{levelInfo.band}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><TitleBanner level={(profile.upgradeLevels || {})[(profile.equippedTitle)] || 0} color={C.gold} accentColor={getTitleTargetColor((SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).price) || C.gold}><span style={{ fontSize: 11, fontStyle: "italic", fontWeight: 600, color: C.gold }}>{(SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).name}</span></TitleBanner></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.card, borderRadius: 6, padding: "4px 10px" }}>
          <div style={{ width: 18, height: 18, background: C.gold, borderRadius: 9, fontSize: 11, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>$</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.tx }}>{profile.coins}</span>
        </div>
      </div>
      {/* XP bar */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx3, marginBottom: 3 }}>
        <span>{levelInfo.xpInLevel} / {levelInfo.xpForLevel} XP</span>
        <span>Nv. {Math.min(levelInfo.level + 1, 500)} em {levelInfo.xpForLevel - levelInfo.xpInLevel} XP</span>
      </div>
      <div style={{ marginBottom: 10 }}><XpBar cur={levelInfo.xpInLevel} max={levelInfo.xpForLevel} /></div>

      {/* Sub-abas do Dashboard */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, background: C.card, borderRadius: 8, padding: 4 }}>
        {[
          ["overview", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, "Visão Geral"],
          ["progresso", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 19,7 19,17 12,22 5,17 5,7"/><polygon points="12,7 16,9.5 16,14.5 12,17 8,14.5 8,9.5"/></svg>, "Progresso"],
          ["questionarios", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, "Questionários"],
        ].map(([key, icon, label]) => {
          const active = dashSubTab === key;
          return (
            <div
              key={key}
              onClick={() => setDashSubTab(key)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "6px 4px", borderRadius: 6, cursor: "pointer",
                background: active ? C.bg : "transparent",
                color: active ? C.gold : C.tx4,
                border: active ? "0.5px solid " + C.goldBrd : "0.5px solid transparent",
                transition: "background .12s, color .12s, border-color .12s",
              }}
            >
              <span style={{ lineHeight: 1, opacity: active ? 1 : 0.6 }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: 0.2 }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Conteúdo das sub-abas Progresso e Questionários */}
      {(dashSubTab === "progresso" || dashSubTab === "questionarios") && (
        <AtributosSection
          atributos={atributos || []}
          setAtributos={setAtributos}
          groqApiKey={groqApiKey}
          subTab={dashSubTab}
        />
      )}

      {dashSubTab !== "overview" && null}
      {dashSubTab === "overview" && <>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 12 }}>
        {[[totalActive, "Ativas", null], ["+" + profile.xpToday, "XP hoje", null], ["+" + profile.coinsToday, "Moedas", null], [profile.streak, "Streak", getMultiplier(profile.streak) > 0 ? "+" + Math.round(getMultiplier(profile.streak)*100) + "%" : null]].map(([v, l, sub], i) => (
          <div key={i} style={{ background: C.card, borderRadius: 6, padding: "7px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: i === 3 ? C.orange : C.tx }}>{v}</div>
            <div style={{ fontSize: 11, color: C.tx3 }}>{l}</div>
            {sub && <div style={{ fontSize: 11, color: C.green, marginTop: 1 }}>{sub}</div>}
          </div>
        ))}
      </div>
      {/* Welcome card — só aparece quando o app está completamente vazio */}
      {projects.length === 0 && routines.length === 0 && tasks.length === 0 && (objectives || []).length === 0 && (
        <div style={{ background: C.card, borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid " + C.goldBrd, boxShadow: "0 2px 12px " + C.gold + "18" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 6 }}>Bem-vindo ao Atividades!</div>
          <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.6, marginBottom: 12 }}>Este app gamifica seu progresso pessoal. Cada atividade que você cria e conclui gera XP e moedas — desbloqueie conquistas e suba de nível.</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 8 }}>Por onde começar:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {[
              ["1", "Crie um Objetivo", "Uma meta grande de longo prazo", "activities", "objectives"],
              ["2", "Adicione um Projeto ou Rotina", "Atividades que te levam ao objetivo", "activities", "projects"],
              ["3", "Complete e ganhe XP", "Cada conclusão te faz avançar", null, null],
            ].map(([num, title, desc, tab, sub]) => (
              <div key={num} onClick={tab ? () => nav(tab, sub, "list") : undefined} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: C.bg, borderRadius: 8, cursor: tab ? "pointer" : "default" }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: C.goldDim, border: "1px solid " + C.goldBrd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.gold, flexShrink: 0 }}>{num}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: tab ? C.gold : C.tx, marginBottom: 2 }}>{title}{tab && <span style={{ fontSize: 11, color: C.tx4, marginLeft: 4 }}>→</span>}</div>
                  <div style={{ fontSize: 11, color: C.tx3 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.tx4, textAlign: "center" }}>Use o ícone <span style={{ color: C.tx3 }}>?</span> em cada lista para saber mais sobre cada tipo de atividade.</div>
        </div>
      )}
      {/* Active effects */}
      {(profile.shieldActive || (profile.boostExpiry && profile.boostExpiry > Date.now())) && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {profile.shieldActive && <div style={{ fontSize: 11, color: C.gold, background: C.goldDim, border: "1px solid " + C.goldBrd, borderRadius: 5, padding: "3px 8px", display: "flex", alignItems: "center", gap: 3 }}><ConsumableSVG id="c_escudo" size={10} color={C.gold} />{" Escudo"}</div>}
          {profile.boostExpiry && profile.boostExpiry > Date.now() && <div style={{ fontSize: 11, color: C.gold, background: C.goldDim, border: "1px solid " + C.goldBrd, borderRadius: 5, padding: "3px 8px", display: "flex", alignItems: "center", gap: 3 }}><ConsumableSVG id="c_boost" size={10} color={C.gold} />{" +25%"}</div>}
        </div>
      )}
      {/* V2: Objectives card */}
      {activeObjectives.length > 0 && (
        <Card style={{ marginBottom: 10, borderLeft: "3px solid #534AB7" }}>
          <div onClick={() => nav("activities", "objectives", "list")} style={{ fontSize: 11, color: "#534AB7", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6, cursor: "pointer", transition: "opacity .12s" }}>Seus Objetivos</div>
          {activeObjectives.map(o => {
            const actCount = (o.linkedActivities || []).length;
            const projCount = (o.linkedActivities || []).filter(l => l.type === "project").length;
            const routCount = (o.linkedActivities || []).filter(l => l.type === "routine").length;
            return (
              <div key={o.id} onClick={() => nav("activities", "objectives", "detail", o.id, "objective")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: o.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.tx, fontWeight: 500 }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: C.tx3 }}>{projCount > 0 ? projCount + " projeto" + (projCount > 1 ? "s" : "") : ""}{projCount > 0 && routCount > 0 ? " · " : ""}{routCount > 0 ? routCount + " rotina" + (routCount > 1 ? "s" : "") : ""}{actCount === 0 ? "Sem vínculos" : ""}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>{o.xpMirror.toLocaleString()} XP</div>
              </div>
            );
          })}
        </Card>
      )}
      {/* Próxima Ação — usa sortedActionItems memoizado acima */}
      {(() => {
        const idx = nextActionSkip % Math.max(1, sortedActionItems.length);
        const cur = sortedActionItems[idx];
        if (!cur) return (
          <div style={{ border: "1px dashed " + C.brd2, borderRadius: 10, padding: 20, marginBottom: 10, textAlign: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px" }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 4 }}>Nenhuma ação pendente</div>
            <div style={{ fontSize: 11, color: C.tx4 }}>Crie projetos, rotinas ou tarefas para começar a ganhar XP.</div>
          </div>
        );
        return (
          <div style={{ background: "linear-gradient(135deg,#1a1d2e,#1a1a1f)", border: "1px solid " + C.purple + "40", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: C.purple, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 }}>Próxima ação</div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 11, color: C.tx4 }}>{idx + 1}/{sortedActionItems.length}</span>
                <span onClick={() => setNextActionSkip(s => s + 1)} style={{ fontSize: 11, color: C.purple, cursor: "pointer", padding: "0 4px" }}>{"↻"}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 3 }}>{cur.name}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: C.tx3, marginBottom: 8 }}>
              <span style={{ color: cur.color || C.gold }}>{cur._label}</span>
              {cur._pri && <span>{cur._pri}</span>}
              <span style={{ color: C.gold }}>+{getXp(cur._diff)} XP</span>
              {cur._deadline && <span>{fmtD(cur._deadline)}</span>}
            </div>
            <Btn small primary onClick={() => {
              if (cur._t === "projTask") completeTask(cur.id, "project", cur._pId, cur._phId);
              else if (cur._t === "task") completeTask(cur.id);
              else if (cur._t === "routine") completeRoutine(cur.id);
              setNextActionSkip(s => s + 1);
            }} style={{ width: "100%" }}>Concluir agora</Btn>
          </div>
        );
      })()}
      {/* Missão do dia */}
      {(() => {
        const m = profile.dailyMission;
        if (!m) return null;
        const missionDef = MISSION_POOL.find(x => x.id === m.id);
        const progress = getMissionProgress(missionDef || m, profile, projects, routines, tasks);
        const isComplete = missionDef ? missionDef.check(progress) : false;
        const claimed = m.completed;
        const pct = missionDef?.pct ? missionDef.pct(progress) : (isComplete ? 100 : 0);
        return (
          <div style={{ background: claimed ? C.card : "linear-gradient(135deg,#1e1d12,#1a1a1f)", border: "1px solid " + (claimed ? C.brd : C.gold + "40"), borderRadius: 10, padding: 12, marginBottom: 10, opacity: claimed ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 }}>Missão do dia</div>
              <div style={{ fontSize: 11, color: "#e0a030", fontWeight: 600 }}>+{m.coins} moedas</div>
            </div>
            <div style={{ fontSize: 12, color: C.tx, marginBottom: 8 }}>{m.text}</div>
            {!claimed && !isComplete && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx4, marginBottom: 3 }}>
                  <span>Progresso</span>
                  <span style={{ color: pct > 0 ? C.gold : C.tx4 }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? C.green : C.gold, borderRadius: 2, transition: "width .4s" }} />
                </div>
              </div>
            )}
            {claimed ? <div style={{ fontSize: 11, color: C.green, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Concluída!</div> : isComplete ? <Btn small primary onClick={claimMission} style={{ width: "100%" }}>Resgatar recompensa!</Btn> : null}
          </div>
        );
      })()}
      {/* Chart */}
      <Card style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.tx2 }}>XP por dia</div>
          <div style={{ display: "flex", gap: 3 }}>
            {["7d", "30d", "90d"].map(r => (
              <div key={r} onClick={() => { setChartRange(r); setShowDatePicker(false); }} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer", background: chartRange === r && !showDatePicker ? C.goldDim : C.bg, color: chartRange === r && !showDatePicker ? C.gold : C.tx4, border: "0.5px solid " + (chartRange === r && !showDatePicker ? C.goldBrd : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>{r}</div>
            ))}
            <div onClick={() => setShowDatePicker(!showDatePicker)} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer", background: chartRange === "custom" ? C.goldDim : C.bg, color: chartRange === "custom" ? C.gold : C.tx4, border: "0.5px solid " + (chartRange === "custom" ? C.goldBrd : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>Datas</div>
          </div>
        </div>
        {showDatePicker && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ flex: 1, padding: "4px 6px", background: C.bg, border: "1px solid " + C.brd, borderRadius: 4, color: C.tx, fontSize: 11 }} />
            <span style={{ fontSize: 11, color: C.tx3 }}>a</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ flex: 1, padding: "4px 6px", background: C.bg, border: "1px solid " + C.brd, borderRadius: 4, color: C.tx, fontSize: 11 }} />
            <Btn small primary onClick={() => { setChartRange("custom"); setShowDatePicker(false); }}>OK</Btn>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 11, color: C.tx3 }}>
          <span><span style={{ color: C.gold }}>+{totalXpRange}</span> XP</span>
          <span><span style={{ color: "#e0a030" }}>+{totalCoinsRange}</span> moedas</span>
          <span>{chartData.length} {chartData.length > 15 ? "semanas" : "dias"}</span>
        </div>
        {chartData.length > 0 ? (
          <svg viewBox={"0 0 " + Math.max(280, chartData.length * 30 + 40) + " 100"} style={{ width: "100%", height: 100 }}>
            {[0, 0.5, 1].map((r, i) => (<line key={i} x1="28" x2={Math.max(275, chartData.length * 30 + 35)} y1={12 + (1 - r) * 62} y2={12 + (1 - r) * 62} stroke={C.brd} strokeWidth="0.5" />))}
            {chartData.map((d, i) => {
              const barW = Math.min(22, Math.max(8, 240 / chartData.length - 2));
              const barH = maxXp > 0 ? Math.max(2, (d.xp || 0) / maxXp * 60) : 2;
              const spacing = Math.max(barW + 4, 260 / chartData.length);
              const x = 33 + i * spacing;
              const isToday = d.date === td();
              return (<g key={i}><rect x={x} y={74 - barH} width={barW} height={barH} rx="2" fill={isToday ? C.gold : C.gold + "80"} />{(d.xp || 0) > 0 && chartData.length <= 15 && (<text x={x + barW / 2} y={74 - barH - 3} textAnchor="middle" fontSize="6" fill={C.tx3}>+{d.xp}</text>)}<text x={x + barW / 2} y={88} textAnchor="middle" fontSize={chartData.length > 10 ? "5" : "6"} fill={isToday ? C.gold : C.tx4}>{d.label || ""}</text></g>);
            })}
            <text x="2" y="16" fontSize="6" fill={C.tx4}>{maxXp}</text>
            <text x="2" y="76" fontSize="6" fill={C.tx4}>0</text>
          </svg>
        ) : (<div style={{ textAlign: "center", padding: 20, fontSize: 11, color: C.tx4 }}>Sem dados neste intervalo</div>)}
      </Card>
      {/* Overview */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.tx }}>Visão geral</div>
        <FilterBtn onClick={() => setShowFilter(true)} active={!!filter.key} />
      </div>
      {allItems.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.tx3, fontSize: 11 }}>Nenhuma atividade ainda.</div>}
      {allItems.map(it => {
        const typeLabel = it._t === "project" ? "Projeto" : it._t === "routine" ? "Rotina" : "Tarefa";
        const typeColor = it._t === "project" ? C.gold : it._t === "routine" ? C.purple : C.orange;
        const subTab = it._t === "project" ? "projects" : it._t === "routine" ? "routines" : "tasks";
        return (
          <Card key={it.id + it._t} onClick={() => nav("activities", subTab, "detail", it.id, it._t)} style={{ borderLeft: "3px solid " + (it.color || C.gold), marginBottom: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.tx }}>{it.name}</span>
              <Badge color={typeColor}>{typeLabel}</Badge>
              {it._t === "project" && it.target !== undefined && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.tx3, flexWrap: "wrap" }}>
              <span style={{ color: C.gold }}>XP {it._xp}</span>
              {it._t === "project" && <span>{it._pct}%</span>}
              {it._t === "routine" && it._streak > 0 && <span style={{ color: C.orange }}>{it._streak}</span>}
              {it._mastery && <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><MaestriaSVG tier={it._mastery.name} size={14} /><Badge color={it.color || C.gold}>{it._mastery.name}</Badge></span>}
              {it._pri && <span>{it._pri}</span>}
            </div>
          </Card>
        );
      })}
      {showFilter && <FilterModal options={filterOpts} active={filter} onApply={setFilter} onClose={() => setShowFilter(false)} />}
      </>}
    </div>
  );
}

/* ═══ ACTIVITIES TAB ═══ */


export default DashboardTab;
