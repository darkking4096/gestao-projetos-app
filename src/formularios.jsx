import { useState, useMemo } from "react";
import { C } from './temas.js';
import { uid, td, getLevelInfo, getMastery, getXp, getCoins, fmtFreq, fmtD, isRoutineDueToday, calcObjectiveXp, wouldCreateCycle, checkProjectCompletion, removeObjectiveLinksFromActivities, similarName, migrateFreq } from './utilidades.js';
import { CATEGORIES, PRIORITIES, COLORS, FREQUENCIES, WEEK_DAYS, UNITS, DEFAULT_PRESETS, MASTERY_LEVELS } from './constantes.js';
import { Field, Input, SelBtns, ColorPick, DiffPick, Toggle, SLabel, Btn, Card, TopBar, Modal, Badge } from './componentes-base.jsx';

function ProjectForm({ item, onSave, onCancel, objectives, routines: allRoutines }) {
  const [name, setName] = useState(item ? item.name : "");
  const [obj, setObj] = useState(item ? item.objective : "");
  const [color, setColor] = useState(item ? item.color : COLORS[0]);
  const [pri, setPri] = useState(item ? item.priority || "" : "");
  const [cat, setCat] = useState(item ? item.category || "" : "");
  const [dl, setDl] = useState(item ? item.deadline || "" : "");
  const [desc, setDesc] = useState(item ? item.description || "" : "");
  const [notes, setNotes] = useState("");
  const [phases, setPhases] = useState(item ? item.phases || [] : []);
  const [status, setStatus] = useState(item ? item.status || "Ativo" : "Ativo");
  const [mods, setMods] = useState(item ? (item.modulars || { description: false, category: false, priority: true, deadline: false, color: true, notes: false }) : { description: false, category: false, priority: true, deadline: false, color: true, notes: false });
  // V2: numeric target
  const [hasTarget, setHasTarget] = useState(item ? (item.target !== undefined && item.target !== null) : false);
  const [target, setTarget] = useState(item ? String(item.target || "") : "");
  const [currentValue, setCurrentValue] = useState(item ? String(item.currentValue || "") : "");
  const [unit, setUnit] = useState(item ? item.unit || "R$" : "R$");
  // V2: linked objectives
  const [linkedObj, setLinkedObj] = useState(item ? (item.linkedObjectives || []) : []);
  const [showObjSearch, setShowObjSearch] = useState(false);
  const [linkRoutinePhase, setLinkRoutinePhase] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tMod = (k) => setMods(m => ({ ...m, [k]: !m[k] }));
  const addPhase = () => setPhases(p => [...p, { id: uid(), name: "", order: p.length + 1, tasks: [], linkedRoutines: [], status: "Ativa" }]);
  const updPhase = (idx, data) => setPhases(p => p.map((ph, i) => i === idx ? { ...ph, ...data } : ph));
  const rmPhase = (idx) => setPhases(p => p.filter((_, i) => i !== idx));
  const movePhase = (idx, dir) => {
    setPhases(p => {
      const arr = [...p];
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return arr;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return arr;
    });
  };
  const addPhTask = (pi) => setPhases(p => p.map((ph, i) => i === pi ? { ...ph, tasks: [...(ph.tasks || []), { id: uid(), name: "", difficulty: 5, type: "Unica", status: "Pendente" }] } : ph));
  const updPhTask = (pi, ti, data) => setPhases(p => p.map((ph, i) => i === pi ? { ...ph, tasks: ph.tasks.map((t, j) => j === ti ? { ...t, ...data } : t) } : ph));
  const rmPhTask = (pi, ti) => setPhases(p => p.map((ph, i) => i === pi ? { ...ph, tasks: ph.tasks.filter((_, j) => j !== ti) } : ph));

  const save = () => {
    if (!name.trim()) return;
    // V2: Validate checkpoints
    if (hasTarget && parseFloat(target)) {
      const tgt = parseFloat(target);
      for (const ph of phases) {
        if (ph.checkpoint && parseFloat(ph.checkpoint) > tgt) {
          alert("Checkpoint da fase '" + (ph.name || "Fase") + "' não pode ser maior que o alvo do projeto (" + tgt + ").");
          return;
        }
      }
    }
    const allT = phases.flatMap(ph => ph.tasks || []);
    const doneT = allT.filter(t => t.status === "Concluída").length;
    const pct = allT.length ? Math.round(doneT / allT.length * 100) : 0;
    let finalNotes = item ? (item.notes || []) : [];
    if (notes.trim()) {
      const existing = Array.isArray(finalNotes) ? finalNotes : [];
      finalNotes = [...existing, { id: uid(), text: notes.trim(), date: td() }];
    }
    const data = {
      ...(item || {}), name, objective: obj, color, priority: pri, category: cat, deadline: dl,
      description: desc, notes: finalNotes, phases, modulars: mods, progress: pct, status,
      linkedObjectives: linkedObj,
    };
    if (hasTarget) {
      data.target = parseFloat(target) || undefined;
      data.currentValue = parseFloat(currentValue) || 0;
      data.unit = unit;
      if (!item) data.valueHistory = [{ date: td(), value: parseFloat(currentValue) || 0, note: "Valor inicial" }];
    } else {
      data.target = undefined;
      data.currentValue = undefined;
      data.unit = undefined;
    }
    onSave(data);
  };

  const linkObjective = (o) => {
    if (!linkedObj.find(l => l.id === o.id)) {
      setLinkedObj(prev => [...prev, { id: o.id, relation: "menor" }]);
    }
    setShowObjSearch(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <TopBar title={item ? "Editar Projeto" : "Novo Projeto"} onBack={onCancel} />
      <Field label="Nome" req><Input value={name} onChange={setName} placeholder="Nome do projeto" /></Field>
      <Field label="Objetivo final"><Input value={obj} onChange={setObj} placeholder="Visão do resultado (opcional)" multiline /></Field>
      <Field label="Cor"><ColorPick value={color} onChange={setColor} /></Field>
      {item && <div style={{ marginTop: 4, marginBottom: 4 }}><Field label="Status"><SelBtns options={["Ativo", "Pausado", "Arquivado"]} value={status} onChange={setStatus} /></Field></div>}

      {/* Avançado — seção colapsável */}
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 10, border: "1px solid " + C.brd, padding: "10px 12px" }}>
        <div onClick={() => setShowAdvanced(v => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.5, textTransform: "uppercase" }}>Avançado</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        {showAdvanced && <div style={{ marginTop: 10 }}>
          {/* V2: Meta numérica */}
          <Toggle on={hasTarget} onToggle={() => setHasTarget(!hasTarget)} label="Meta numérica" />
          {hasTarget && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Field label="Alvo"><Input type="number" value={target} onChange={setTarget} placeholder="Valor alvo" /></Field>
              <Field label="Atual"><Input type="number" value={currentValue} onChange={setCurrentValue} placeholder="Onde está" /></Field>
              <Field label="Unidade">
                <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: "100%", padding: "8px 6px", background: C.card, border: "0.5px solid " + C.brd2, borderRadius: 6, color: C.tx, fontSize: 11 }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          )}
          <Toggle on={mods.priority} onToggle={() => tMod("priority")} label="Prioridade" />
          {mods.priority && <SelBtns options={PRIORITIES} value={pri} onChange={setPri} />}
          <Toggle on={mods.category} onToggle={() => tMod("category")} label="Categoria" />
          {mods.category && <SelBtns options={CATEGORIES} value={cat} onChange={setCat} />}
          <Toggle on={mods.deadline} onToggle={() => tMod("deadline")} label="Prazo" />
          {mods.deadline && <Input type="date" value={dl} onChange={setDl} min={td()} />}
          <Toggle on={mods.description} onToggle={() => tMod("description")} label="Descrição" />
          {mods.description && <Input value={desc} onChange={setDesc} multiline placeholder="Contexto, escopo..." />}
          {!item && <Toggle on={mods.notes} onToggle={() => tMod("notes")} label="Nota inicial" />}
          {!item && mods.notes && <Input value={notes} onChange={setNotes} multiline placeholder="Primeira nota do projeto..." style={{ minHeight: 80 }} />}
          {item && <div style={{ fontSize: 11, color: C.tx4, padding: "6px 0" }}>{"Notas: gerencie na tela de detalhe (" + (Array.isArray(item.notes) ? item.notes.length : 0) + " notas)"}</div>}
        </div>}
      </div>

      {/* V2: Vincular a objetivo */}
      <SLabel>Vincular a objetivo</SLabel>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        {linkedObj.map(l => {
          const o = (objectives || []).find(x => x.id === l.id);
          return <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 3, background: C.goldDim, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: C.gold, border: "1px solid " + C.goldBrd }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: o ? o.color : C.gold }} />{o ? o.name : "..."}<span onClick={() => setLinkedObj(prev => prev.filter(x => x.id !== l.id))} style={{ cursor: "pointer", marginLeft: 4, color: C.tx3, display: "inline-flex", alignItems: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          </div>;
        })}
        <div onClick={() => setShowObjSearch(true)} style={{ fontSize: 11, color: C.tx3, cursor: "pointer", padding: "3px 8px", border: "1px dashed " + C.brd2, borderRadius: 5, transition: "color .12s, border-color .12s" }}>+ Objetivo</div>
      </div>

      <SLabel>Fases</SLabel>
      {phases.map((ph, i) => (
        <Card key={ph.id} style={{ borderLeft: "3px solid " + color, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
            <Input value={ph.name} onChange={v => updPhase(i, { name: v })} placeholder={"Fase " + (i + 1)} style={{ flex: 1 }} />
            {phases.length > 1 && <>
              <span onClick={() => movePhase(i, -1)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "0 2px", opacity: i > 0 ? 1 : 0.3 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </span>
              <span onClick={() => movePhase(i, 1)} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "0 2px", opacity: i < phases.length - 1 ? 1 : 0.3 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </>}
            <Btn small danger onClick={() => rmPhase(i)}>{"✕"}</Btn>
          </div>
          <Input value={ph.description || ""} onChange={v => updPhase(i, { description: v })} placeholder={"Nota da fase (opcional)"} style={{ fontSize: 11, padding: "4px 8px", marginBottom: 6 }} />
          {hasTarget && <div style={{ marginBottom: 6 }}>
            <Input type="number" value={ph.checkpoint || ""} onChange={v => updPhase(i, { checkpoint: v })} placeholder="Checkpoint numérico (opcional)" style={{ fontSize: 11, padding: "4px 8px" }} />
          </div>}
          {(ph.tasks || []).map((t, ti) => (
            <div key={t.id} style={{ paddingLeft: 8, marginBottom: 6, borderLeft: "1px solid " + C.brd }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 2 }}>
                <Input value={t.name} onChange={v => updPhTask(i, ti, { name: v })} placeholder="Tarefa..." style={{ flex: 1, fontSize: 11, padding: "5px 8px" }} />
                <select value={t.difficulty} onChange={e => updPhTask(i, ti, { difficulty: Number(e.target.value) })} style={{ background: C.card, color: C.gold, border: "0.5px solid " + C.brd, borderRadius: 4, fontSize: 11, padding: "2px 4px" }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span onClick={() => rmPhTask(i, ti)} style={{ color: C.red, cursor: "pointer", display: "flex", alignItems: "center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
              </div>
              <Input value={t.notes || ""} onChange={v => updPhTask(i, ti, { notes: v })} placeholder="Nota da tarefa (opcional)" style={{ fontSize: 11, padding: "3px 6px", color: C.tx3 }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <div onClick={() => addPhTask(i)} style={{ fontSize: 11, color: C.tx3, cursor: "pointer", paddingLeft: 8, marginTop: 4 }}>+ Tarefa</div>
            <div onClick={() => setLinkRoutinePhase(i)} style={{ fontSize: 11, color: C.purple, cursor: "pointer", paddingLeft: 8, marginTop: 4 }}>+ Rotina</div>
          </div>
          {/* V2: Rotinas vinculadas à fase */}
          {(ph.linkedRoutines || []).length > 0 && <div style={{ marginTop: 6, paddingLeft: 8, borderLeft: "1px solid " + C.purple + "40" }}>
            {(ph.linkedRoutines || []).map(lr => {
              const r = (allRoutines || []).find(x => x.id === lr.routineId);
              return r ? <div key={lr.routineId} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.purple, padding: "2px 0" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg><span>{r.name}</span><span onClick={() => updPhase(i, { linkedRoutines: (ph.linkedRoutines || []).filter(x => x.routineId !== lr.routineId) })} style={{ cursor: "pointer", color: C.tx4, display: "inline-flex", alignItems: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
              </div> : null;
            })}
          </div>}
        </Card>
      ))}
      <div onClick={addPhase} style={{ padding: 10, border: "1px dashed " + C.brd2, borderRadius: 8, textAlign: "center", fontSize: 11, color: C.tx3, cursor: "pointer", marginBottom: 12, transition: "color .12s, border-color .12s" }}>+ Nova fase</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn primary onClick={save} style={{ flex: 1 }}>{item ? "Salvar" : "Criar projeto"}</Btn>
      </div>
      {showObjSearch && <ObjectiveSearchModal objectives={objectives || []} onSelect={linkObjective} onClose={() => setShowObjSearch(false)} />}
      {linkRoutinePhase !== null && <Modal>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, marginBottom: 8 }}>Vincular rotina à fase</div>
        <div style={{ maxHeight: 250, overflow: "auto" }}>
          {(allRoutines || []).filter(r => r.status === "Ativa" && !(phases[linkRoutinePhase] && (phases[linkRoutinePhase].linkedRoutines || []).some(lr => lr.routineId === r.id))).map(r => (
            <div key={r.id} onClick={() => {
              const pi = linkRoutinePhase;
              updPhase(pi, { linkedRoutines: [...(phases[pi].linkedRoutines || []), { routineId: r.id }] });
              setLinkRoutinePhase(null);
            }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 6px", cursor: "pointer", borderBottom: "0.5px solid " + C.brd }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              <div><div style={{ fontSize: 11, color: C.tx }}>{r.name}</div><div style={{ fontSize: 11, color: C.tx3 }}>{fmtFreq(r)} · {r.streak} streak</div></div>
            </div>
          ))}
          {(allRoutines || []).filter(r => r.status === "Ativa").length === 0 && <div style={{ fontSize: 11, color: C.tx4, padding: 16, textAlign: "center" }}>Nenhuma rotina ativa disponível</div>}
        </div>
        <Btn onClick={() => setLinkRoutinePhase(null)} style={{ width: "100%", marginTop: 8 }}>Fechar</Btn>
      </Modal>}
    </div>
  );
}

function RoutineForm({ item, onSave, onCancel, presets, objectives }) {
  const [name, setName] = useState(item ? item.name : "");
  const [diff, setDiff] = useState(item ? item.difficulty || 5 : 5);
  const migrated = migrateFreq(item);
  const [freq, setFreq] = useState(migrated.freq);
  const [freqDays, setFreqDays] = useState(migrated.days);
  const [color, setColor] = useState(item ? item.color : COLORS[2]);
  const [pri, setPri] = useState(item ? item.priority || "" : "");
  const [cat, setCat] = useState(item ? item.category || "" : "");
  const [desc, setDesc] = useState(item ? item.description || "" : "");
  const [notes, setNotes] = useState("");
  const [mods, setMods] = useState(item ? (item.modulars || { description: false, category: false, priority: false, notes: false }) : { description: false, category: false, priority: false, notes: false });
  const [linkedObj, setLinkedObj] = useState(item ? (item.linkedObjectives || []) : []);
  const [showObjSearch, setShowObjSearch] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tMod = (k) => setMods(m => ({ ...m, [k]: !m[k] }));
  const handleCat = (c) => {
    setCat(c);
    if (!item && c && presets && presets[c]) setDiff(presets[c]);
  };
  const toggleDay = (day) => {
    if (freq === "Semanal") { setFreqDays(freqDays[0] === day ? [] : [day]); } else { setFreqDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]); }
  };
  const handleFreqChange = (f) => {
    if (freq === f) return;
    setFreq(f);
    if (f !== "Semanal" && f !== "Personalizado") setFreqDays([]);
  };

  const save = () => {
    if (!name.trim()) return;
    if (freq === "Semanal" && freqDays.length === 0) return;
    if (freq === "Personalizado" && freqDays.length === 0) return;
    let finalNotes = item ? (item.notes || []) : [];
    if (notes.trim()) { const ex = Array.isArray(finalNotes) ? finalNotes : []; finalNotes = [...ex, { id: uid(), text: notes.trim(), date: td() }]; }
    // V2: streak NÃO é zerado ao mudar frequência
    onSave({ ...(item || {}), name, difficulty: diff, frequency: freq, frequencyDays: freqDays, color, priority: pri, category: cat, description: desc, notes: finalNotes, modulars: mods, linkedObjectives: linkedObj });
  };

  const needsDays = freq === "Semanal" || freq === "Personalizado";

  return (
    <div style={{ padding: 14 }}>
      <TopBar title={item ? "Editar Rotina" : "Nova Rotina"} onBack={onCancel} />
      <Field label="Nome" req><Input value={name} onChange={setName} placeholder="Ex: Treino físico" /></Field>
      <Field label="Dificuldade" req><DiffPick value={diff} onChange={setDiff} /></Field>
      <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>+{getXp(diff)} XP / +{getCoins(diff)} moedas</div>
      <Field label="Frequência" req>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FREQUENCIES.map(f => {
            const active = freq === f;
            return (<div key={f} onClick={() => handleFreqChange(f)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: active ? C.goldDim : C.card, color: active ? C.gold : C.tx3, border: "0.5px solid " + (active ? C.goldBrd : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>{f}</div>);
          })}
        </div>
      </Field>
      {needsDays && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.tx2, marginBottom: 6 }}>{freq === "Semanal" ? "Qual dia da semana?" : "Quais dias da semana?"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {WEEK_DAYS.map(d => {
              const active = freqDays.includes(d);
              return (<div key={d} onClick={() => toggleDay(d)} style={{ flex: 1, padding: "8px 2px", borderRadius: 6, fontSize: 11, textAlign: "center", cursor: "pointer", background: active ? C.goldDim : C.card, color: active ? C.gold : C.tx3, border: "1px solid " + (active ? C.gold : C.brd), fontWeight: active ? 600 : 400, transition: "background .12s, color .12s, border-color .12s" }}>{d}</div>);
            })}
          </div>
          {freq === "Semanal" && freqDays.length === 0 && <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>Selecione um dia</div>}
          {freq === "Personalizado" && freqDays.length === 0 && <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>Selecione pelo menos um dia</div>}
        </div>
      )}
      <Field label="Cor"><ColorPick value={color} onChange={setColor} /></Field>

      {/* Avançado — seção colapsável */}
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 10, border: "1px solid " + C.brd, padding: "10px 12px" }}>
        <div onClick={() => setShowAdvanced(v => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.5, textTransform: "uppercase" }}>Avançado</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        {showAdvanced && <div style={{ marginTop: 10 }}>
          <Toggle on={mods.priority} onToggle={() => tMod("priority")} label="Prioridade" />
          {mods.priority && <SelBtns options={PRIORITIES} value={pri} onChange={setPri} />}
          <Toggle on={mods.category} onToggle={() => tMod("category")} label="Categoria" />
          {mods.category && <SelBtns options={CATEGORIES} value={cat} onChange={handleCat} />}
          <Toggle on={mods.description} onToggle={() => tMod("description")} label="Descrição" />
          {mods.description && <Input value={desc} onChange={setDesc} multiline />}
          {!item && <Toggle on={mods.notes} onToggle={() => tMod("notes")} label="Nota inicial" />}
          {!item && mods.notes && <Input value={notes} onChange={setNotes} multiline placeholder="Primeira nota..." style={{ minHeight: 80 }} />}
          {item && <div style={{ fontSize: 11, color: C.tx4, padding: "6px 0" }}>{"Notas: gerencie na tela de detalhe (" + (Array.isArray(item.notes) ? item.notes.length : 0) + " notas)"}</div>}
        </div>}
      </div>
      {/* V2: Vincular a objetivo */}
      <SLabel>Vincular a objetivo</SLabel>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        {linkedObj.map(l => {
          const o = (objectives || []).find(x => x.id === l.id);
          return <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 3, background: C.goldDim, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: C.gold, border: "1px solid " + C.goldBrd }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: o ? o.color : C.gold }} />{o ? o.name : "..."}<span onClick={() => setLinkedObj(prev => prev.filter(x => x.id !== l.id))} style={{ cursor: "pointer", marginLeft: 4, color: C.tx3, display: "inline-flex", alignItems: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          </div>;
        })}
        <div onClick={() => setShowObjSearch(true)} style={{ fontSize: 11, color: C.tx3, cursor: "pointer", padding: "3px 8px", border: "1px dashed " + C.brd2, borderRadius: 5, transition: "color .12s, border-color .12s" }}>+ Objetivo</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn primary onClick={save} style={{ flex: 1 }}>{item ? "Salvar" : "Criar rotina"}</Btn>
      </div>
      {showObjSearch && <ObjectiveSearchModal objectives={objectives || []} onSelect={(o) => { if (!linkedObj.find(l => l.id === o.id)) setLinkedObj(prev => [...prev, { id: o.id, relation: "menor" }]); setShowObjSearch(false); }} onClose={() => setShowObjSearch(false)} />}
    </div>
  );
}

function TaskForm({ item, onSave, onCancel, presets, objectives }) {
  const [name, setName] = useState(item ? item.name : "");
  const [diff, setDiff] = useState(item ? item.difficulty || 5 : 5);
  const [color, setColor] = useState(item ? item.color : COLORS[3]);
  const [pri, setPri] = useState(item ? item.priority || "" : "");
  const [cat, setCat] = useState(item ? item.category || "" : "");
  const [dl, setDl] = useState(item ? item.deadline || "" : "");
  const [desc, setDesc] = useState(item ? item.description || "" : "");
  const [notes, setNotes] = useState("");
  const [mods, setMods] = useState(item ? (item.modulars || { description: false, category: false, priority: false, deadline: true, notes: false }) : { description: false, category: false, priority: false, deadline: true, notes: false });
  const [linkedObj, setLinkedObj] = useState(item ? (item.linkedObjectives || []) : []);
  const [showObjSearch, setShowObjSearch] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tMod = (k) => setMods(m => ({ ...m, [k]: !m[k] }));
  const handleCat = (c) => { setCat(c); if (!item && c && presets && presets[c]) setDiff(presets[c]); };

  const save = () => {
    if (!name.trim()) return;
    let finalNotes = item ? (item.notes || []) : [];
    if (notes.trim()) { const ex = Array.isArray(finalNotes) ? finalNotes : []; finalNotes = [...ex, { id: uid(), text: notes.trim(), date: td() }]; }
    onSave({ ...(item || {}), name, difficulty: diff, color, priority: pri, category: cat, deadline: dl, description: desc, notes: finalNotes, modulars: mods, linkedObjectives: linkedObj });
  };

  return (
    <div style={{ padding: 14 }}>
      <TopBar title={item ? "Editar Tarefa" : "Nova Tarefa"} onBack={onCancel} />
      <Field label="Nome" req><Input value={name} onChange={setName} placeholder="O que precisa ser feito?" /></Field>
      <Field label="Dificuldade" req><DiffPick value={diff} onChange={setDiff} /></Field>
      <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>+{getXp(diff)} XP / +{getCoins(diff)} moedas</div>
      <Field label="Cor"><ColorPick value={color} onChange={setColor} /></Field>

      {/* Avançado — seção colapsável */}
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 10, border: "1px solid " + C.brd, padding: "10px 12px" }}>
        <div onClick={() => setShowAdvanced(v => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.5, textTransform: "uppercase" }}>Avançado</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        {showAdvanced && <div style={{ marginTop: 10 }}>
          <Toggle on={mods.priority} onToggle={() => tMod("priority")} label="Prioridade" />
          {mods.priority && <SelBtns options={PRIORITIES} value={pri} onChange={setPri} />}
          <Toggle on={mods.category} onToggle={() => tMod("category")} label="Categoria" />
          {mods.category && <SelBtns options={CATEGORIES} value={cat} onChange={handleCat} />}
          <Toggle on={mods.deadline} onToggle={() => tMod("deadline")} label="Prazo" />
          {mods.deadline && <Input type="date" value={dl} onChange={setDl} min={td()} />}
          <Toggle on={mods.description} onToggle={() => tMod("description")} label="Descrição" />
          {mods.description && <Input value={desc} onChange={setDesc} multiline placeholder="Detalhes..." />}
          {!item && <Toggle on={mods.notes} onToggle={() => tMod("notes")} label="Nota inicial" />}
          {!item && mods.notes && <Input value={notes} onChange={setNotes} multiline placeholder="Primeira nota..." style={{ minHeight: 80 }} />}
          {item && <div style={{ fontSize: 11, color: C.tx4, padding: "6px 0" }}>{"Notas: gerencie na tela de detalhe (" + (Array.isArray(item.notes) ? item.notes.length : 0) + " notas)"}</div>}
        </div>}
      </div>
      <SLabel>Vincular a objetivo</SLabel>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        {linkedObj.map(l => {
          const o = (objectives || []).find(x => x.id === l.id);
          return <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 3, background: C.goldDim, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: C.gold, border: "1px solid " + C.goldBrd }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: o ? o.color : C.gold }} />{o ? o.name : "..."}<span onClick={() => setLinkedObj(prev => prev.filter(x => x.id !== l.id))} style={{ cursor: "pointer", marginLeft: 4, color: C.tx3, display: "inline-flex", alignItems: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          </div>;
        })}
        <div onClick={() => setShowObjSearch(true)} style={{ fontSize: 11, color: C.tx3, cursor: "pointer", padding: "3px 8px", border: "1px dashed " + C.brd2, borderRadius: 5, transition: "color .12s, border-color .12s" }}>+ Objetivo</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn primary onClick={save} style={{ flex: 1 }}>{item ? "Salvar" : "Criar tarefa"}</Btn>
      </div>
      {showObjSearch && <ObjectiveSearchModal objectives={objectives || []} onSelect={(o) => { if (!linkedObj.find(l => l.id === o.id)) setLinkedObj(prev => [...prev, { id: o.id, relation: "menor" }]); setShowObjSearch(false); }} onClose={() => setShowObjSearch(false)} />}
    </div>
  );
}

