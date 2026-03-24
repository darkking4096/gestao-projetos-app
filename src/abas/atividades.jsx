import { useState, useMemo } from "react";
import { C } from '../temas.js';
import { uid, td, fmtD, fmtFreq, getXp, getCoins, getLevelInfo, getMastery, isRoutineDueToday, calcObjectiveXp, checkProjectCompletion, scoreNextAction, migrateFreq } from '../utilidades.js';
import { PRIORITIES, CATEGORIES, PRI_ORDER } from '../constantes.js';
import { Btn, Card, Badge, TopBar, Modal, ConfirmModal, DeleteModal, FilterModal, FilterBtn, NotesLog, PBar, Chk, SLabel, Input, getDiffColor } from '../componentes-base.jsx';
import { IconSVG, ConsumableSVG } from '../icones.jsx';
import { ProjectForm, RoutineForm, TaskForm, ObjectiveForm, ActivitySearchModal, ObjectiveSearchModal } from '../formularios.jsx';

function ActivitiesTab({ subTab, setSubTab, projects, routines, tasks, objectives, nav, completeTask, completeRoutine, updProject, setProfile: setProf, setCompletionConfirm }) {
  return (
    <div>
      <div style={{ display: "flex", background: C.card2, borderBottom: "0.5px solid " + C.brd }}>
        {[["projects", "Projetos"], ["routines", "Rotinas"], ["tasks", "Tarefas"], ["objectives", "Objetivos"]].map(([k, l]) => (
          <div key={k} onClick={() => setSubTab(k)} style={{ flex: 1, padding: "9px 2px", textAlign: "center", fontSize: 11, cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.4, color: subTab === k ? C.gold : C.tx4, borderBottom: subTab === k ? "2px solid " + C.gold : "2px solid transparent", transition: "color .12s, border-color .12s" }}>{l}</div>
        ))}
      </div>
      <div style={{ padding: 14 }}>
        {subTab === "projects" && <ProjectsList projects={projects} nav={nav} completeTask={completeTask} updProject={updProject} setProfile={setProf} setCompletionConfirm={setCompletionConfirm} />}
        {subTab === "routines" && <RoutinesList routines={routines} projects={projects} nav={nav} completeRoutine={completeRoutine} />}
        {subTab === "tasks" && <TasksList tasks={tasks} nav={nav} completeTask={completeTask} />}
        {subTab === "objectives" && <ObjectivesList objectives={objectives} projects={projects} routines={routines} tasks={tasks} nav={nav} />}
      </div>
    </div>
  );
}

