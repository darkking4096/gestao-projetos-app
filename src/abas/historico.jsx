import { useState, useMemo } from "react";
import { C } from '../temas.js';
import { td, fmtD, getMultiplier, getMastery, getXp, getEnergia, ACHIEVEMENTS } from '../utilidades.js';
import { STREAK_RECOVER, STREAK_MULT, CHEST_TYPES } from '../constantes.js';
import { Btn } from '../componentes-base.jsx';

/* ── Helpers ── */
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildActivityLog(projects, routines, tasks) {
  const entries = [];
  // Standalone tasks
  (tasks || []).forEach(t => {
    if (t.status === "Concluída" && t.completedAt) {
      entries.push({
        date: t.completedAt.slice(0, 10),
        type: "task",
        name: t.name || "Tarefa",
        difficulty: t.difficulty || 1,
      });
    }
  });
  // Routines — one entry per completion log
  (routines || []).forEach(r => {
    (r.completionLog || []).forEach(log => {
      if (log.date) {
        entries.push({
          date: log.date,
          type: "routine",
          name: r.name || "Rotina",
          difficulty: r.difficulty || 1,
        });
      }
    });
  });
  // Project phase tasks
  (projects || []).forEach(p => {
    (p.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(t => {
        if (t.status === "Concluída" && t.completedAt) {
          entries.push({
            date: t.completedAt.slice(0, 10),
            type: "project_task",
            name: t.name || "Tarefa",
            difficulty: t.difficulty || 1,
            projectName: p.name || "Projeto",
          });
        }
      });
    });
  });
  return entries;
}