/* ═══ V2: OBJECTIVE FORM ═══ */
function ObjectiveForm({ item, onSave, onCancel, objectives }) {
  const [name, setName] = useState(item ? item.name : "");
  const [purpose, setPurpose] = useState(item ? item.purpose || "" : "");
  const [color, setColor] = useState(item ? item.color : "#534AB7");
  const [linkedObjs, setLinkedObjs] = useState(item ? (item.linkedObjectives || []) : []);
  const [showObjSearch, setShowObjSearch] = useState(false);
  const [showDirModal, setShowDirModal] = useState(null);

  const save = () => {
    if (!name.trim()) return;
    onSave({ ...(item || {}), name, purpose, color, linkedObjectives: linkedObjs });
  };

  const handleLinkObj = (target) => {
    setShowObjSearch(false);
    setShowDirModal(target);
  };

  const confirmDir = (dir) => {
    if (!showDirModal) return;
    const tgt = showDirModal;
    if (item && wouldCreateCycle(item.id, tgt.id, objectives || [])) {
      alert("Vínculo circular — " + tgt.name + " já está conectado a este objetivo.");
      setShowDirModal(null);
      return;
    }
    if (!linkedObjs.find(l => l.id === tgt.id)) {
      setLinkedObjs(prev => [...prev, { id: tgt.id, relation: dir }]);
    }
    setShowDirModal(null);
  };

  return (
    <div style={{ padding: 14 }}>
      <TopBar title={item ? "Editar Objetivo" : "Novo Objetivo"} onBack={onCancel} />
      <Field label="Nome" req><Input value={name} onChange={setName} placeholder="Ex: Independência financeira" /></Field>
      <Field label="Por que isso importa para você?"><Input value={purpose} onChange={setPurpose} multiline placeholder="Motivação, visão..." /></Field>
      <Field label="Cor"><ColorPick value={color} onChange={setColor} /></Field>
      <SLabel>Vincular a outro objetivo</SLabel>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        {linkedObjs.map(l => {
          const o = (objectives || []).find(x => x.id === l.id);
          return <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 3, background: C.goldDim, borderRadius: 5, padding: "3px 8px", fontSize: 11, color: C.gold, border: "1px solid " + C.goldBrd }}>
            {l.relation === "maior"
              ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            }{o ? o.name : "..."}<span onClick={() => setLinkedObjs(prev => prev.filter(x => x.id !== l.id))} style={{ cursor: "pointer", marginLeft: 4, color: C.tx3, display: "inline-flex", alignItems: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          </div>;
        })}
        <div onClick={() => setShowObjSearch(true)} style={{ fontSize: 11, color: C.tx3, cursor: "pointer", padding: "3px 8px", border: "1px dashed " + C.brd2, borderRadius: 5, transition: "color .12s, border-color .12s" }}>+ Objetivo</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn primary onClick={save} style={{ flex: 1 }}>{item ? "Salvar" : "Criar objetivo"}</Btn>
      </div>
      {showObjSearch && <ObjectiveSearchModal objectives={(objectives || []).filter(o => item ? o.id !== item.id : true)} onSelect={handleLinkObj} onClose={() => setShowObjSearch(false)} />}
      {showDirModal && <Modal>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, marginBottom: 8 }}>{showDirModal.name}</div>
          <div style={{ fontSize: 11, color: C.tx2, marginBottom: 12 }}>Este objetivo é maior ou menor que o atual?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => confirmDir("maior")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>Maior
            </Btn>
            <Btn onClick={() => confirmDir("menor")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>Menor
            </Btn>
          </div>
          <div style={{ fontSize: 11, color: C.tx3, marginTop: 8 }}>Maior = este objetivo está dentro dele. Menor = ele está dentro deste.</div>
        </div>
        <Btn onClick={() => setShowDirModal(null)} style={{ width: "100%", marginTop: 4 }}>Cancelar</Btn>
      </Modal>}
    </div>
  );
}