function ProjectsList({ projects, nav, completeTask, updProject, setProfile: setProf, setCompletionConfirm }) {
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({ key: null, mode: null });
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [quickEdit, setQuickEdit] = useState(null);
  const [quickVal, setQuickVal] = useState("");
  const toggleExpand = (id) => setExpandedCards(e => ({ ...e, [id]: !e[id] }));
  const filterOpts = [
    { key: "xp", label: "XP acumulado", modes: ["asc", "desc"] },
    { key: "priority", label: "Prioridade", modes: ["asc", "desc"] },
    { key: "deadline", label: "Prazo", modes: ["asc", "desc"] },
  ];

  const saveQuick = (p) => {
    const nv = parseFloat(quickVal);
    if (isNaN(nv) || !updProject) { setQuickEdit(null); return; }
    const vh = [...(p.valueHistory || []), { date: td(), value: nv, note: "" }];
    const updated = { ...p, currentValue: nv, valueHistory: vh };
    updProject(updated);
    if (setProf) setProf(pr => ({ ...pr, goalUpdatedToday: true }));
    if (checkProjectCompletion(updated) && p.status === "Ativo" && setCompletionConfirm) {
      setTimeout(() => setCompletionConfirm({ type: "project", id: p.id, name: p.name }), 300);
    }
    setQuickEdit(null);
  };

  const sorted = useMemo(() => {
    let list = [...projects];
    if (filter.key) {
      const dir = filter.mode === "asc" ? 1 : -1;
      if (filter.key === "xp") list.sort((a, b) => ((a.xpAccum || 0) - (b.xpAccum || 0)) * dir);
      if (filter.key === "priority") list.sort((a, b) => ((PRI_ORDER[a.priority] || 4) - (PRI_ORDER[b.priority] || 4)) * dir);
      if (filter.key === "deadline") list.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") * dir);
    }
    return list;
  }, [projects, filter]);

  const visible = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(p => p.name.toLowerCase().includes(q) || (p.objective || "").toLowerCase().includes(q));
  }, [sorted, search]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar projeto..."
          style={{ flex: 1, padding: "7px 10px", background: C.card, border: "1px solid " + C.brd2, borderRadius: 8, color: C.tx, fontSize: 11, outline: "none", transition: "border-color .15s" }}
        />
        <FilterBtn onClick={() => setShowFilter(true)} active={!!filter.key} />
        <span onClick={() => setShowHelp(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 2px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </span>
      </div>
      {showHelp && <Modal>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 8 }}>O que são Projetos?</div>
          <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.6, marginBottom: 8 }}>Projetos são conjuntos de tarefas organizadas em fases, com progresso rastreado. Úteis para trabalhos com etapas definidas — como "Montar portfólio" ou "Estudar para concurso".</div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ XP</span>: Ganho ao concluir tarefas do projeto{"\n"}
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ Progresso</span>: Calculado pelas tarefas concluídas nas fases
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6 }}>
            <span style={{ color: C.gold }}>→ Meta numérica</span>: Opcionalmente rastreia valores (km, R$, páginas...)
          </div>
        </div>
        <Btn onClick={() => setShowHelp(false)} style={{ width: "100%" }}>Entendido</Btn>
      </Modal>}
      {visible.length === 0 && search.trim() && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.tx3, fontSize: 11 }}>Nenhum projeto encontrado para "{search}"</div>
      )}
      {visible.map(p => {
        const allT = (p.phases || []).flatMap(ph => ph.tasks || []);
        const pendT = allT.filter(t => t.status !== "Concluída");
        const dim = p.status !== "Ativo";
        const hasNumTarget = p.target !== undefined && p.target !== null;
        const targetPct = hasNumTarget && p.target > 0 ? Math.round(((p.currentValue || 0) / p.target) * 100) : 0;
        const expanded = !!expandedCards[p.id];
        const hasDetails = (hasNumTarget && p.status === "Ativo") || (p.status === "Ativo" && pendT.length > 0);
        return (
              <Card key={p.id} style={{ borderLeft: "3px solid " + (p.color || C.gold), opacity: dim ? 0.5 : 1, marginBottom: 8 }}>
                {/* Summary row — always visible */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div onClick={() => nav("activities", "projects", "detail", p.id, "project")} style={{ flex: 1, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.tx, display: "flex", alignItems: "center", gap: 4 }}>{hasNumTarget && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}{p.name}</span>
                      {p.status === "Ativo" ? <span style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{p.progress || 0}%</span> : <Badge color={C.tx3}>{p.status}</Badge>}
                    </div>
                    {p.objective && <div style={{ fontSize: 11, color: C.tx2, fontStyle: "italic", marginBottom: 3 }}>{p.objective}</div>}
                    {p.status === "Ativo" && <PBar pct={p.progress || 0} color={p.color || C.gold} />}
                    <div style={{ fontSize: 11, color: C.tx4, marginTop: 3 }}>
                      {(p.phases || []).length} fases · {allT.length} tarefas
                      {getMastery(p.xpAccum || 0) && <span> · <span style={{ color: p.color || C.gold }}>{getMastery(p.xpAccum || 0).name}</span></span>}
                    </div>
                  </div>
                  {hasDetails && (
                    <div onClick={(e) => { e.stopPropagation(); toggleExpand(p.id); }} style={{ padding: "4px 6px", cursor: "pointer", color: C.tx4, lineHeight: 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  )}
                </div>
                {/* Expanded details */}
                {expanded && hasDetails && (
                  <div style={{ marginTop: 8, borderTop: "0.5px solid " + C.brd, paddingTop: 8 }}>
                    {hasNumTarget && p.status === "Ativo" && (
                      <div style={{ marginBottom: pendT.length > 0 ? 8 : 0 }}>
                        <PBar pct={Math.min(targetPct, 100)} color={targetPct >= 100 ? C.green : (p.color || C.gold)} />
                        <div style={{ fontSize: 11, color: targetPct >= 100 ? C.green : C.tx3, marginTop: 1 }}>{p.unit === "R$" ? "R$" : ""}{p.currentValue || 0} / {p.unit === "R$" ? "R$" : ""}{p.target} {p.unit !== "R$" ? p.unit : ""} ({targetPct}%){targetPct >= 100 ? " ✓" : ""}</div>
                        {quickEdit === p.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 6 }}>
                            <input type="number" value={quickVal} onChange={e => setQuickVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveQuick(p); if (e.key === "Escape") setQuickEdit(null); }} autoFocus placeholder="Novo valor" style={{ flex: 1, padding: "6px 8px", background: C.bg, border: "1px solid " + C.goldBrd, borderRadius: 5, color: C.tx, fontSize: 11, outline: "none" }} />
                            <Btn small primary onClick={() => saveQuick(p)}>{"✓"}</Btn>
                            <Btn small onClick={() => setQuickEdit(null)}>{"✕"}</Btn>
                          </div>
                        ) : (
                          <div onClick={(e) => { e.stopPropagation(); setQuickEdit(p.id); setQuickVal(String(p.currentValue || 0)); }} style={{ fontSize: 11, color: C.gold, cursor: "pointer", textAlign: "center", marginTop: 4, transition: "opacity .12s" }}>Atualizar valor</div>
                        )}
                      </div>
                    )}
                    {p.status === "Ativo" && pendT.length > 0 && (
                      <div>
                        {pendT.slice(0, 3).map(t => {
                          const phId = (p.phases || []).find(ph => (ph.tasks || []).some(tt => tt.id === t.id));
                          return (
                            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                              <Chk done={false} onClick={() => completeTask(t.id, "project", p.id, phId ? phId.id : null)} />
                              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.tx }}>{t.name}</div><div style={{ fontSize: 11, color: C.tx3 }}><span style={{ color: C.gold }}>+{getXp(t.difficulty || 1)} XP</span></div></div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
        );
      })}
      {projects.length === 0 && !search.trim() && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.tx3, marginBottom: 4 }}>Nenhum projeto ainda</div>
          <div style={{ fontSize: 11, color: C.tx4, marginBottom: 14 }}>Crie seu primeiro projeto para organizar suas tarefas e acompanhar seu progresso.</div>
          <Btn primary small onClick={() => nav("activities", "projects", "create", null, "project")}>Criar primeiro projeto</Btn>
        </div>
      )}
      <div onClick={() => nav("activities", "projects", "create", null, "project")} style={{ padding: 10, border: "1px dashed " + C.brd2, borderRadius: 8, textAlign: "center", fontSize: 11, color: C.tx3, cursor: "pointer", marginTop: 6, transition: "color .12s, border-color .12s" }}>+ Novo projeto</div>
      {showFilter && <FilterModal options={filterOpts} active={filter} onApply={setFilter} onClose={() => setShowFilter(false)} />}
    </div>
  );
}

