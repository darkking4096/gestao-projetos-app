import { useState } from "react";
import { C } from '../temas.js';
import { uid, td, getLevelInfo, clamp } from '../utilidades.js';
import { THEMES } from '../temas.js';
import { DEFAULT_PRESETS, CATEGORIES, COLORS } from '../constantes.js';
import { Btn, Card, Badge, TopBar, Modal, ConfirmModal, DeleteModal, XpBar, SLabel, getDiffColor } from '../componentes-base.jsx';
import { IconSVG, SHOP_THEMES_LIST, BorderSVG, TitleBanner, SHOP_BORDERS, SHOP_TITLES, getTitleTargetColor, getTitleStyle, getUpgradeCost, getBorderStyle, UPGRADE_LABELS, RARITY_LABELS, RARITY_COLORS } from '../icones.jsx';

function ConfigTab({ profile, setProfile, trash, setTrash, restoreItem, projects, routines, tasks, objectives, setProjects, setRoutines, setTasks, setObjectives, levelInfo, onSignOut }) {
  const [showReset, setShowReset] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [openSections, setOpenSections] = useState({ presets: false, weights: false });
  const toggleSection = (k) => setOpenSections(s => ({ ...s, [k]: !s[k] }));
  const SectionHeader = ({ label, skey }) => (
    <div onClick={() => toggleSection(skey)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "2px 0", marginBottom: openSections[skey] ? 8 : 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSections[skey] ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  );
  const presets = profile.difficultyPresets || DEFAULT_PRESETS;
  const weights = profile.nextActionWeights || { priority: 3, deadline: 2, difficulty: 1 };

  const setPreset = (cat, val) => {
    const v = clamp(parseInt(val) || 1, 1, 10);
    setProfile(p => ({ ...p, difficultyPresets: { ...(p.difficultyPresets || DEFAULT_PRESETS), [cat]: v } }));
  };
  const setWeight = (key, val) => {
    const v = clamp(parseInt(val) || 0, 0, 5);
    setProfile(p => ({ ...p, nextActionWeights: { ...(p.nextActionWeights || { priority: 3, deadline: 2, difficulty: 1 }), [key]: v } }));
  };

  const exportB = () => {
    const d = { projects, routines, tasks, objectives, trash, profile, at: new Date().toISOString() };
    const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u; a.download = "backup_" + td() + ".json"; a.click();
    URL.revokeObjectURL(u);
  };

  const importB = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json";
    inp.onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (d.projects) setProjects(d.projects);
          if (d.routines) setRoutines(d.routines);
          if (d.tasks) setTasks(d.tasks);
          if (d.objectives) setObjectives(d.objectives);
          if (d.trash) setTrash(d.trash);
          if (d.profile) setProfile(d.profile);
        } catch { alert("Arquivo inválido"); }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  const reset = () => {
    setProjects([]); setRoutines([]); setTasks([]); setObjectives([]); setTrash([]);
    setProfile({ totalXp: 0, coins: 0, streak: 0, bestStreak: 0, tasksCompleted: 0, xpToday: 0, coinsToday: 0, lastActiveDate: td(), dailyLog: [], difficultyPresets: DEFAULT_PRESETS, nextActionWeights: { priority: 3, deadline: 2, difficulty: 1 }, dailyMission: null, tasksToday: 0, projTasksToday: 0, hardTaskToday: false, maxTaskToday: false, goalUpdatedToday: false, totalCoinsEarned: 0, bestXpDay: 0, bestXpWeek: 0, maxTaskEver: false, projectsCompleted: 0, masteryGoldCount: 0, achievementsUnlocked: [], pendingChest: null, streakLostDays: 0, purchasedItems: ["t_iniciante", "i_estrela", "obsidiana", "b_simples"], equippedTitle: "t_iniciante", equippedIcon: "i_estrela", equippedTheme: "obsidiana", equippedBorder: "b_simples", upgradeLevels: {} });
    setShowReset(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ background: C.card, borderRadius: 14, marginBottom: 14, border: "1px solid " + C.brd, boxShadow: C.goldShadow ? "0 4px 20px " + C.goldShadow : "none", padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <BorderSVG level={(profile.upgradeLevels || {})[profile.equippedBorder] || 0} color={C.gold} accentColor={(SHOP_BORDERS.find(b => b.id === profile.equippedBorder) || SHOP_BORDERS[0]).color} size={68}><IconSVG id={profile.equippedIcon || "i_estrela"} size={28} color={C.gold} /></BorderSVG>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.tx }}>{"Nível "}{levelInfo.level}</div>
                <div style={{ fontSize: 11, color: C.gold, background: C.goldDim, padding: "1px 6px", borderRadius: 3, border: "1px solid " + C.goldBrd, fontWeight: 600, display: "inline-block", marginTop: 2 }}>{levelInfo.band}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{profile.totalXp.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.tx3 }}>{"XP total"}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <TitleBanner level={(profile.upgradeLevels || {})[(profile.equippedTitle)] || 0} color={C.gold} accentColor={getTitleTargetColor((SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).price) || C.gold}><span style={{ fontSize: 12, fontStyle: "italic", fontWeight: 600, color: C.gold }}>{(SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).name}</span></TitleBanner>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx4, marginBottom: 2 }}>
            <span>{levelInfo.xpInLevel} / {levelInfo.xpForLevel}</span>
            <span>{"Nv."} {Math.min(levelInfo.level + 1, 500)}</span>
          </div>
          <XpBar cur={levelInfo.xpInLevel} max={levelInfo.xpForLevel} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[
            [profile.coins, "Moedas", C.gold],
            [profile.streak, "Streak", C.orange],
            [profile.tasksCompleted, "Tarefas", C.green],
            [(profile.projectsCompleted || 0), "Projetos", C.purple],
            [(objectives || []).filter(o => o.status === "Ativo").length, "Objetivos", C.tx2],
            [(profile.totalCoinsEarned || 0).toLocaleString(), "Ganhas", C.gold],
          ].map(([v, l, color], i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color }}>{v}</div>
              <div style={{ fontSize: 11, color: C.tx4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            ["Tema", (SHOP_THEMES_LIST.find(t => t.id === profile.equippedTheme) || SHOP_THEMES_LIST[0]).name],
            ["Borda", (SHOP_BORDERS.find(b => b.id === profile.equippedBorder) || SHOP_BORDERS[0]).name],
          ].map(([label, name], i) => (
            <div key={i} style={{ fontSize: 11, color: C.tx3, background: C.bg, padding: "3px 8px", borderRadius: 4 }}><span style={{ color: C.tx4 }}>{label}:</span> {name}</div>
          ))}
          {profile.bestStreak > 0 && <div style={{ fontSize: 11, color: C.orange, background: C.bg, padding: "3px 8px", borderRadius: 4 }}>{"Melhor: "}{profile.bestStreak}{"d"}</div>}
          {profile.bestXpDay > 0 && <div style={{ fontSize: 11, color: C.tx3, background: C.bg, padding: "3px 8px", borderRadius: 4 }}>{"Recorde: "}{profile.bestXpDay}{" XP/dia"}</div>}
        </div>
      </div>
      <SLabel>Backup</SLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Btn primary onClick={exportB} style={{ flex: 1 }}>Exportar</Btn>
        <Btn onClick={importB} style={{ flex: 1 }}>Importar</Btn>
      </div>
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 10, border: "1px solid " + C.brd, padding: "10px 12px" }}>
        <SectionHeader label="Presets de dificuldade" skey="presets" />
        {openSections.presets && <>
          <div style={{ fontSize: 11, color: C.tx3, marginBottom: 6 }}>Dificuldade padrão ao selecionar categoria</div>
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: C.tx2, width: 65 }}>{cat}</span>
              <div style={{ display: "flex", gap: 2, flex: 1 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(d => {
                  const dc = getDiffColor(d); const sel = presets[cat] === d;
                  return <div key={d} onClick={() => setPreset(cat, d)} style={{ flex: 1, height: 26, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer", background: sel ? dc + "2e" : dc + "12", color: sel ? dc : dc + "99", border: "0.5px solid " + (sel ? dc + "99" : dc + "38"), fontWeight: sel ? 700 : 500, transition: "background .12s, color .12s, border-color .12s" }}>{d}</div>;
                })}
              </div>
            </div>
          ))}
        </>}
      </div>
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 10, border: "1px solid " + C.brd, padding: "10px 12px" }}>
        <SectionHeader label="Pesos da Próxima Ação" skey="weights" />
        {openSections.weights && <>
          <div style={{ fontSize: 11, color: C.tx3, marginBottom: 6 }}>Define a ordem de sugestão (0-5)</div>
          {[["priority", "Prioridade"], ["deadline", "Prazo"], ["difficulty", "Dificuldade"]].map(([k, label]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: C.tx2, width: 80 }}>{label}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[0,1,2,3,4,5].map(v => (
                  <div key={v} onClick={() => setWeight(k, v)} style={{ width: 28, height: 26, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer", background: weights[k] === v ? C.goldDim : C.bg, color: weights[k] === v ? C.gold : C.tx4, border: "0.5px solid " + (weights[k] === v ? C.gold : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>{v}</div>
                ))}
              </div>
            </div>
          ))}
        </>}
      </div>
      <SLabel>Lixeira ({trash.length})</SLabel>
      {trash.length === 0 && <div style={{ fontSize: 11, color: C.tx4, marginBottom: 8 }}>Vazia</div>}
      {trash.map(item => {
        const dl = Math.max(0, 30 - Math.floor((Date.now() - item.deletedAt) / 86400000));
        return (
          <div key={item.id + item._type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.card, borderRadius: 7, marginBottom: 4, opacity: 0.6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.tx2 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: C.tx4 }}>{item._type} {dl}d restantes{item.autoArchived ? " (auto-arquivada)" : ""}</div>
            </div>
            <span onClick={() => restoreItem(item)} style={{ fontSize: 11, color: C.purple, cursor: "pointer", textDecoration: "underline", transition: "opacity .12s" }}>Restaurar</span>
            <span onClick={() => setConfirmDel(item)} style={{ fontSize: 11, color: C.red, cursor: "pointer", transition: "opacity .12s" }}>Deletar</span>
          </div>
        );
      })}
      {trash.length > 0 && <Btn danger small onClick={() => setTrash([])} style={{ marginTop: 4 }}>Esvaziar lixeira</Btn>}
      <SLabel>Zona de perigo</SLabel>
      <Btn danger onClick={() => { setShowReset(true); setResetInput(""); }} style={{ width: "100%", marginTop: 4 }}>Resetar tudo</Btn>
      {showReset && <Modal>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px" }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Resetar tudo?</div>
          <div style={{ fontSize: 11, color: C.tx3, marginBottom: 14 }}>Todos os dados, XP e moedas serão perdidos. Ação irreversível.</div>
          <div style={{ fontSize: 11, color: C.tx4, marginBottom: 6 }}>Digite <span style={{ color: C.red, fontWeight: 600 }}>RESETAR</span> para confirmar:</div>
          <input
            value={resetInput}
            onChange={e => setResetInput(e.target.value)}
            placeholder="RESETAR"
            autoFocus
            style={{ width: "100%", padding: "7px 10px", background: C.bg, border: "1px solid " + (resetInput === "RESETAR" ? C.red : C.brd), borderRadius: 6, color: C.tx, fontSize: 12, textAlign: "center", boxSizing: "border-box", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn danger onClick={reset} style={{ width: "100%", opacity: resetInput === "RESETAR" ? 1 : 0.4, pointerEvents: resetInput === "RESETAR" ? "auto" : "none" }}>Confirmar reset</Btn>
          <Btn onClick={() => { setShowReset(false); setResetInput(""); }} style={{ width: "100%", marginTop: 4 }}>Cancelar</Btn>
        </div>
      </Modal>}
      {confirmDel && <ConfirmModal
        title="Deletar definitivamente?"
        subtitle={confirmDel.name}
        actions={[
          { label: "Deletar", danger: true, onClick: () => { setTrash(pr => pr.filter(t => !(t.id === confirmDel.id && t._type === confirmDel._type))); setConfirmDel(null); } },
          { label: "Cancelar", onClick: () => setConfirmDel(null), mt: true },
        ]}
      />}
      {onSignOut && (
        <div onClick={onSignOut} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "8px 0 20px", padding: "13px 0", background: C.card, border: "1px solid " + C.brd, borderRadius: 12, cursor: "pointer", color: C.tx3, fontSize: 14, fontWeight: 500 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair da conta
        </div>
      )}
    </div>
  );
}


/* ═══ APP ROOT ═══ */


export default ConfigTab;