/* ═══ V2: SEARCH MODALS ═══ */
function ObjectiveSearchModal({ objectives, onSelect, onClose, onCreateNew }) {
  const [q, setQ] = useState("");
  const filtered = objectives.filter(o => o.status === "Ativo" && o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, marginBottom: 8 }}>Buscar objetivo</div>
      <Input value={q} onChange={setQ} placeholder="Digitar nome..." />
      <div style={{ maxHeight: 250, overflow: "auto", marginTop: 8 }}>
        {filtered.map(o => (
          <div key={o.id} onClick={() => onSelect(o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 6px", cursor: "pointer", borderBottom: "0.5px solid " + C.brd }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: o.color }} />
            <div><div style={{ fontSize: 11, color: C.tx }}>{o.name}</div>{o.purpose && <div style={{ fontSize: 11, color: C.tx3, fontStyle: "italic" }}>{o.purpose}</div>}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ fontSize: 11, color: C.tx4, padding: 16, textAlign: "center" }}>Nenhum objetivo encontrado</div>}
      </div>
      {onCreateNew && <div onClick={onCreateNew} style={{ padding: "10px 6px", cursor: "pointer", borderTop: "0.5px solid " + C.brd, marginTop: 4, fontSize: 11, color: C.purple, textAlign: "center", fontWeight: 500, transition: "opacity .12s" }}>+ Criar novo objetivo agora</div>}
      <Btn onClick={onClose} style={{ width: "100%", marginTop: 8 }}>Fechar</Btn>
    </Modal>
  );
}