function RoutinesList({ routines, projects, nav, completeRoutine }) {
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({ key: null, mode: null });
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const filterOpts = [
    { key: "xp", label: "XP acumulado", modes: ["asc", "desc"] },
    { key: "streak", label: "Sequência", modes: ["asc", "desc"] },
    { key: "difficulty", label: "Dificuldade", modes: ["asc", "desc"] },
  ];
  const today = td();
  const active = routines.filter(r => r.status === "Ativa");
  const inactive = routines.filter(r => r.status !== "Ativa");

  const visibleActive = useMemo(() => {
    let list = [...active];
    if (filter.key) {
      const dir = filter.mode === "asc" ? 1 : -1;
      if (filter.key === "xp") list.sort((a, b) => ((a.xpAccum || 0) - (b.xpAccum || 0)) * dir);
      if (filter.key === "streak") list.sort((a, b) => ((a.streak || 0) - (b.streak || 0)) * dir);
      if (filter.key === "difficulty") list.sort((a, b) => ((a.difficulty || 1) - (b.difficulty || 1)) * dir);
    }
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(r => r.name.toLowerCase().includes(q)); }
    return list;
  }, [active, filter, search]);
  const visibleInactive = useMemo(() => {
    if (!search.trim()) return inactive;
    const q = search.toLowerCase();
    return inactive.filter(r => r.name.toLowerCase().includes(q));
  }, [inactive, search]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar rotina..."
          style={{ flex: 1, padding: "7px 10px", background: C.card, border: "1px solid " + C.brd2, borderRadius: 8, color: C.tx, fontSize: 11, outline: "none", transition: "border-color .15s" }}
        />
        <FilterBtn onClick={() => setShowFilter(true)} active={!!filter.key} />
        <span onClick={() => setShowHelp(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 2px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </span>
      </div>
      {showHelp && <Modal>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 8 }}>O que são Rotinas?</div>
          <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.6, marginBottom: 8 }}>Rotinas são hábitos recorrentes — diários, semanais ou personalizados. A cada conclusão você acumula streak e ganha XP. Quanto mais consistente, maior o multiplicador de recompensa.</div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ Streak</span>: Dias consecutivos de conclusão. Não quebre — bônus chegam a +100%!
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ Frequência "Livre"</span>: Sem prazo fixo — conclua quando quiser
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6 }}>
            <span style={{ color: C.orange }}>→ Auto-pausa</span>: Rotinas com 5 faltas seguidas são pausadas automaticamente
          </div>
        </div>
        <Btn onClick={() => setShowHelp(false)} style={{ width: "100%" }}>Entendido</Btn>
      </Modal>}
      {visibleActive.length === 0 && search.trim() && visibleInactive.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.tx3, fontSize: 11 }}>Nenhuma rotina encontrada para "{search}"</div>
      )}
      {visibleActive.map(r => {
        const due = isRoutineDueToday(r);
        const done = (r.completionLog || []).some(l => l.date === today);
        const isLibre = migrateFreq(r).freq === "Livre";
        const projRef = r.phaseRef ? (projects || []).find(p => p.id === r.phaseRef.projectId) : null;
        return (
          <div key={r.id} className="rl-item" style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 9px", background: C.card, borderRadius: 7, marginBottom: 5, opacity: (due && !done) || isLibre ? 1 : 0.6 }}>
            <Chk done={done} onClick={() => { if (!done) completeRoutine(r.id); }} />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav("activities", "routines", "detail", r.id, "routine")}>
              <div style={{ fontSize: 11, color: C.tx }}>{r.name}</div>
              <div style={{ display: "flex", gap: 6, fontSize: 11, color: C.tx3, flexWrap: "wrap" }}>
                <Badge color={C.gold}>{fmtFreq(r)}</Badge>
                {!isLibre && <span style={{ color: C.gold }}>{r.streak}</span>}
                {isLibre && <span>{r.totalCompletions || 0} execuções</span>}
                <span style={{ color: C.gold }}>+{getXp(r.difficulty || 1)} XP</span>
                {projRef && <span style={{ color: C.tx3 }}>→ {projRef.name}</span>}
              </div>
            </div>
          </div>
        );
      })}
      {visibleInactive.map(r => (
        <div key={r.id} className="rl-item" onClick={() => nav("activities", "routines", "detail", r.id, "routine")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 9px", background: C.card, borderRadius: 7, marginBottom: 5, opacity: 0.4, cursor: "pointer" }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.tx3 }}>{r.name}</div></div>
        </div>
      ))}
      {routines.length === 0 && !search.trim() && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.tx3, marginBottom: 4 }}>Nenhuma rotina ainda</div>
          <div style={{ fontSize: 11, color: C.tx4, marginBottom: 14 }}>Crie rotinas para hábitos que você quer repetir e ganhe XP e streak a cada conclusão.</div>
          <Btn primary small onClick={() => nav("activities", "routines", "create", null, "routine")}>Criar primeira rotina</Btn>
        </div>
      )}
      <div onClick={() => nav("activities", "routines", "create", null, "routine")} style={{ padding: 10, border: "1px dashed " + C.brd2, borderRadius: 8, textAlign: "center", fontSize: 11, color: C.tx3, cursor: "pointer", marginTop: 6, transition: "color .12s, border-color .12s" }}>+ Nova rotina</div>
      {showFilter && <FilterModal options={filterOpts} active={filter} onApply={setFilter} onClose={() => setShowFilter(false)} />}
    </div>
  );
}

