import { useState, useMemo } from "react";
import { C } from '../temas.js';
import { td, uid, fmtD, fmtFreq, fmtRoutineNotification, getXp, getCoins, getEnergia, getMoedas, getLevelInfo, getMastery, isRoutineDueToday, calcObjectiveXp, checkProjectCompletion, wouldCreateCycle, removeObjectiveLinksFromActivities, migrateFreq, getProjectRankEstimate, getEnergyRankEstimate } from '../utilidades.js';
import { PRIORITIES, CATEGORIES, MASTERY_LEVELS, STREAK_MULT } from '../constantes.js';
import { Btn, Card, Badge, PBar, TopBar, Modal, ConfirmModal, DeleteModal, NotesLog, SLabel, Input, Chk } from '../componentes-base.jsx';
import { IconSVG, ConsumableSVG, MaestriaSVG } from '../icones.jsx';
import { ProjectForm, RoutineForm, TaskForm, ProjectTaskForm, ObjectiveForm, ActivitySearchModal, ObjectiveSearchModal } from '../formularios.jsx';

function ProjectDetail({ item, onUpdate, onDelete, onComplete, nav, navBack, objectives, routines: allRoutines, setCompletionConfirm, onValueUpdate }) {
  const [showDel, setShowDel] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [showValModal, setShowValModal] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [valNote, setValNote] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const allTasks = (item.phases || []).flatMap(ph => ph.tasks || []);
  const doneTasks = allTasks.filter(t => t.status === "Concluída").length;
  const mastery = getMastery(item.xpAccum || 0);
  const hasTarget = item.target !== undefined && item.target !== null;
  const targetPct = hasTarget && item.target > 0 ? Math.round(((item.currentValue || 0) / item.target) * 100) : 0;

  const saveValue = () => {
    const nv = parseFloat(newVal);
    if (isNaN(nv)) { setShowValModal(false); return; }
    const vh = [...(item.valueHistory || []), { date: td(), value: nv, note: valNote || "" }];
    const updated = { ...item, currentValue: nv, valueHistory: vh };
    onUpdate(updated);
    if (onValueUpdate) onValueUpdate();
    if (checkProjectCompletion(updated) && item.status === "Ativo") {
      setTimeout(() => setCompletionConfirm({ type: "project", id: item.id, name: item.name }), 300);
    }
    setShowValModal(false);
    setNewVal("");
    setValNote("");
  };

  const saveProjectTask = (updatedTask) => {
    if (!editingTask) return;
    const phases = (item.phases || []).map(ph => {
      if (ph.id !== editingTask.phaseId) return ph;
      return {
        ...ph,
        tasks: (ph.tasks || []).map(t => t.id === editingTask.taskId ? { ...t, ...updatedTask } : t),
      };
    });
    const all = phases.flatMap(ph => ph.tasks || []);
    const done = all.filter(t => t.status === "Concluída").length;
    onUpdate({ ...item, phases, progress: all.length ? Math.round(done / all.length * 100) : 0 });
    setEditingTask(null);
  };

  if (editingTask) {
    return (
      <ProjectTaskForm
        item={editingTask.task}
        projectColor={item.color}
        onSave={saveProjectTask}
        onCancel={() => setEditingTask(null)}
      />
    );
  }

  return (
    <div style={{ padding: 14 }}>
      <TopBar title="" onBack={navBack || (() => nav("activities", "projects", "list"))} right={
        <div style={{ display: "flex", gap: 10 }}>
          <span onClick={() => nav("activities", "projects", "edit", item.id, "project")} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
          <span onClick={() => setShowDel(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></span>
        </div>
      } />
      <div style={{ fontSize: 17, fontWeight: 600, color: C.tx, marginBottom: 2 }}>{item.name}</div>
      {item.description && <div style={{ fontSize: 11, color: C.tx2, marginBottom: 8, lineHeight: 1.5 }}>{item.description}</div>}
      {item.objective && <div style={{ background: C.purple + "10", border: "0.5px solid " + C.purple + "30", borderRadius: 8, padding: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: C.purple, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Objetivo</div>
        <div style={{ fontSize: 12, color: C.tx }}>{item.objective}</div>
      </div>}

      {/* V2: Duas barras de progresso */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: C.tx3, marginBottom: 2 }}>Progresso tarefas</div>
        <PBar pct={item.progress || 0} color={item.color || C.gold} />
        <div style={{ fontSize: 11, color: C.tx3, marginTop: 1 }}>{doneTasks}/{allTasks.length} tarefas ({item.progress || 0}%)</div>
      </div>
      {hasTarget && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.tx3, marginBottom: 2 }}>Meta numérica</div>
          <PBar pct={Math.min(targetPct, 100)} color={targetPct >= 100 ? C.green : (item.color || C.gold)} />
          <div style={{ fontSize: 11, color: targetPct >= 100 ? C.green : C.tx3, marginTop: 1 }}>
            {item.unit === "R$" ? "R$" : ""}{item.currentValue || 0} / {item.unit === "R$" ? "R$" : ""}{item.target} {item.unit !== "R$" ? item.unit : ""} ({targetPct}%){targetPct >= 100 ? " — meta superada! ✓" : ""}
          </div>
          <Btn small primary onClick={() => { setNewVal(String(item.currentValue || 0)); setShowValModal(true); }} style={{ marginTop: 6 }}>Atualizar valor</Btn>
          {(item.valueHistory || []).length > 1 && <MiniChart data={item.valueHistory} target={item.target} color={item.color || C.gold} />}
          {(item.valueHistory || []).length > 0 && <div style={{ marginTop: 4 }}>
            {[...(item.valueHistory || [])].reverse().slice(0, 8).map((h, i) => (
              <div key={i} style={{ fontSize: 11, color: C.tx3, padding: "1px 0" }}>{fmtD(h.date)}: {item.unit === "R$" ? "R$" : ""}{h.value}{h.note ? " — " + h.note : ""}</div>
            ))}
          </div>}
        </div>
      )}

      {(() => { const est = getProjectRankEstimate(item); return (
        <div style={{ background: C.card, borderRadius: 8, padding: "7px 10px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: est.rank ? est.color + "22" : C.card, border: "1.5px solid " + (est.rank ? est.color : C.tx4), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: est.label === "—" ? 16 : 11, fontWeight: 800, color: est.rank ? est.color : C.tx4 }}>{est.label}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: est.rank ? est.color : C.tx3 }}>{est.rank ? `Rank ${est.label}` : "Em desenvolvimento"}</div>
            <div style={{ fontSize: 10, color: C.tx3 }}>{est.totalEnergia.toLocaleString()} ⚡ projetados · {allTasks.length} tarefa{allTasks.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
      ); })()}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
        <div style={{ background: C.card, borderRadius: 6, padding: 6, textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{item.progress || 0}%</div><div style={{ fontSize: 11, color: C.tx3 }}>Progresso</div></div>
        <div style={{ background: C.card, borderRadius: 6, padding: 6, textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{doneTasks}/{allTasks.length}</div><div style={{ fontSize: 11, color: C.tx3 }}>Tarefas</div></div>
        <div style={{ background: C.card, borderRadius: 6, padding: 6, textAlign: "center" }}>{mastery && <div style={{ display: "flex", justifyContent: "center", marginBottom: 2 }}><MaestriaSVG tier={mastery.name} size={24} /></div>}<div style={{ fontSize: 13, fontWeight: 600, color: mastery ? (item.color || C.gold) : C.tx3 }}>{mastery ? mastery.name : "\u2014"}</div><div style={{ fontSize: 11, color: C.tx3 }}>Maestria</div></div>
      </div>

      {/* V2: Chips de objetivos vinculados */}
      {(item.linkedObjectives || []).length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
          {(item.linkedObjectives || []).map(l => {
            const o = (objectives || []).find(x => x.id === l.id);
            return <div key={l.id} onClick={() => o && nav("activities", "objectives", "detail", o.id, "objective")} style={{ display: "flex", alignItems: "center", gap: 3, background: o && o.status === "Arquivado" ? C.card : C.goldDim, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: o && o.status === "Arquivado" ? C.tx4 : C.gold, border: "1px solid " + C.goldBrd, cursor: "pointer", transition: "opacity .12s" }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: o ? o.color : C.gold }} />{o ? o.name : "..."}{o && o.status === "Arquivado" && " (arquivado)"}
            </div>;
          })}
        </div>
      )}

      {item.status !== "Ativo" && <div style={{ marginBottom: 10 }}><Badge color={item.status === "Pausado" ? C.orange : item.status === "Arquivado" ? C.tx3 : C.green}>{item.status}</Badge></div>}

      {/* Fases */}
      {(item.phases || []).map((ph, phIdx) => {
        const phT = ph.tasks || [];
        const phD = phT.filter(t => t.status === "Concluída").length;
        const phP = phT.length ? Math.round(phD / phT.length * 100) : 0;
        const open = expanded[ph.id] !== false;
        const phaseComplete = ph.status === "Concluída";
        return (
          <div key={ph.id} style={{ background: C.card, borderRadius: 8, marginBottom: 6, overflow: "hidden", opacity: phaseComplete ? 0.6 : 1 }}>
            <div onClick={() => setExpanded(e => ({ ...e, [ph.id]: !open }))} style={{ padding: "9px 10px", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: C.tx, display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                {ph.name || ("Fase " + (phIdx + 1))}{phaseComplete ? " ✓" : ""}
              </span>
              <span style={{ fontSize: 11, color: C.tx2 }}>{phP}%</span>
            </div>
            <div style={{ height: 3, background: C.brd, borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", background: item.color || C.gold, width: phP + "%", borderRadius: 2, transition: "width .3s" }} /></div>
            {open && <div style={{ padding: "4px 10px 8px" }}>
              {ph.description && <div style={{ fontSize: 11, color: C.tx2, fontStyle: "italic", marginBottom: 6, padding: "4px 6px", background: C.bg, borderRadius: 4 }}>{ph.description}</div>}
              {ph.checkpoint && <div style={{ fontSize: 11, color: C.tx3, marginBottom: 4 }}>Checkpoint: {item.unit === "R$" ? "R$" : ""}{ph.checkpoint} {item.unit !== "R$" ? item.unit : ""}</div>}
              {phT.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "5px 0", borderBottom: "0.5px solid #1e1e24" }}>
                  <Chk done={t.status === "Concluída"} onClick={() => { if (t.status !== "Concluída") onComplete(t.id, "project", item.id, ph.id); }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: t.status === "Concluída" ? C.tx4 : C.tx, textDecoration: t.status === "Concluída" ? "line-through" : "none" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: C.tx3 }}><span style={{ color: C.gold }}>+{getEnergia(t.difficulty || 1)} ⚡</span></div>
                    {t.description && <div style={{ fontSize: 11, color: C.tx3, marginTop: 2, lineHeight: 1.4 }}>{t.description}</div>}
                    {t.notes && <div style={{ fontSize: 11, color: C.tx4, fontStyle: "italic", marginTop: 2 }}>{Array.isArray(t.notes) ? t.notes.map(n => n.text).filter(Boolean).join(" ") : t.notes}</div>}
                    {(t.priority || t.category || t.deadline || t.color || t.notificationEnabled) && <div style={{ fontSize: 11, color: C.tx3, marginTop: 2, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>{t.color && <span style={{ width: 7, height: 7, borderRadius: 4, background: t.color }} />}{[t.priority, t.category, t.deadline ? "Prazo: " + fmtD(t.deadline) + (t.deadlineTime ? " " + t.deadlineTime : "") : "", t.notificationEnabled && t.notificationDate && t.notificationTime ? "Lembrete: " + fmtD(t.notificationDate) + " " + t.notificationTime : ""].filter(Boolean).join(" · ")}</div>}
                  </div>
                  <span
                    onClick={() => setEditingTask({ phaseId: ph.id, taskId: t.id, task: t })}
                    title="Editar tarefa"
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx3, padding: 4, flexShrink: 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </span>
                </div>
              ))}
              {/* V2: Rotinas vinculadas à fase */}
              {(ph.linkedRoutines || []).map(lr => {
                const r = (allRoutines || []).find(x => x.id === lr.routineId);
                return r ? <div key={lr.routineId} onClick={() => nav("activities", "routines", "detail", r.id, "routine")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "0.5px solid #1e1e24", cursor: "pointer" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.purple }}>{r.name}</div><div style={{ fontSize: 11, color: C.tx3 }}>{fmtFreq(r)} · {r.streak} streak</div></div>
                </div> : null;
              })}
              {phaseComplete && <Btn small onClick={() => {
                const newPhases = (item.phases || []).map(p => p.id === ph.id ? { ...p, status: "Ativa" } : p);
                onUpdate({ ...item, phases: newPhases });
              }} style={{ marginTop: 6 }}>Reabrir fase</Btn>}
            </div>}
          </div>
        );
      })}
      <NotesLog notes={item.notes} onAdd={(text) => { const entry = { id: uid(), text, date: td() }; const cur = Array.isArray(item.notes) ? item.notes : (item.notes ? [{ id: uid(), text: item.notes, date: "" }] : []); onUpdate({ ...item, notes: [...cur, entry] }); }} onEdit={(noteId, newText) => { const cur = Array.isArray(item.notes) ? item.notes : []; onUpdate({ ...item, notes: cur.map(n => n.id === noteId ? { ...n, text: newText } : n) }); }} onRemove={(noteId) => { const cur = Array.isArray(item.notes) ? item.notes : []; onUpdate({ ...item, notes: cur.filter(n => n.id !== noteId) }); }} />
      {showDel && <DeleteModal onTrash={() => { setShowDel(false); onDelete(item, false); }} onPerm={() => { setShowDel(false); onDelete(item, true); }} onCancel={() => setShowDel(false)} />}
      {showValModal && <Modal>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, marginBottom: 8 }}>Atualizar valor</div>
        <Input type="number" value={newVal} onChange={setNewVal} placeholder="Novo valor" />
        <div style={{ marginTop: 6 }}><Input value={valNote} onChange={setValNote} placeholder="Nota (opcional)" /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn onClick={() => setShowValModal(false)} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn primary onClick={saveValue} style={{ flex: 1 }}>Salvar</Btn>
        </div>
      </Modal>}
    </div>
  );
}

function MiniChart({ data, target, color }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const max = Math.max(target || 0, ...vals) * 1.1 || 1;
  const w = 300, h = 80, pad = 4;
  const pts = data.map((d, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: h - pad - (d.value / max) * (h - pad * 2) }));
  const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ");
  return (
    <svg viewBox={"0 0 " + w + " " + h} style={{ width: "100%", height: 80, marginBottom: 8 }}>
      <line x1={pad} x2={w - pad} y1={h - pad - (target / max) * (h - pad * 2)} y2={h - pad - (target / max) * (h - pad * 2)} stroke={C.tx4} strokeDasharray="4,3" strokeWidth={0.5} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />)}
    </svg>
  );
}