function ActivitySearchModal({ projects, routines, tasks, objectives, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const items = [
    ...projects.filter(p => p.status === "Ativo").map(p => ({ ...p, _type: "project", _label: "Projeto" })),
    ...routines.filter(r => r.status === "Ativa").map(r => ({ ...r, _type: "routine", _label: "Rotina" })),
    ...tasks.filter(t => t.status === "Pendente").map(t => ({ ...t, _type: "task", _label: "Tarefa" })),
    ...(objectives || []).filter(o => o.status === "Ativo").map(o => ({ ...o, _type: "objective", _label: "Objetivo" })),
  ];
  const filtered = items.filter(i => {
    if (typeFilter !== "all" && i._type !== typeFilter) return false;
    return i.name.toLowerCase().includes(q.toLowerCase());
  });
  const typeColors = { project: C.gold, routine: C.purple, task: C.orange, objective: "#534AB7" };

  return (
    <Modal>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, marginBottom: 8 }}>Vincular atividade</div>
      <Input value={q} onChange={setQ} placeholder="Buscar..." />
      <div style={{ display: "flex", gap: 4, marginTop: 6, marginBottom: 8 }}>
        {[["all", "Todos"], ["project", "Projeto"], ["routine", "Rotina"], ["task", "Tarefa"], ["objective", "Objetivo"]].map(([k, l]) => (
          <div key={k} onClick={() => setTypeFilter(k)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer", background: typeFilter === k ? C.goldDim : C.card, color: typeFilter === k ? C.gold : C.tx3, border: "0.5px solid " + (typeFilter === k ? C.goldBrd : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>{l}</div>
        ))}
      </div>
      <div style={{ maxHeight: 250, overflow: "auto" }}>
        {filtered.map(i => (
          <div key={i.id + i._type} onClick={() => onSelect(i)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 6px", cursor: "pointer", borderBottom: "0.5px solid " + C.brd }}>
            <Badge color={typeColors[i._type]}>{i._label}</Badge>
            <div><div style={{ fontSize: 11, color: C.tx }}>{i.name}</div></div>
          </div>
        ))}
      </div>
      <Btn onClick={onClose} style={{ width: "100%", marginTop: 8 }}>Fechar</Btn>
    </Modal>
  );
}


export {
  ProjectForm, RoutineForm, TaskForm, ObjectiveForm,
  ObjectiveSearchModal, ActivitySearchModal,
};