function TasksList({ tasks, nav, completeTask }) {
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({ key: null, mode: null });
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const filterOpts = [
    { key: "difficulty", label: "Dificuldade", modes: ["asc", "desc"] },
    { key: "priority", label: "Prioridade", modes: ["asc", "desc"] },
    { key: "deadline", label: "Prazo", modes: ["asc", "desc"] },
  ];
  const pending = tasks.filter(t => t.status === "Pendente");
  const done = tasks.filter(t => t.status === "Concluída" && t.completedAt === td());
  const today = new Date(td());

  const visiblePending = useMemo(() => {
    let list = [...pending];
    if (filter.key) {
      const dir = filter.mode === "asc" ? 1 : -1;
      if (filter.key === "difficulty") list.sort((a, b) => ((a.difficulty || 1) - (b.difficulty || 1)) * dir);
      if (filter.key === "priority") list.sort((a, b) => ((PRI_ORDER[a.priority] || 4) - (PRI_ORDER[b.priority] || 4)) * dir);
      if (filter.key === "deadline") list.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") * dir);
    }
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(t => t.name.toLowerCase().includes(q)); }
    return list;
  }, [pending, filter, search]);
  const visibleDone = useMemo(() => {
    if (!search.trim()) return done;
    const q = search.toLowerCase();
    return done.filter(t => t.name.toLowerCase().includes(q));
  }, [done, search]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar tarefa..."
          style={{ flex: 1, padding: "7px 10px", background: C.card, border: "1px solid " + C.brd2, borderRadius: 8, color: C.tx, fontSize: 11, outline: "none", transition: "border-color .15s" }}
        />
        <FilterBtn onClick={() => setShowFilter(true)} active={!!filter.key} />
        <span onClick={() => setShowHelp(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 2px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </span>
      </div>
      {showHelp && <Modal>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 8 }}>O que são Tarefas?</div>
          <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.6, marginBottom: 8 }}>Tarefas avulsas são atividades pontuais — sem repetição e sem pertencer a um projeto. Ideais para demandas únicas do dia a dia, como "Responder e-mail do cliente" ou "Comprar livro".</div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ XP imediato</span>: Ganho instantaneamente ao marcar como concluída
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ Dificuldade</span>: Quanto mais difícil, maior o XP e as moedas
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6 }}>
            <span style={{ color: C.gold }}>→ Dica</span>: Para tarefas recorrentes, prefira criar uma Rotina
          </div>
        </div>
        <Btn onClick={() => setShowHelp(false)} style={{ width: "100%" }}>Entendido</Btn>
      </Modal>}
      {visiblePending.length === 0 && visibleDone.length === 0 && search.trim() && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.tx3, fontSize: 11 }}>Nenhuma tarefa encontrada para "{search}"</div>
      )}
      {visiblePending.length > 0 && <SLabel>Pendentes</SLabel>}
      {visiblePending.map(t => {
        const overdueDays = t.deadline ? Math.floor((today - new Date(t.deadline)) / 86400000) : 0;
        return (
          <div key={t.id} className="rl-item" style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", background: C.card, borderRadius: 7, marginBottom: 4 }}>
            <Chk done={false} onClick={() => completeTask(t.id)} />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav("activities", "tasks", "detail", t.id, "task")}>
              <div style={{ fontSize: 11, color: C.tx }}>{t.name}</div>
              <div style={{ fontSize: 11, color: C.tx3 }}>
                <span style={{ color: C.gold }}>+{getXp(t.difficulty || 1)} XP</span> Dif.{t.difficulty || 1} {t.priority && t.priority}
                {overdueDays > 0 && <span style={{ color: C.red, fontWeight: 600, marginLeft: 6 }}>Vencida há {overdueDays} dia{overdueDays > 1 ? "s" : ""}</span>}
              </div>
            </div>
          </div>
        );
      })}
      {visibleDone.length > 0 && <SLabel>Concluídas hoje</SLabel>}
      {visibleDone.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", background: C.card, borderRadius: 7, marginBottom: 4, opacity: 0.4 }}>
          <Chk done /><div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.tx4, textDecoration: "line-through" }}>{t.name}</div></div>
        </div>
      ))}
      {tasks.length === 0 && !search.trim() && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.tx3, marginBottom: 4 }}>Nenhuma tarefa ainda</div>
          <div style={{ fontSize: 11, color: C.tx4, marginBottom: 14 }}>Adicione tarefas avulsas para coisas que precisam ser feitas uma única vez.</div>
          <Btn primary small onClick={() => nav("activities", "tasks", "create", null, "task")}>Criar primeira tarefa</Btn>
        </div>
      )}
      <div onClick={() => nav("activities", "tasks", "create", null, "task")} style={{ padding: 10, border: "1px dashed " + C.brd2, borderRadius: 8, textAlign: "center", fontSize: 11, color: C.tx3, cursor: "pointer", marginTop: 6, transition: "color .12s, border-color .12s" }}>+ Nova tarefa</div>
      {showFilter && <FilterModal options={filterOpts} active={filter} onApply={setFilter} onClose={() => setShowFilter(false)} />}
    </div>
  );
}