function RoutineDetail({ item, onUpdate, onDelete, onComplete, nav, navBack, objectives, projects }) {
  const [showDel, setShowDel] = useState(false);
  const done = (item.completionLog || []).some(l => l.date === td());
  const mastery = getMastery(item.xpAccum || 0);
  const isLibre = migrateFreq(item).freq === "Livre";
  const projRef = item.phaseRef ? (projects || []).find(p => p.id === item.phaseRef.projectId) : null;
  const notificationText = fmtRoutineNotification(item);

  return (
    <div style={{ padding: 14 }}>
      <TopBar title="" onBack={navBack || (() => nav("activities", "routines", "list"))} right={
        <div style={{ display: "flex", gap: 10 }}>
          <span onClick={() => nav("activities", "routines", "edit", item.id, "routine")} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
          <span onClick={() => setShowDel(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></span>
        </div>
      } />
      <div style={{ fontSize: 17, fontWeight: 600, color: C.tx, marginBottom: 2 }}>{item.name}</div>
      {item.description && <div style={{ fontSize: 11, color: C.tx2, marginBottom: 8, lineHeight: 1.5 }}>{item.description}</div>}
      <div style={{ fontSize: 11, color: C.tx2, marginBottom: 10 }}>
        <Badge color={item.frequency === "Diário" ? C.gold : C.purple}>{fmtFreq(item)}</Badge>
        <span style={{ marginLeft: 8 }}>Dif. {item.difficulty} +{getEnergia(item.difficulty)} ⚡ +{getMoedas(item.difficulty)} moedas</span>
      </div>
      {projRef && <div style={{ fontSize: 11, color: C.purple, marginBottom: 8, padding: "4px 8px", background: C.purple + "15", borderRadius: 5 }}>→ {projRef.name}</div>}
      {notificationText && <div style={{ fontSize: 11, color: C.gold, marginBottom: 8, padding: "4px 8px", background: C.goldDim, borderRadius: 5, border: "1px solid " + C.goldBrd }}>{notificationText}</div>}
      <div style={{ display: "grid", gridTemplateColumns: isLibre ? "1fr" : "1fr 1fr 1fr", gap: 5, marginBottom: !isLibre && item.streak > 0 ? 6 : 10 }}>
        {!isLibre && <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 600, color: C.orange }}>{item.streak}</div><div style={{ fontSize: 11, color: C.tx3 }}>Streak</div></div>}
        {!isLibre && <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 600, color: C.tx }}>{item.bestStreak}</div><div style={{ fontSize: 11, color: C.tx3 }}>Melhor</div></div>}
        <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 600, color: C.tx }}>{item.totalCompletions}</div><div style={{ fontSize: 11, color: C.tx3 }}>{isLibre ? "Execuções" : "Total"}</div></div>
      </div>
      {!isLibre && item.streak > 0 && (() => {
        const milestones = STREAK_MULT.map(s => s.days).sort((a,b) => a-b);
        const next = milestones.find(m => m > item.streak);
        const prev = milestones.filter(m => m <= item.streak).pop() || 0;
        if (!next) return null;
        const pct = Math.round((item.streak - prev) / (next - prev) * 100);
        return (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx4, marginBottom: 3 }}>
              <span style={{ color: C.orange }}>{item.streak} streak</span>
              <span>→ {next} dias (+{Math.round(STREAK_MULT.find(s => s.days === next).bonus*100)}% bônus)</span>
            </div>
            <div style={{ height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: C.orange, borderRadius: 2, transition: "width .4s" }} />
            </div>
          </div>
        );
      })()}
      {item.status === "Ativa" && <Btn primary onClick={() => { if (!done) onComplete(item.id); }} style={{ width: "100%", marginBottom: 10, opacity: done ? 0.5 : 1 }}>{done ? "Concluída hoje" : "Marcar como concluída"}</Btn>}
      {item.status === "Desativada" && <Btn primary onClick={() => onUpdate({ ...item, status: "Ativa", consecutiveFails: 0, streak: 0 })} style={{ width: "100%", marginBottom: 10 }}>Reativar rotina</Btn>}
      {mastery && <div style={{ fontSize: 11, color: C.tx2, marginBottom: 8 }}>Maestria: <Badge color={item.color || C.green}>{mastery.name}</Badge> {item.xpAccum || 0} ⚡</div>}
      {/* V2: Chips de objetivos */}
      {(item.linkedObjectives || []).length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {(item.linkedObjectives || []).map(l => {
          const o = (objectives || []).find(x => x.id === l.id);
          return <div key={l.id} onClick={() => o && nav("activities", "objectives", "detail", o.id, "objective")} style={{ display: "flex", alignItems: "center", gap: 3, background: C.goldDim, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: C.gold, border: "1px solid " + C.goldBrd, cursor: "pointer", transition: "opacity .12s" }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: o ? o.color : C.gold }} />{o ? o.name : "..."}
          </div>;
        })}
      </div>}
      <NotesLog notes={item.notes} onAdd={(text) => { const entry = { id: uid(), text, date: td() }; const cur = Array.isArray(item.notes) ? item.notes : (item.notes ? [{ id: uid(), text: item.notes, date: "" }] : []); onUpdate({ ...item, notes: [...cur, entry] }); }} onEdit={(noteId, newText) => { const cur = Array.isArray(item.notes) ? item.notes : []; onUpdate({ ...item, notes: cur.map(n => n.id === noteId ? { ...n, text: newText } : n) }); }} onRemove={(noteId) => { const cur = Array.isArray(item.notes) ? item.notes : []; onUpdate({ ...item, notes: cur.filter(n => n.id !== noteId) }); }} />
      {(item.completionLog || []).length > 0 && <div><SLabel>Conclusões</SLabel>
        {[...(item.completionLog || [])].reverse().slice(0, 10).map((l, i) => (
          <div key={i} style={{ fontSize: 11, color: C.tx2, padding: "2px 0" }}>{fmtD(l.date)} +{l.xp} ⚡ +{l.coins} moedas</div>
        ))}
      </div>}
      {showDel && <DeleteModal onTrash={() => { setShowDel(false); onDelete(item, false); }} onPerm={() => { setShowDel(false); onDelete(item, true); }} onCancel={() => setShowDel(false)} />}
    </div>
  );
}

