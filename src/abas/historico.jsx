import { useState, useMemo } from "react";
import { C } from '../temas.js';
import { td, fmtD, getMultiplier, getMastery, getEnergia, ACHIEVEMENTS } from '../utilidades.js';
import { STREAK_RECOVER, STREAK_MULT, CHEST_TYPES } from '../constantes.js';
import { Btn } from '../componentes-base.jsx';

function FlameMiniIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c1.2 2.2 3.8 3.9 3.8 7a3.8 3.8 0 0 1-7.6 0c0-1.8.7-3.2 1.8-4.7C6.8 6.9 5 9.5 5 13a7 7 0 0 0 14 0c0-4.4-2.6-7.4-7-10z" />
    </svg>
  );
}

function TrophyMiniIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
      <path d="M6 5H4a2 2 0 0 0 2 5h1" />
      <path d="M18 5h2a2 2 0 0 1-2 5h-1" />
      <path d="M12 11v4" />
      <path d="M9 21h6" />
      <path d="M10 15h4v3h-4z" />
    </svg>
  );
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildActivityLog(projects, routines, tasks) {
  const entries = [];

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
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "custom", label: "Personalizado" },
];

const Chevron = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={C.tx4}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function HistoryTab({ profile, projects, routines, tasks, recoverStreak, openChestAction, claimAchievement }) {
  const [filter, setFilter] = useState("7d");
  const [customFrom, setCustomFrom] = useState(() => addDays(td(), -29));
  const [customTo, setCustomTo] = useState(() => td());
  const [streakOpen, setStreakOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);

  const today = td();
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  const { fromDate, toDate } = useMemo(() => {
    if (filter === "today") return { fromDate: today, toDate: today };
    if (filter === "yesterday") return { fromDate: yesterday, toDate: yesterday };
    if (filter === "7d") return { fromDate: addDays(today, -6), toDate: today };
    if (filter === "30d") return { fromDate: addDays(today, -29), toDate: today };
    return { fromDate: customFrom || addDays(today, -29), toDate: customTo || today };
  }, [filter, customFrom, customTo, today, yesterday]);

  const allEntries = useMemo(() => buildActivityLog(projects, routines, tasks), [projects, routines, tasks]);

  const grouped = useMemo(() => {
    const filtered = allEntries.filter(e => e.date >= fromDate && e.date <= toDate);
    const map = {};
    filtered.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allEntries, fromDate, toDate]);

  const unlocked = profile.achievementsUnlocked || [];
  const goldCount = useMemo(
    () =>
      [...(projects || []), ...(routines || [])].filter(a => {
        const m = getMastery(a.xpAccum || 0);
        return m && ["Ouro", "Platina", "Diamante", "Mestre"].includes(m.name);
      }).length,
    [projects, routines]
  );
  const achProfile = useMemo(() => ({ ...profile, masteryGoldCount: goldCount }), [profile, goldCount]);
  const claimable = useMemo(() => ACHIEVEMENTS.filter(a => !unlocked.includes(a.id) && a.check(achProfile)), [unlocked, achProfile]);

  const mult = getMultiplier(profile.streak);
  const milestones = STREAK_MULT.map(s => s.days).sort((a, b) => a - b);
  const nextMs = milestones.find(m => m > profile.streak);
  const prevMs = milestones.filter(m => m <= profile.streak).pop() || 0;
  const streakPct = nextMs ? Math.round(((profile.streak - prevMs) / (nextMs - prevMs)) * 100) : 100;

  const getTypeStyle = (type) => {
    if (type === "routine") return { label: "Rotina", color: C.green };
    if (type === "project_task") return { label: "Projeto", color: C.orange };
    return { label: "Tarefa", color: C.tx2 };
  };

  const fmtLabel = (d) => {
    if (d === today) return "Hoje";
    if (d === yesterday) return "Ontem";
    return fmtD(d);
  };

  const chipSt = (active) => ({
    padding: "5px 12px",
    borderRadius: 20,
    border: "1px solid " + (active ? C.orange : C.brd),
    background: active ? C.orange + "22" : "transparent",
    color: active ? C.orange : C.tx3,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    transition: "all .15s",
    outline: "none",
  });

  const colHdrSt = (open, accent) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: C.card,
    border: "none",
    borderRadius: open ? "8px 8px 0 0" : 8,
    borderLeft: "2px solid " + accent,
    cursor: "pointer",
    outline: "none",
  });

  const colBodySt = {
    padding: "10px 12px",
    background: C.card,
    borderRadius: "0 0 8px 8px",
    borderTop: "0.5px solid " + C.brd,
  };

  return (
    <div style={{ padding: 14, paddingBottom: 80 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 12 }}>Histórico</div>

      {profile.pendingChest && (() => {
        const ct = CHEST_TYPES.find(c => c.id === profile.pendingChest);
        return (
          <div
            onClick={openChestAction}
            style={{
              background: "linear-gradient(135deg,#2a2210,#1a1a1f)",
              border: "1px solid " + C.gold + "60",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>Baú {ct ? ct.name : ""} disponível!</div>
              <div style={{ fontSize: 11, color: C.tx3 }}>{ct ? ct.min + "–" + ct.max + " moedas" : ""} · Toque para abrir</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={chipSt(filter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {filter === "custom" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            max={customTo}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.brd, background: C.card, color: C.tx, fontSize: 12, outline: "none" }}
          />
          <span style={{ color: C.tx4, fontSize: 12 }}>até</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            min={customFrom}
            max={today}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid " + C.brd, background: C.card, color: C.tx, fontSize: 12, outline: "none" }}
          />
        </div>
      )}

      {grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.tx4, fontSize: 13 }}>
          Nenhuma atividade neste período
        </div>
      ) : (
        grouped.map(([date, entries]) => {
          const totalXp = entries.reduce((s, e) => s + getEnergia(e.difficulty), 0);
          return (
            <div key={date} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.tx2, flexShrink: 0 }}>
                  {fmtLabel(date)}
                </span>
                <div style={{ flex: 1, height: "0.5px", background: C.brd }} />
                <span style={{ fontSize: 11, color: C.tx4, flexShrink: 0 }}>
                  {entries.length} {entries.length === 1 ? "atividade" : "atividades"} · +{totalXp} energia
                </span>
              </div>
              {entries.map((e, i) => {
                const { label, color } = getTypeStyle(e.type);
                return (
                  <div
                    key={date + e.type + e.name + i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      background: C.card,
                      borderRadius: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: C.tx, fontWeight: 500 }}>
                        {e.name}
                        {e.projectName ? " · " + e.projectName : ""}
                      </div>
                      <div style={{ fontSize: 10, color: color }}>{label}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.gold, flexShrink: 0 }}>+{getEnergia(e.difficulty)} energia</div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      <div style={{ marginTop: 16, marginBottom: 10 }}>
        <button onClick={() => setStreakOpen(v => !v)} style={colHdrSt(streakOpen, C.orange)}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FlameMiniIcon />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.tx }}>Streak: {profile.streak} dias</span>
            {mult > 0 && <span style={{ fontSize: 11, color: C.orange }}>+{Math.round(mult * 100)}%</span>}
          </div>
          <Chevron open={streakOpen} />
        </button>
        {streakOpen && (
          <div style={colBodySt}>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 6 }}>Melhor streak: {profile.bestStreak || 0} dias</div>
            {nextMs ? (
              <>
                <div style={{ height: 6, background: C.brd, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ width: streakPct + "%", height: "100%", background: C.orange, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, color: C.tx3, marginBottom: 8 }}>
                  Próximo marco: {nextMs} dias (+{Math.round(STREAK_MULT.find(s => s.days === nextMs).bonus * 100)}%)
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>Nível máximo de streak.</div>
            )}
            {profile.streakLostDays > 0 && (
              <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>
                Última penalidade: -{profile.streakLostDays} dias
              </div>
            )}
            {STREAK_RECOVER.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: C.tx4, marginBottom: 4 }}>Restaurações disponíveis:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STREAK_RECOVER.map(item => (
                    <Btn
                      key={item.days}
                      small
                      onClick={() => recoverStreak(item)}
                      style={{ opacity: (profile.coins || 0) >= item.cost ? 1 : 0.45 }}
                    >
                      +{item.days} dias ({item.cost} moedas)
                    </Btn>
                  ))}
                </div>
              </div>
            )}
            {(profile.streakRecovers || []).length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: C.tx4, marginBottom: 4 }}>Restaurações anteriores:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {(profile.streakRecovers || []).slice().reverse().map((r, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: C.tx3 }}>
                      <span>em {r.date ? fmtD(r.date) : "—"} · {r.cost} moedas</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <button onClick={() => setAchOpen(v => !v)} style={colHdrSt(achOpen, C.gold)}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrophyMiniIcon />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.tx }}>
              Conquistas ({unlocked.length}/{ACHIEVEMENTS.length})
            </span>
          </div>
          <Chevron open={achOpen} />
        </button>
        {achOpen && (
          <div style={colBodySt}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ACHIEVEMENTS.map(ach => {
                const done = unlocked.includes(ach.id);
                const canClaim = claimable.some(a => a.id === ach.id);
                return (
                  <div
                    key={ach.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: done ? C.goldDim : C.bg,
                      border: "1px solid " + (done ? C.goldBrd : C.brd),
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: done ? C.gold : C.tx4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: done ? C.gold : C.tx2, fontWeight: 600 }}>
                        {ach.text}{done ? " ✓" : ""}
                      </div>
                      <div style={{ fontSize: 10, color: C.tx4 }}>{ach.cat} · +{ach.coins} moedas</div>
                    </div>
                    {canClaim && (
                      <Btn small primary onClick={() => claimAchievement(ach)}>
                        Resgatar
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
