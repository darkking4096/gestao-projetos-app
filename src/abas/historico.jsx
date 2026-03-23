import { useState, useMemo } from "react";
import { C } from '../temas.js';
import { td, fmtD, getMultiplier, getMastery, getLevelInfo, openChest, getCoins } from '../utilidades.js';
import { STREAK_RECOVER, CHEST_TYPES, STREAK_MULT } from '../constantes.js';
import { ACHIEVEMENTS } from '../utilidades.js';
import { Btn, Card, Badge, PBar, TopBar, Modal, ConfirmModal } from '../componentes-base.jsx';
import { IconSVG, ConsumableSVG } from '../icones.jsx';

function HistoryTab({ profile, projects, routines, recoverStreak, openChestAction, claimAchievement }) {
  const info = useMemo(() => getLevelInfo(profile.totalXp), [profile.totalXp]);
  const log = profile.dailyLog || [];
  const last7 = useMemo(() => log.slice(-7), [log]);
  const maxXp = useMemo(() => Math.max(1, ...last7.map(d => d.xp || 0)), [last7]);
  const mult = getMultiplier(profile.streak);
  const unlocked = profile.achievementsUnlocked || [];

  const goldCount = useMemo(() => [...projects, ...routines].filter(a => {
    const m = getMastery(a.xpAccum || 0);
    return m && ["Ouro", "Platina", "Diamante", "Mestre"].includes(m.name);
  }).length, [projects, routines]);
  const achProfile = useMemo(() => ({ ...profile, masteryGoldCount: goldCount }), [profile, goldCount]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: C.tx, marginBottom: 10 }}>{"Histórico"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 12 }}>
        <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 600, color: C.tx }}>{profile.totalXp.toLocaleString()}</div><div style={{ fontSize: 11, color: C.tx3 }}>XP total</div></div>
        <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 600, color: C.tx }}>{profile.coins}</div><div style={{ fontSize: 11, color: C.tx3 }}>Moedas</div></div>
        <div style={{ background: C.card, borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 600, color: C.orange }}>{profile.streak}</div><div style={{ fontSize: 11, color: C.tx3 }}>Streak</div></div>
      </div>
      <Card style={{ marginBottom: 10, borderLeft: "3px solid " + C.orange }}>
        <div style={{ fontSize: 11, color: C.tx2, marginBottom: 4 }}>Streak {profile.streak} dias {mult > 0 ? "(" + Math.round(mult * 100) + "% bônus)" : ""}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: C.tx4 }}>
          {STREAK_MULT.slice().reverse().map(s => (
            <span key={s.days} style={{ color: profile.streak >= s.days ? C.gold : C.tx4, fontWeight: profile.streak >= s.days ? 600 : 400 }}>{s.days} dias +{Math.round(s.bonus*100)}%</span>
          ))}
        </div>
        {(() => {
          const milestones = STREAK_MULT.map(s => s.days).sort((a,b) => a-b);
          const next = milestones.find(m => m > profile.streak);
          const prev = milestones.filter(m => m <= profile.streak).pop() || 0;
          if (!next) return null;
          const pct = Math.round((profile.streak - prev) / (next - prev) * 100);
          return (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx4, marginBottom: 3 }}>
                <span>{profile.streak}</span>
                <span style={{ color: C.orange }}>→ {next} dias (+{Math.round(STREAK_MULT.find(s => s.days === next).bonus*100)}%)</span>
              </div>
              <div style={{ height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: C.orange, borderRadius: 2, transition: "width .4s" }} />
              </div>
            </div>
          );
        })()}
        {profile.streakLostDays > 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Perdeu {profile.streakLostDays} dias ontem (inatividade)</div>}
        {profile.streak < (profile.bestStreak || 0) && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 2 }}>Restaurar dias de streak perdidos:</div>
            <div style={{ fontSize: 11, color: C.tx4, marginBottom: 6 }}>Recupera dias de inatividade passados. Não altera o histórico real.</div>
            <div style={{ display: "flex", gap: 4 }}>
              {STREAK_RECOVER.map(opt => (
                <Btn key={opt.days} small onClick={() => recoverStreak(opt)} style={{ opacity: profile.coins >= opt.cost ? 1 : 0.4 }}>+{opt.days} dias ({opt.cost} moedas)</Btn>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, color: C.tx4, marginTop: 4 }}>Melhor: {profile.bestStreak} dias</div>
        {(profile.streakRecoveries || []).length > 0 && (
          <div style={{ marginTop: 8, borderTop: "0.5px solid " + C.brd, paddingTop: 6 }}>
            <div style={{ fontSize: 11, color: C.tx4, marginBottom: 4 }}>Restaurações anteriores:</div>
            {[...(profile.streakRecoveries || [])].reverse().slice(0, 3).map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: C.tx4, display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.41"/></svg>
                <span style={{ color: C.tx3 }}>+{r.days} dias</span>
                <span style={{ color: C.tx4 }}>em {r.date ? fmtD(r.date) : "—"} · {r.cost} moedas</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      {profile.pendingChest && (() => {
        const ct = CHEST_TYPES.find(c => c.id === profile.pendingChest);
        return (
          <div onClick={openChestAction} style={{ background: "linear-gradient(135deg,#2a2210,#1a1a1f)", border: "1px solid " + C.gold + "60", borderRadius: 10, padding: 14, marginBottom: 10, textAlign: "center", cursor: "pointer", transition: "filter .15s, border-color .15s" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px" }}>
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>Baú {ct ? ct.name : ""} disponível!</div>
            <div style={{ fontSize: 11, color: C.tx3 }}>{ct ? ct.min + "-" + ct.max + " moedas" : ""} · Toque para abrir</div>
          </div>
        );
      })()}
      {last7.length > 0 && <Card style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.tx2, fontWeight: 500 }}>XP últimos 7 dias</div>
          <div style={{ fontSize: 11, color: C.gold }}>{last7.reduce((s, d) => s + (d.xp || 0), 0).toLocaleString()} XP total</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 64 }}>
          {last7.map((d, i) => {
            const isToday = d.date === td();
            const barH = Math.max(4, (d.xp || 0) / maxXp * 50);
            return (
              <div key={i} title={(d.xp || 0) + " XP"} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                {(d.xp || 0) > 0 && <div style={{ fontSize: 11, color: C.tx4, lineHeight: 1 }}>{d.xp}</div>}
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", borderRadius: "2px 2px 0 0", height: barH, background: isToday ? C.gold : C.gold + "80", transition: "height .3s" }} />
                </div>
                <div style={{ fontSize: 11, color: isToday ? C.gold : C.tx4, fontWeight: isToday ? 600 : 400 }}>{d.date ? d.date.slice(8, 10) : ""}</div>
              </div>
            );
          })}
        </div>
      </Card>}
      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: C.tx2, marginBottom: 8, fontWeight: 500 }}>Estatísticas</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
          {[
            ["Nível", info.level + " — " + info.band],
            ["Tarefas concluídas", profile.tasksCompleted],
            ["Projetos concluídos", profile.projectsCompleted || 0],
            ["Melhor XP/dia", profile.bestXpDay || 0],
            ["Melhor XP/semana", profile.bestXpWeek || 0],
            ["Moedas totais", (profile.totalCoinsEarned || 0).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "4px 0", borderBottom: "0.5px solid " + C.brd }}>
              <div style={{ fontSize: 11, color: C.tx4, marginBottom: 1 }}>{label}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.tx }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, marginBottom: 8 }}>Conquistas ({unlocked.length}/{ACHIEVEMENTS.length})</div>
      {ACHIEVEMENTS.map(ach => {
        const done = unlocked.includes(ach.id);
        const eligible = !done && ach.check(achProfile);
        return (
          <div key={ach.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.card, borderRadius: 7, marginBottom: 4, opacity: done ? 0.5 : 1, borderLeft: eligible ? "3px solid " + C.gold : done ? "3px solid " + C.green : "3px solid " + C.brd }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: done ? C.tx4 : C.tx }}>{ach.text}{done && " ✓"}</div>
              <div style={{ fontSize: 11, color: C.tx4 }}>{ach.cat} · +{ach.coins} moedas</div>
            </div>
            {eligible && <Btn small primary onClick={() => claimAchievement(ach)}>Resgatar</Btn>}
          </div>
        );
      })}
    </div>
  );
}



export default HistoryTab;