function TaskDetail({ item, onUpdate, onDelete, onComplete, nav, navBack, objectives, onPromote }) {
  const [showDel, setShowDel] = useState(false);
  const doneTask = item.status === "Concluída";
  const overdueDays = item.deadline ? Math.floor((new Date(td()) - new Date(item.deadline)) / 86400000) : 0;

  return (
    <div style={{ padding: 14 }}>
      <TopBar title="" onBack={navBack || (() => nav("activities", "tasks", "list"))} right={
        <div style={{ display: "flex", gap: 10 }}>
          <span onClick={() => nav("activities", "tasks", "edit", item.id, "task")} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
          <span onClick={() => setShowDel(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></span>
        </div>
      } />
      <div style={{ fontSize: 17, fontWeight: 600, color: doneTask ? C.tx4 : C.tx, textDecoration: doneTask ? "line-through" : "none", marginBottom: 2 }}>{item.name}</div>
      {item.description && <div style={{ fontSize: 11, color: C.tx2, marginBottom: 8, lineHeight: 1.5 }}>{item.description}</div>}
      <div style={{ fontSize: 11, color: C.tx2, marginBottom: 10 }}>
        Dif. {item.difficulty || 1} <span style={{ color: C.gold }}>+{getEnergia(item.difficulty || 1)} ⚡</span> +{getMoedas(item.difficulty || 1)} moedas
        {item.priority && (" " + item.priority)} {item.deadline && ("Prazo: " + fmtD(item.deadline) + (item.deadlineTime ? " " + item.deadlineTime : ""))}
      </div>
      {item.notificationEnabled && item.notificationDate && item.notificationTime && <div style={{ fontSize: 11, color: C.gold, marginBottom: 8, padding: "4px 8px", background: C.goldDim, borderRadius: 5, border: "1px solid " + C.goldBrd }}>Lembrete: {fmtD(item.notificationDate)} {item.notificationTime}</div>}
      {overdueDays > 0 && !doneTask && <div style={{ fontSize: 11, color: C.red, fontWeight: 600, marginBottom: 8, padding: "4px 8px", background: C.red + "15", borderRadius: 5 }}>Vencida há {overdueDays} dia{overdueDays > 1 ? "s" : ""}</div>}
      {!doneTask && <Btn primary onClick={() => onComplete(item.id)} style={{ width: "100%", marginBottom: 10 }}>Concluir tarefa</Btn>}
      {/* V2: Promover a projeto */}
      {!doneTask && onPromote && <Btn onClick={() => onPromote(item)} style={{ width: "100%", marginBottom: 10 }}>Promover a projeto</Btn>}
      {/* V2: Chips de objetivos */}
      {(item.linkedObjectives || []).length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {(item.linkedObjectives || []).map(l => {
          const o = (objectives || []).find(x => x.id === l.id);
          return <div key={l.id} onClick={() => o && nav("activities", "objectives", "detail", o.id, "objective")} style={{ display: "flex", alignItems: "center", gap: 3, background: C.goldDim, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: C.gold, border: "1px solid " + C.goldBrd, cursor: "pointer", transition: "opacity .12s" }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: o ? o.color : C.gold }} />{o ? o.name : "..."}
          </div>;
        })}
      </div>}
      <NotesLog notes={item.notes} onAdd={(text) => { const entry = { id: uid(), text, date: td() }; const cur = Array.isArray(item.notes) ? item.notes : (item.notes ? [{ id: uid(), text: item.notes, date: "" }] : []); onUpdate({ ...item, notes: [...cur, entry] }); }} onEdit={(noteId, newText) => { const cur = Array.isArray(item.notes) ? item.notes : []; onUpdate({ ...item, notes: cur.map(n => n.id === noteId ? { ...n, text: newText } : n) }); }} onRemove={(noteId) => { const cur = Array.isArray(item.notes) ? item.notes : []; onUpdate({ ...item, notes: cur.filter(n => n.id !== noteId) }); }} />
      {showDel && <DeleteModal onTrash={() => { setShowDel(false); onDelete(item, false); }} onPerm={() => { setShowDel(false); onDelete(item, true); }} onCancel={() => setShowDel(false)} />}
    </div>
  );
}

/* ═══ V2: OBJECTIVE DETAIL ═══ */
function ObjectiveDetail({ item, onUpdate, onDelete, objectives, projects, routines, tasks, nav, navBack, onLinkActivity, onUnlinkActivity }) {
  const [showDel, setShowDel] = useState(false);
  const [showActSearch, setShowActSearch] = useState(false);
  const [unlinkToast, setUnlinkToast] = useState(null);
  const xp = useMemo(() => calcObjectiveXp(item.id, projects, routines, tasks, objectives), [item.id, projects, routines, tasks, objectives]);
  const linkedProjects = (item.linkedActivities || []).filter(l => l.type === "project").map(l => projects.find(p => p.id === l.id)).filter(Boolean);
  const linkedRoutines = (item.linkedActivities || []).filter(l => l.type === "routine").map(l => routines.find(r => r.id === l.id)).filter(Boolean);
  const linkedTasks = (item.linkedActivities || []).filter(l => l.type === "task").map(l => tasks.find(t => t.id === l.id)).filter(Boolean);
  const subObjs = (item.linkedObjectives || []).filter(l => l.relation === "menor").map(l => objectives.find(o => o.id === l.id)).filter(Boolean);
  const subObjsXp = useMemo(() => {
    const m = {}; subObjs.forEach(o => { m[o.id] = calcObjectiveXp(o.id, projects, routines, tasks, objectives); }); return m;
  }, [subObjs, projects, routines, tasks, objectives]);
  const parentObj = (item.linkedObjectives || []).filter(l => l.relation === "maior").map(l => objectives.find(o => o.id === l.id)).filter(Boolean);

  const unlinkActivity = (actId, actType, actName) => {
    onUpdate({ ...item, linkedActivities: (item.linkedActivities || []).filter(l => !(l.id === actId && l.type === actType)) });
    if (onUnlinkActivity) onUnlinkActivity(actId, actType, item.id);
    setUnlinkToast(actName || "Atividade");
    setTimeout(() => setUnlinkToast(null), 2200);
  };

  const linkActivity = (act) => {
    const type = act._type;
    if ((item.linkedActivities || []).find(l => l.id === act.id && l.type === type)) return;
    onUpdate({ ...item, linkedActivities: [...(item.linkedActivities || []), { id: act.id, type }] });
    if (onLinkActivity) onLinkActivity(act.id, type, item.id);
    setShowActSearch(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <TopBar title="" onBack={navBack || (() => nav("activities", "objectives", "list"))} right={
        <div style={{ display: "flex", gap: 10 }}>
          <span onClick={() => nav("activities", "objectives", "edit", item.id, "objective")} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
          <span onClick={() => setShowDel(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></span>
        </div>
      } />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: item.color }} />
        <div style={{ fontSize: 17, fontWeight: 600, color: C.tx }}>{item.name}</div>
      </div>
      {item.purpose && <div style={{ fontSize: 11, color: C.tx2, fontStyle: "italic", marginBottom: 8, lineHeight: 1.5 }}>{item.purpose}</div>}

      {(() => { const est = getEnergyRankEstimate(xp); return (
        <div style={{ background: C.card, borderRadius: 8, padding: "7px 10px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: est.rank ? est.color + "22" : C.card, border: "1.5px solid " + (est.rank ? est.color : C.tx4), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: est.label === "—" ? 16 : 11, fontWeight: 800, color: est.rank ? est.color : C.tx4 }}>{est.label}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: est.rank ? est.color : C.tx3 }}>{est.rank ? `Rank ${est.label}` : "Em desenvolvimento"}</div>
            <div style={{ fontSize: 10, color: C.tx3 }}>{xp.toLocaleString()} ⚡ ENERGIA espelhada</div>
          </div>
        </div>
      ); })()}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 12 }}>
        <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 600, color: C.gold }}>{xp.toLocaleString()}</div><div style={{ fontSize: 11, color: C.tx3 }}>⚡ ENERGIA</div></div>
        <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 600, color: C.tx }}>{(item.linkedActivities || []).length}</div><div style={{ fontSize: 11, color: C.tx3 }}>Atividades</div></div>
        <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 600, color: C.tx }}>{subObjs.length}</div><div style={{ fontSize: 11, color: C.tx3 }}>Sub-obj.</div></div>
      </div>

      {/* Projetos vinculados */}
      {linkedProjects.length > 0 && <div><SLabel>Projetos vinculados</SLabel>
        {linkedProjects.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "0.5px solid " + C.brd }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: p.color || C.gold }} />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav("activities", "projects", "detail", p.id, "project")}>
              <div style={{ fontSize: 11, color: C.tx }}>{p.name}</div>
              <div style={{ display: "flex", gap: 6, fontSize: 11, color: C.tx3 }}><PBar pct={p.progress || 0} color={p.color || C.gold} /><span>{p.progress || 0}%</span></div>
            </div>
            <span onClick={() => unlinkActivity(p.id, "project", p.name)} style={{ cursor: "pointer", color: C.tx4, display: "flex", alignItems: "center" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          </div>
        ))}
      </div>}

      {/* Rotinas vinculadas */}
      {linkedRoutines.length > 0 && <div><SLabel>Rotinas vinculadas</SLabel>
        {linkedRoutines.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "0.5px solid " + C.brd }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav("activities", "routines", "detail", r.id, "routine")}>
              <div style={{ fontSize: 11, color: C.tx }}>{r.name}</div>
              <div style={{ fontSize: 11, color: C.tx3 }}>{fmtFreq(r)} · {r.streak} streak</div>
            </div>
            <span onClick={() => unlinkActivity(r.id, "routine", r.name)} style={{ cursor: "pointer", color: C.tx4, display: "flex", alignItems: "center" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          </div>
        ))}
      </div>}

      {/* Tarefas vinculadas */}
      {linkedTasks.length > 0 && <div><SLabel>Tarefas vinculadas</SLabel>
        {linkedTasks.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "0.5px solid " + C.brd }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav("activities", "tasks", "detail", t.id, "task")}>
              <div style={{ fontSize: 11, color: t.status === "Concluída" ? C.tx4 : C.tx, textDecoration: t.status === "Concluída" ? "line-through" : "none" }}>{t.name}</div>
            </div>
            <span onClick={() => unlinkActivity(t.id, "task", t.name)} style={{ cursor: "pointer", color: C.tx4, display: "flex", alignItems: "center" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          </div>
        ))}
      </div>}

      {/* Sub-objetivos */}
      {subObjs.length > 0 && <div><SLabel>Sub-objetivos</SLabel>
        {subObjs.map(o => (
          <div key={o.id} onClick={() => nav("activities", "objectives", "detail", o.id, "objective")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "0.5px solid " + C.brd, cursor: "pointer" }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: o.color }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.tx }}>{o.name}</div></div>
            <span style={{ fontSize: 11, color: C.gold }}>{(subObjsXp[o.id] || 0).toLocaleString()} ⚡</span>
          </div>
        ))}
      </div>}

      {/* Objetivo maior */}
      {parentObj.length > 0 && <div><SLabel>Objetivo maior</SLabel>
        {parentObj.map(o => (
          <div key={o.id} onClick={() => nav("activities", "objectives", "detail", o.id, "objective")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", cursor: "pointer" }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: o.color }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.tx, display: "flex", alignItems: "center", gap: 4 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>{o.name}</div></div>
          </div>
        ))}
      </div>}

      {/* Estado vazio */}
      {(item.linkedActivities || []).length === 0 && subObjs.length === 0 && (
        <div style={{ textAlign: "center", padding: 20, color: C.tx3, fontSize: 11, fontStyle: "italic" }}>Vincule atividades para começar a ver o progresso deste objetivo.</div>
      )}

      <Btn onClick={() => setShowActSearch(true)} style={{ width: "100%", marginTop: 8, marginBottom: 10 }}>+ Vincular atividade</Btn>

      {/* V2: Status management */}
      {item.status === "Ativo" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <Btn small onClick={() => onUpdate({ ...item, status: "Concluído" })} style={{ flex: 1 }}>Concluir objetivo</Btn>
          <Btn small onClick={() => onUpdate({ ...item, status: "Arquivado" })} style={{ flex: 1 }}>Arquivar</Btn>
        </div>
      )}
      {item.status === "Concluído" && (
        <div style={{ marginBottom: 10 }}>
          <Badge color={C.green}>Concluído</Badge>
          <Btn small onClick={() => onUpdate({ ...item, status: "Ativo" })} style={{ marginTop: 6, width: "100%" }}>Reabrir objetivo</Btn>
        </div>
      )}
      {item.status === "Arquivado" && (
        <div style={{ marginBottom: 10 }}>
          <Badge color={C.tx3}>Arquivado</Badge>
          <Btn small onClick={() => onUpdate({ ...item, status: "Ativo" })} style={{ marginTop: 6, width: "100%" }}>Reativar objetivo</Btn>
        </div>
      )}

      {showDel && <ConfirmModal
        title={`Deletar "${item.name}"?`}
        subtitle="Escolha se as atividades vinculadas também serão removidas."
        actions={[
          { label: "Deletar apenas o objetivo", onClick: () => { setShowDel(false); onDelete(item.id, false); } },
          { label: "Deletar tudo junto", danger: true, onClick: () => { setShowDel(false); onDelete(item.id, true); } },
          { label: "Cancelar", onClick: () => setShowDel(false), mt: true },
        ]}
      />}
      {showActSearch && <ActivitySearchModal projects={projects} routines={routines} tasks={tasks} objectives={objectives} onSelect={linkActivity} onClose={() => setShowActSearch(false)} />}
      {unlinkToast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#1a1d2eee", border: "1px solid " + C.brd2, borderRadius: 10, padding: "9px 18px", zIndex: 320, fontSize: 11, color: C.tx2, boxShadow: "0 3px 12px #0006", whiteSpace: "nowrap" }}>
          <span style={{ color: C.tx3 }}>Desvinculado: </span><span style={{ color: C.tx }}>{unlinkToast}</span>
        </div>
      )}
    </div>
  );
}


/* ═══ HISTORY / SHOP / CONFIG ═══ */


export { ProjectDetail, RoutineDetail, TaskDetail, ObjectiveDetail };