/* ═══ V2: OBJECTIVES LIST ═══ */
function ObjectivesList({ objectives, projects, routines, tasks, nav }) {
  const [statusFilter, setStatusFilter] = useState("Ativo");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const byStatus = (objectives || []).filter(o => o.status === statusFilter);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(o => o.name.toLowerCase().includes(q));
  }, [byStatus, search]);

  // Memoize all XP calculations — calcObjectiveXp faz DFS recursivo, evitar em cada render
  const xpByObj = useMemo(() => {
    const map = {};
    (objectives || []).forEach(o => {
      map[o.id] = calcObjectiveXp(o.id, projects, routines, tasks, objectives || []);
    });
    return map;
  }, [objectives, projects, routines, tasks]);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: showSearch ? 6 : 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {["Ativo", "Concluído", "Arquivado"].map(s => (
            <div key={s} onClick={() => setStatusFilter(s)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer", background: statusFilter === s ? C.goldDim : C.card, color: statusFilter === s ? C.gold : C.tx3, border: "0.5px solid " + (statusFilter === s ? C.goldBrd : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>{s}s</div>
          ))}
        </div>
        <FilterBtn active={showSearch || !!search} onClick={() => { setShowSearch(v => !v); if (showSearch) setSearch(""); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </FilterBtn>
        <span onClick={() => setShowHelp(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 2px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </span>
      </div>
      {showSearch && <Input value={search} onChange={setSearch} placeholder="Buscar objetivo..." style={{ marginBottom: 8, fontSize: 11 }} />}
      {showHelp && <Modal>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 8 }}>O que são Objetivos?</div>
          <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.6, marginBottom: 8 }}>Objetivos são metas maiores de longo prazo. Eles agrupam projetos, rotinas e tarefas relacionados — e acumulam automaticamente o XP de todas as atividades vinculadas a eles.</div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ XP espelhado</span>: Cada XP ganho em uma atividade vinculada soma ao objetivo
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>→ Hierarquia</span>: Objetivos podem estar dentro de outros (maior/menor)
          </div>
          <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6 }}>
            <span style={{ color: C.gold }}>→ Fluxo recomendado</span>: Crie primeiro o Objetivo, depois os projetos e rotinas
          </div>
        </div>
        <Btn onClick={() => setShowHelp(false)} style={{ width: "100%" }}>Entendido</Btn>
      </Modal>}
      {filtered.map(o => {
        const xp = xpByObj[o.id] || 0;
        const actCount = (o.linkedActivities || []).length;
        return (
          <Card key={o.id} onClick={() => nav("activities", "objectives", "detail", o.id, "objective")} style={{ borderLeft: "3px solid " + (o.color || "#534AB7"), marginBottom: 6, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.tx }}>{o.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>{xp.toLocaleString()} XP</span>
            </div>
            {o.purpose && <div style={{ fontSize: 11, color: C.tx2, fontStyle: "italic", marginBottom: 4 }}>{o.purpose}</div>}
            <div style={{ fontSize: 11, color: C.tx3 }}>{actCount} atividade{actCount !== 1 ? "s" : ""} vinculada{actCount !== 1 ? "s" : ""}</div>
          </Card>
        );
      })}
      {filtered.length === 0 && statusFilter === "Ativo" && (objectives || []).length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.tx3, marginBottom: 4 }}>Nenhum objetivo ainda</div>
          <div style={{ fontSize: 11, color: C.tx4 }}>Objetivos são metas maiores que agrupam projetos, rotinas e tarefas. Comece criando o seu!</div>
        </div>
      )}
      {filtered.length === 0 && !(statusFilter === "Ativo" && (objectives || []).length === 0) && (
        <div style={{ textAlign: "center", padding: 30, color: C.tx3, fontSize: 11 }}>Nenhum objetivo {statusFilter.toLowerCase()}.</div>
      )}
      <div onClick={() => nav("activities", "objectives", "create", null, "objective")} style={{ padding: 10, border: "1px dashed " + C.brd2, borderRadius: 8, textAlign: "center", fontSize: 11, color: C.tx3, cursor: "pointer", marginTop: 6, transition: "color .12s, border-color .12s" }}>+ Novo objetivo</div>
    </div>
  );
}


/* ═══ DETAIL VIEWS ═══ */


export default ActivitiesTab;