const FILTERS = [
  { id: "today",     label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7d",        label: "7 dias" },
  { id: "30d",       label: "30 dias" },
  { id: "custom",    label: "Personalizado" },
];

/* ── Chevron SVG ── */
const Chevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx4}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ══════════════════════════════════════════════════════ */
function HistoryTab({ profile, projects, routines, tasks, recoverStreak, openChestAction, claimAchievement }) {
  const [filter, setFilter]       = useState("7d");
  const [customFrom, setCustomFrom] = useState(() => addDays(td(), -29));
  const [customTo,   setCustomTo]   = useState(() => td());
  const [streakOpen, setStreakOpen] = useState(false);
  const [achOpen,    setAchOpen]    = useState(false);

  const today     = td();
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  /* Date range */
  const { fromDate, toDate } = useMemo(() => {
    if (filter === "today")     return { fromDate: today,              toDate: today };
    if (filter === "yesterday") return { fromDate: yesterday,          toDate: yesterday };
    if (filter === "7d")        return { fromDate: addDays(today, -6), toDate: today };
    if (filter === "30d")       return { fromDate: addDays(today,-29), toDate: today };
    return { fromDate: customFrom || addDays(today,-29), toDate: customTo || today };
  }, [filter, customFrom, customTo, today, yesterday]);

  /* Activity log */
  const allEntries = useMemo(() => buildActivityLog(projects, routines, tasks), [projects, routines, tasks]);

  const grouped = useMemo(() => {
    const filtered = allEntries.filter(e => e.date >= fromDate && e.date <= toDate);
    const map = {};
    filtered.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allEntries, fromDate, toDate]);

  /* Achievements */
  const unlocked  = profile.achievementsUnlocked || [];
  const goldCount = useMemo(() =>
    [...(projects || []), ...(routines || [])].filter(a => {
      const m = getMastery(a.xpAccum || 0);
      return m && ["Ouro", "Platina", "Diamante", "Mestre"].includes(m.name);
    }).length,
  [projects, routines]);
  const achProfile = useMemo(() => ({ ...profile, masteryGoldCount: goldCount }), [profile, goldCount]);
  const claimable  = useMemo(() => ACHIEVEMENTS.filter(a => !unlocked.includes(a.id) && a.check(achProfile)), [unlocked, achProfile]);

  /* Streak helpers */
  const mult       = getMultiplier(profile.streak);
  const milestones = STREAK_MULT.map(s => s.days).sort((a, b) => a - b);
  const nextMs     = milestones.find(m => m > profile.streak);
  const prevMs     = milestones.filter(m => m <= profile.streak).pop() || 0;
  const streakPct  = nextMs ? Math.round((profile.streak - prevMs) / (nextMs - prevMs) * 100) : 100;

  /* Type colours */
  const getTypeStyle = (type) => {
    if (type === "routine")      return { label: "Rotina",  color: C.green };
    if (type === "project_task") return { label: "Projeto", color: C.orange };
    return { label: "Tarefa", color: C.tx2 };
  };

  /* Format date label */
  const fmtLabel = (d) => {
    if (d === today)     return "Hoje";
    if (d === yesterday) return "Ontem";
    return fmtD(d);
  };

  /* Shared styles */
  const chipSt = (active) => ({
    padding: "5px 12px", borderRadius: 20,
    border: "1px solid " + (active ? C.orange : C.brd),
    background: active ? C.orange + "22" : "transparent",
    color: active ? C.orange : C.tx3,
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: "pointer", transition: "all .15s", outline: "none",
  });

  const colHdrSt = (open, accent) => ({
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 12px", background: C.card, border: "none",
    borderRadius: open ? "8px 8px 0 0" : 8, borderLeft: "2px solid " + accent,
    cursor: "pointer", outline: "none",
  });

  const colBodySt = {
    padding: "10px 12px", background: C.card,
    borderRadius: "0 0 8px 8px", borderTop: "0.5px solid " + C.brd,
  };

  /* ── Render ── */
  return (
    <div style={{ padding: 14, paddingBottom: 80 }}>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 12 }}>Histórico</div>

      {/* ── Chest banner ── */}
      {profile.pendingChest && (() => {
        const ct = CHEST_TYPES.find(c => c.id === profile.pendingChest);
        return (
          <div onClick={openChestAction} style={{
            background: "linear-gradient(135deg,#2a2210,#1a1a1f)",
            border: "1px solid " + C.gold + "60", borderRadius: 10,
            padding: "10px 14px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 12 20 22 4 22 4 12"/>
              <rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>Baú {ct ? ct.name : ""} disponível!</div>
              <div style={{ fontSize: 11, color: C.tx3 }}>{ct ? ct.min + "–" + ct.max + " moedas" : ""} · Toque para abrir</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        );
      })()}

      {/* ── Date filter chips ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={chipSt(filter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {filter === "custom" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            max={customTo}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.brd, background: C.card, color: C.tx, fontSize: 12, outline: "none" }} />
          <span style={{ color: C.tx4, fontSize: 12 }}>até</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            min={customFrom} max={today}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.brd, background: C.card, color: C.tx, fontSize: 12, outline: "none" }} />
        </div>
      )}

      {/* ── Activity log ── */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.tx4, fontSize: 13 }}>
          Nenhuma atividade neste período
        </div>
      ) : grouped.map(([date, entries]) => {
        const totalXp = entries.reduce((s, e) => s + getEnergia(e.difficulty), 0);
        return (
          <div key={date} style={{ marginBottom: 14 }}>
            {/* Day header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.tx2, flexShrink: 0 }}>
                {fmtLabel(date)}
              </span>
              <div style={{ flex: 1, height: "0.5px", background: C.brd }} />
              <span style={{ fontSize: 11, color: C.tx4, flexShrink: 0 }}>
                {entries.length} {entries.length === 1 ? "atividade" : "atividades"} · +{totalXp} ⚡
              </span>
            </div>
            {/* Activity rows */}
            {entries.map((e, i) => {
              const { label, color } = getTypeStyle(e.type);
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", background: C.card, borderRadius: 7,
                  marginBottom: 3, borderLeft: "2px solid " + color,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: C.tx, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.name}
                    </div>
                    <div style={{ fontSize: 10, color: C.tx4 }}>
                      {label}{e.projectName ? " · " + e.projectName : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.gold, flexShrink: 0 }}>+{getEnergia(e.difficulty)} ⚡</div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Streak (collapsible) ── */}
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setStreakOpen(v => !v)} style={colHdrSt(streakOpen, C.orange)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.orange, fontWeight: 700 }}>ST</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.tx }}>Streak: {profile.streak} dias</span>
            {mult > 0 && <span style={{ fontSize: 11, color: C.orange }}>+{Math.round(mult * 100)}% CULTIVO</span>}
          </div>
          <Chevron open={streakOpen} />
        </button>
        {streakOpen && (
          <div style={colBodySt}>
            {/* Milestone badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, marginBottom: 8 }}>
              {STREAK_MULT.slice().reverse().map(s => (
                <span key={s.days} style={{ color: profile.streak >= s.days ? C.gold : C.tx4, fontWeight: profile.streak >= s.days ? 600 : 400 }}>
                  {s.days}d +{Math.round(s.bonus * 100)}%
                </span>
              ))}
            </div>
            {/* Progress to next milestone */}
            {nextMs ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx4, marginBottom: 3 }}>
                  <span>{profile.streak} dias</span>
                  <span style={{ color: C.orange }}>
                    próximo: {nextMs} dias (+{Math.round(STREAK_MULT.find(s => s.days === nextMs).bonus * 100)}%)
                  </span>
                </div>
                <div style={{ height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: streakPct + "%", background: C.orange, borderRadius: 2 }} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>Nível máximo de streak.</div>
            )}
            <div style={{ fontSize: 11, color: C.tx4, marginBottom: profile.streak < (profile.bestStreak || 0) ? 8 : 0 }}>
              Melhor: {profile.bestStreak || 0} dias
            </div>
            {/* Recovery options */}
            {profile.streak < (profile.bestStreak || 0) && (
              <div>
                <div style={{ fontSize: 11, color: C.tx3, marginBottom: 4 }}>Restaurar streak perdido:</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {STREAK_RECOVER.map(opt => (
                    <Btn key={opt.days} small onClick={() => recoverStreak(opt)} style={{ opacity: profile.coins >= opt.cost ? 1 : 0.4 }}>
                      +{opt.days} dias ({opt.cost} moedas)
                    </Btn>
                  ))}
                </div>
              </div>
            )}
            {/* Past recoveries */}
            {(profile.streakRecoveries || []).length > 0 && (
              <div style={{ marginTop: 8, borderTop: "0.5px solid " + C.brd, paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: C.tx4, marginBottom: 4 }}>Restaurações anteriores:</div>
                {[...(profile.streakRecoveries || [])].reverse().slice(0, 3).map((r, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.tx4, display: "flex", gap: 6, marginBottom: 2 }}>
                    <span style={{ color: C.tx3 }}>+{r.days} dias</span>
                    <span>em {r.date ? fmtD(r.date) : "—"} · {r.cost} moedas</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Achievements (collapsible) ── */}
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setAchOpen(v => !v)} style={colHdrSt(achOpen, C.gold)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>RK</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.tx }}>Conquistas ({unlocked.length}/{ACHIEVEMENTS.length})</span>
            {claimable.length > 0 && (
              <span style={{ padding: "1px 7px", borderRadius: 10, background: C.gold, color: "#000", fontSize: 10, fontWeight: 700 }}>
                {claimable.length} para resgatar
              </span>
            )}
          </div>
          <Chevron open={achOpen} />
        </button>
        {achOpen && (
          <div style={{ ...colBodySt, padding: "8px 10px" }}>
            {ACHIEVEMENTS.map(ach => {
              const done     = unlocked.includes(ach.id);
              const eligible = claimable.some(c => c.id === ach.id);
              return (
                <div key={ach.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 8px", borderRadius: 6, marginBottom: 2,
                  opacity: done ? 0.45 : 1,
                  background: eligible ? C.gold + "0a" : "transparent",
                  borderLeft: eligible ? "2px solid " + C.gold
                            : done     ? "2px solid " + C.green + "80"
                            :            "2px solid " + C.brd,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: done ? C.tx4 : C.tx }}>
                      {ach.text}{done && " ✓"}
                    </div>
                    <div style={{ fontSize: 10, color: C.tx4 }}>{ach.cat} · +{ach.coins} moedas</div>
                  </div>
                  {eligible && <Btn small primary onClick={() => claimAchievement(ach)}>Resgatar</Btn>}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default HistoryTab;
