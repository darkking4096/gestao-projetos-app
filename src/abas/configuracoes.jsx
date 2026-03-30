import { useState, useEffect, useRef } from "react";
import { C } from '../temas.js';
import { uid, td, getLevelInfo, getPoderInfo, getRankInfo, getEnergia, clamp } from '../utilidades.js';
import { THEMES } from '../temas.js';
import { DEFAULT_PRESETS, CATEGORIES, COLORS, DIFF_CATEGORIES } from '../constantes.js';
import { Btn, Card, Badge, TopBar, Modal, ConfirmModal, DeleteModal, EnergiaBarDupla, RankEmblemSVG, SLabel, getDiffColor } from '../componentes-base.jsx';
import { IconSVG, SHOP_THEMES_LIST, BorderSVG, TitleBanner, SHOP_BORDERS, SHOP_TITLES, getTitleTargetColor, getTitleStyle, getUpgradeCost, getBorderStyle, UPGRADE_LABELS, RARITY_LABELS, RARITY_COLORS } from '../icones.jsx';
import { Social } from '../armazenamento.js';

/* ── Friend row component ── */
function FriendRow({ fp, onView, onRemove, onAccept, onDecline, onCancel }) {
  const poder = getPoderInfo(fp.xp || 0).poder;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "0.5px solid " + C.brd }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: C.goldDim, border: "1px solid " + C.goldBrd, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <IconSVG id={fp.equipped_icon || "i_estrela"} size={16} color={C.gold} />
      </div>
      <div style={{ flex: 1, minWidth: 0, cursor: onView ? "pointer" : "default" }} onClick={onView}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{fp.username}</div>
        <div style={{ fontSize: 11, color: C.tx4 }}>PODER {poder} · {(fp.xp || 0).toLocaleString()} ⚡</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
        {onView && <span onClick={onView} style={{ fontSize: 11, color: C.gold, cursor: "pointer", padding: "3px 7px", borderRadius: 4, background: C.goldDim, border: "0.5px solid " + C.goldBrd }}>Ver</span>}
        {onRemove && <span onClick={onRemove} style={{ fontSize: 13, color: C.tx4, cursor: "pointer", lineHeight: 1 }}>✕</span>}
        {onAccept && <span onClick={onAccept} style={{ fontSize: 11, color: C.gold, cursor: "pointer", fontWeight: 700, padding: "3px 7px", borderRadius: 4, background: C.goldDim, border: "0.5px solid " + C.goldBrd }}>Aceitar</span>}
        {onDecline && <span onClick={onDecline} style={{ fontSize: 11, color: C.tx4, cursor: "pointer" }}>Recusar</span>}
        {onCancel && <span onClick={onCancel} style={{ fontSize: 11, color: C.tx4, cursor: "pointer" }}>Cancelar</span>}
      </div>
    </div>
  );
}

/* ── Dev Panel ── */
function DevField({ label, value, onChange, type = "number", min, max, step = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: C.tx3, flex: "0 0 140px" }}>{label}</span>
      <input
        type={type}
        value={value}
        min={min} max={max} step={step}
        onChange={e => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        style={{
          flex: 1, padding: "5px 8px",
          background: C.bg, border: "1px solid #ff6b0055",
          borderRadius: 6, color: "#ff6b00", fontSize: 12,
          fontWeight: 600, outline: "none",
        }}
      />
    </div>
  );
}

const DEV_PASSWORD = "333tesla";

function DevPanel({ open, onOpen, onClose, profile, setProfile, poderInfo, rankInfo }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pwInput, setPwInput]       = useState("");
  const [pwError, setPwError]       = useState(false);

  const handleSubmit = () => {
    if (pwInput === DEV_PASSWORD) {
      setPwInput(""); setPwError(false); setShowPrompt(false); onOpen();
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 1200);
    }
  };

  if (!open) {
    return (
      <>
        <div
          onClick={() => { setShowPrompt(s => !s); setPwInput(""); setPwError(false); }}
          style={{
            marginTop: 24, marginBottom: 4, textAlign: "center",
            fontSize: 10, color: C.tx4 + "33", cursor: "default",
            letterSpacing: 1, userSelect: "none",
          }}
        >
          v2.0
        </div>
        {showPrompt && (
          <div style={{
            display: "flex", gap: 6, alignItems: "center",
            marginBottom: 10, padding: "8px 10px",
            background: "#0d0d0d", borderRadius: 8,
            border: "1px solid " + (pwError ? "#e74c3c88" : "#ff6b0033"),
            transition: "border-color .2s",
          }}>
            <span style={{ fontSize: 11, color: "#ff6b0066", flexShrink: 0 }}>🔒</span>
            <input
              autoFocus
              type="password"
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") setShowPrompt(false); }}
              placeholder="Senha dev..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 12, color: pwError ? "#e74c3c" : "#ff6b00",
                letterSpacing: pwInput ? 3 : 0,
              }}
            />
            <span
              onClick={handleSubmit}
              style={{
                fontSize: 11, color: "#ff6b0088", cursor: "pointer",
                padding: "2px 8px", borderRadius: 4,
                background: "#ff6b0015", border: "1px solid #ff6b0033",
              }}
            >
              Entrar
            </span>
          </div>
        )}
      </>
    );
  }

  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));

  return (
    <div style={{
      marginTop: 16,
      background: "#1a0a00",
      border: "1px solid #ff6b0055",
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔧</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#ff6b00", letterSpacing: 0.5 }}>PAINEL DEV</span>
        </div>
        <div style={{
          fontSize: 11, color: rankInfo.color || "#ff6b00", fontWeight: 600,
          background: (rankInfo.color || "#ff6b00") + "20",
          border: "1px solid " + (rankInfo.color || "#ff6b00") + "40",
          padding: "2px 8px", borderRadius: 5,
        }}>
          PODER {poderInfo.poder} · {rankInfo.label || "—"}
        </div>
        <span onClick={onClose} style={{ fontSize: 11, color: "#ff6b0088", cursor: "pointer" }}>✕ fechar</span>
      </div>

      {/* ENERGIA → drives PODER + Rank */}
      <div style={{ background: "#ff6b0010", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#ff6b0088", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          ⚡ ENERGIA — controla PODER e Rank
        </div>
        <DevField label="ENERGIA total (totalXp)" value={profile.totalXp || 0} min={0} step={100}
          onChange={v => set("totalXp", v)} />
        <div style={{ fontSize: 10, color: "#ff6b0066", marginTop: -4, marginBottom: 4, paddingLeft: 148 }}>
          → PODER {Math.floor((profile.totalXp || 0) / 100)}
        </div>
        <DevField label="⚡ ENERGIA hoje (xpToday)" value={profile.xpToday || 0} min={0}
          onChange={v => set("xpToday", v)} />
        <DevField label="Melhor dia ⚡ (bestXpDay)" value={profile.bestXpDay || 0} min={0}
          onChange={v => set("bestXpDay", v)} />
      </div>

      {/* Moedas */}
      <div style={{ background: "#f0a50010", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#f0a50088", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          🪙 Moedas
        </div>
        <DevField label="Moedas" value={profile.coins || 0} min={0}
          onChange={v => set("coins", v)} />
        <DevField label="Moedas hoje" value={profile.coinsToday || 0} min={0}
          onChange={v => set("coinsToday", v)} />
        <DevField label="Total moedas ganhas" value={profile.totalCoinsEarned || 0} min={0}
          onChange={v => set("totalCoinsEarned", v)} />
      </div>

      {/* Streak */}
      <div style={{ background: "#f9731610", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#f9731688", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          🔥 Streak
        </div>
        <DevField label="Streak atual" value={profile.streak || 0} min={0}
          onChange={v => set("streak", v)} />
        <DevField label="Melhor streak" value={profile.bestStreak || 0} min={0}
          onChange={v => set("bestStreak", v)} />
      </div>

      {/* Tarefas / Conquistas */}
      <div style={{ background: "#2ecc7110", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#2ecc7188", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          ✅ Tarefas / Conquistas
        </div>
        <DevField label="Tarefas concluídas" value={profile.tasksCompleted || 0} min={0}
          onChange={v => set("tasksCompleted", v)} />
        <DevField label="Projetos concluídos" value={profile.projectsCompleted || 0} min={0}
          onChange={v => set("projectsCompleted", v)} />
        <DevField label="Maestrias Gold" value={profile.masteryGoldCount || 0} min={0}
          onChange={v => set("masteryGoldCount", v)} />
        {/* Boolean flags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {[
            ["hardTaskToday", "Tarefa difícil hoje"],
            ["maxTaskToday", "Tarefa impossível hoje"],
            ["maxTaskEver", "Impossível alguma vez"],
          ].map(([key, label]) => (
            <div
              key={key}
              onClick={() => set(key, !profile[key])}
              style={{
                fontSize: 10, cursor: "pointer", padding: "3px 8px", borderRadius: 5,
                background: profile[key] ? "#2ecc7130" : C.bg,
                border: "1px solid " + (profile[key] ? "#2ecc71" : C.brd),
                color: profile[key] ? "#2ecc71" : C.tx4,
                transition: "all .12s",
              }}
            >
              {profile[key] ? "✓" : "○"} {label}
            </div>
          ))}
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div style={{ fontSize: 10, color: "#ff6b0066", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        ⚡ Atalhos rápidos de PODER
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {[
          [0,    "Humano"],
          [500,  "PODER 5"],
          [1400, "F-"],
          [1500, "F"],
          [2500, "E-"],
          [5000, "D--"],
          [10000,"C-"],
          [15000,"B-"],
          [20000,"A-"],
          [25000,"S-"],
        ].map(([xp, label]) => (
          <div
            key={xp}
            onClick={() => set("totalXp", xp)}
            style={{
              fontSize: 10, cursor: "pointer", padding: "4px 8px",
              borderRadius: 5, background: "#ff6b0015",
              border: "1px solid #ff6b0035", color: "#ff6b00",
              transition: "background .1s",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ConfigTab ── */
function ConfigTab({ profile, setProfile, trash, setTrash, restoreItem, projects, routines, tasks, objectives, setProjects, setRoutines, setTasks, setObjectives, levelInfo, poderInfo: poderInfoProp, rankInfo: rankInfoProp, onSignOut }) {
  const [showReset, setShowReset] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [openSections, setOpenSections] = useState({ presets: false, weights: false });
  const toggleSection = (k) => setOpenSections(s => ({ ...s, [k]: !s[k] }));
  const [devOpen, setDevOpen] = useState(false);

  /* Username */
  const [usernameEditing, setUsernameEditing] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  /* Friends */
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsTab, setFriendsTab] = useState("amigos");
  const [friendsData, setFriendsData] = useState({ friends: [], received: [], sent: [], userId: null, loaded: false });
  const [friendProfiles, setFriendProfiles] = useState({});
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [optimisticSent, setOptimisticSent] = useState(new Set());
  const [viewFriend, setViewFriend] = useState(null);
  const searchTimerRef = useRef(null);

  const SectionHeader = ({ label, skey }) => (
    <div onClick={() => toggleSection(skey)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "2px 0", marginBottom: openSections[skey] ? 8 : 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSections[skey] ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  );

  /* PODER / Rank info — fallback to compute locally if not passed as props */
  const _poderInfo = poderInfoProp || getPoderInfo(profile.totalXp || 0);
  const _rankInfo  = rankInfoProp  || getRankInfo(_poderInfo.poder);

  const presets = profile.difficultyPresets || DEFAULT_PRESETS;
  const weights = profile.nextActionWeights || { priority: 3, deadline: 2, difficulty: 1 };

  const setPreset = (cat, val) => {
    const v = clamp(parseInt(val) || 1, 1, 20);
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
    setProfile(p => ({ totalXp: 0, coins: 0, streak: 0, bestStreak: 0, tasksCompleted: 0, xpToday: 0, coinsToday: 0, lastActiveDate: td(), dailyLog: [], difficultyPresets: DEFAULT_PRESETS, nextActionWeights: { priority: 3, deadline: 2, difficulty: 1 }, dailyMission: null, tasksToday: 0, projTasksToday: 0, hardTaskToday: false, maxTaskToday: false, goalUpdatedToday: false, totalCoinsEarned: 0, bestXpDay: 0, bestXpWeek: 0, maxTaskEver: false, projectsCompleted: 0, masteryGoldCount: 0, achievementsUnlocked: [], pendingChest: null, streakLostDays: 0, purchasedItems: ["t_iniciante", "i_estrela", "obsidiana", "b_simples"], equippedTitle: "t_iniciante", equippedIcon: "i_estrela", equippedTheme: "obsidiana", equippedBorder: "b_simples", upgradeLevels: {}, username: p.username }));
    setShowReset(false);
  };

  /* ── Username ── */
  const openUsernameEdit = () => {
    setUsernameInput(profile.username || "");
    setUsernameError("");
    setUsernameEditing(true);
  };

  const saveUsername = async () => {
    const u = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
    if (u.length < 3) { setUsernameError("Mínimo 3 caracteres"); return; }
    if (u.length > 20) { setUsernameError("Máximo 20 caracteres"); return; }
    if (u === profile.username) { setUsernameEditing(false); return; }
    setUsernameSaving(true);
    setUsernameError("");
    try {
      const available = await Social.checkUsername(u);
      if (!available) { setUsernameError("Esse nome já está em uso"); setUsernameSaving(false); return; }
      await Social.setUsername(u, { ...profile, objectivesCount: (objectives || []).filter(o => o.status === "Ativo").length });
      setProfile(p => ({ ...p, username: u }));
      setUsernameEditing(false);
    } catch(e) { setUsernameError("Erro ao salvar. Tente novamente."); }
    setUsernameSaving(false);
  };

  /* ── Friends ── */
  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const data = await Social.getFriendships();
      const allIds = [
        ...data.friends.map(f => f.sender_id === data.userId ? f.receiver_id : f.sender_id),
        ...data.received.map(f => f.sender_id),
        ...data.sent.map(f => f.receiver_id),
      ];
      const profiles = await Social.getProfiles([...new Set(allIds)]);
      const profileMap = {};
      profiles.forEach(p => { profileMap[p.user_id] = p; });
      setFriendProfiles(profileMap);
      setFriendsData({ ...data, loaded: true });
    } catch(e) { console.error(e); }
    setFriendsLoading(false);
  };

  useEffect(() => {
    if (friendsOpen && !friendsData.loaded && profile.username) loadFriends();
  }, [friendsOpen]);

  const handleSearch = (q) => {
    setSearchQuery(q);
    setSearchResults([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim() || q.trim().length < 2) { setSearchLoading(false); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      const results = await Social.searchUsers(q.trim());
      const sentSet = new Set([...friendsData.sent.map(f => f.receiver_id), ...optimisticSent]);
      const friendSet = new Set(friendsData.friends.map(f => f.sender_id === friendsData.userId ? f.receiver_id : f.sender_id));
      const receivedSet = new Set(friendsData.received.map(f => f.sender_id));
      setSearchResults(results.map(r => ({
        ...r,
        isAlreadyFriend: friendSet.has(r.user_id),
        isAlreadySent: sentSet.has(r.user_id),
        isAlreadyReceived: receivedSet.has(r.user_id),
      })));
      setSearchLoading(false);
    }, 400);
  };

  const sendRequest = async (receiverId) => {
    setOptimisticSent(prev => new Set([...prev, receiverId]));
    setSearchResults(prev => prev.map(r => r.user_id === receiverId ? { ...r, isAlreadySent: true } : r));
    try {
      await Social.sendFriendRequest(receiverId);
      await loadFriends();
    } catch(e) {
      setOptimisticSent(prev => { const s = new Set(prev); s.delete(receiverId); return s; });
      setSearchResults(prev => prev.map(r => r.user_id === receiverId ? { ...r, isAlreadySent: false } : r));
    }
  };

  const acceptRequest = async (friendshipId) => {
    try { await Social.acceptFriendRequest(friendshipId); await loadFriends(); setFriendsTab("amigos"); } catch(e) {}
  };

  const removeFriendship = async (friendshipId) => {
    try { await Social.removeFriendship(friendshipId); await loadFriends(); } catch(e) {}
  };

  const pendingCount = friendsData.received.length;

  return (
    <div style={{ padding: 14 }}>

      {/* ── Profile card ── */}
      <div style={{ background: C.card, borderRadius: 14, marginBottom: 14, border: "1px solid " + C.brd, boxShadow: C.goldShadow ? "0 4px 20px " + C.goldShadow : "none", padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <BorderSVG level={(profile.upgradeLevels || {})[profile.equippedBorder] || 0} color={C.gold} accentColor={(SHOP_BORDERS.find(b => b.id === profile.equippedBorder) || SHOP_BORDERS[0]).color} size={68}>
            <IconSVG id={profile.equippedIcon || "i_estrela"} size={28} color={C.gold} />
          </BorderSVG>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <RankEmblemSVG rank={_rankInfo.rankMain} modifier={_rankInfo.modifier || ""} size={28} color={_rankInfo.color} colorSecondary={_rankInfo.colorSecondary} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: _rankInfo.color || C.gold }}>{_rankInfo.label}</span>
                </div>
                {profile.username ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>@{profile.username}</span>
                    <span onClick={openUsernameEdit} style={{ cursor: "pointer", lineHeight: 1, opacity: 0.55, flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </span>
                  </div>
                ) : (
                  <div onClick={openUsernameEdit} style={{ fontSize: 11, color: C.gold, cursor: "pointer", marginTop: 3, opacity: 0.7, display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span style={{ textDecoration: "underline dotted" }}>Definir @username</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{(profile.totalXp || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.tx3 }}>⚡ ENERGIA total</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <TitleBanner level={(profile.upgradeLevels || {})[(profile.equippedTitle)] || 0} color={C.gold} accentColor={getTitleTargetColor((SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).price) || C.gold}>
            <span style={{ fontSize: 12, fontStyle: "italic", fontWeight: 600, color: C.gold }}>{(SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).name}</span>
          </TitleBanner>
        </div>
        <div style={{ marginBottom: 10 }}>
          <EnergiaBarDupla poderInfo={_poderInfo} rankInfo={_rankInfo} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[
            [profile.coins, "Moedas", C.gold],
            [profile.streak, "Streak", C.gold],
            [profile.tasksCompleted, "Tarefas", C.gold],
            [(profile.projectsCompleted || 0), "Proj. Concluídos", C.gold],
            [(objectives || []).filter(o => o.status === "Ativo").length, "Objetivos", C.gold],
            [(profile.totalCoinsEarned || 0).toLocaleString(), "Total Ganhas", C.gold],
          ].map(([v, l, color], i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color }}>{v}</div>
              <div style={{ fontSize: 11, color: C.tx4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[["Tema", (SHOP_THEMES_LIST.find(t => t.id === profile.equippedTheme) || SHOP_THEMES_LIST[0]).name],
            ["Borda", (SHOP_BORDERS.find(b => b.id === profile.equippedBorder) || SHOP_BORDERS[0]).name]
          ].map(([label, name], i) => (
            <div key={i} style={{ fontSize: 11, color: C.tx3, background: C.bg, padding: "3px 8px", borderRadius: 4 }}><span style={{ color: C.tx4 }}>{label}:</span> {name}</div>
          ))}
          {profile.bestStreak > 0 && <div style={{ fontSize: 11, color: C.orange, background: C.bg, padding: "3px 8px", borderRadius: 4 }}>Melhor: {profile.bestStreak}d</div>}
          {profile.bestXpDay > 0 && <div style={{ fontSize: 11, color: C.tx3, background: C.bg, padding: "3px 8px", borderRadius: 4 }}>Recorde: {profile.bestXpDay} ⚡/dia</div>}
        </div>
      </div>

      {/* ── Friends section ── */}
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 14, border: "1px solid " + C.brd, padding: "10px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div onClick={() => setFriendsOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.5, textTransform: "uppercase" }}>Amigos</span>
            {pendingCount > 0 && (
              <span style={{ fontSize: 10, background: C.red, color: "#fff", borderRadius: 8, padding: "1px 5px", fontWeight: 700, lineHeight: "15px" }}>{pendingCount}</span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: friendsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", marginLeft: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {friendsOpen && profile.username && (
            <span onClick={() => { setShowSearch(true); setSearchQuery(""); setSearchResults([]); }}
              style={{ fontSize: 11, color: C.gold, cursor: "pointer", fontWeight: 600, marginLeft: 12, flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Adicionar
            </span>
          )}
        </div>

        {friendsOpen && (
          <div style={{ marginTop: 12 }}>
            {!profile.username ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 11, color: C.tx4, marginBottom: 8 }}>Defina um @username para adicionar amigos</div>
                <span onClick={openUsernameEdit} style={{ fontSize: 11, color: C.gold, cursor: "pointer", fontWeight: 600, padding: "5px 12px", border: "1px solid " + C.goldBrd, borderRadius: 6, background: C.goldDim }}>Definir agora</span>
              </div>
            ) : friendsLoading ? (
              <div style={{ fontSize: 11, color: C.tx4, textAlign: "center", padding: "10px 0" }}>Carregando...</div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid " + C.brd, marginBottom: 10 }}>
                  {[["amigos", "Amigos", friendsData.friends.length],
                    ["recebidos", "Recebidos", friendsData.received.length],
                    ["enviados", "Enviados", friendsData.sent.length]
                  ].map(([k, label, count]) => (
                    <div key={k} onClick={() => setFriendsTab(k)} style={{
                      flex: 1, textAlign: "center", padding: "5px 2px 7px", fontSize: 11, cursor: "pointer",
                      fontWeight: friendsTab === k ? 600 : 400,
                      color: friendsTab === k ? C.gold : C.tx4,
                      borderBottom: "2px solid " + (friendsTab === k ? C.gold : "transparent"),
                      transition: "color .12s, border-color .12s", marginBottom: -1,
                    }}>
                      {label}{count > 0 ? " " + count : ""}
                      {k === "recebidos" && count > 0 && (
                        <span style={{ marginLeft: 3, width: 6, height: 6, borderRadius: 3, background: C.red, display: "inline-block", verticalAlign: "middle", marginBottom: 1 }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Amigos */}
                {friendsTab === "amigos" && (
                  friendsData.friends.length === 0
                    ? <div style={{ fontSize: 11, color: C.tx4, textAlign: "center", padding: "12px 0" }}>Nenhum amigo ainda. Use "+ Adicionar" para buscar.</div>
                    : friendsData.friends.map(f => {
                        const otherId = f.sender_id === friendsData.userId ? f.receiver_id : f.sender_id;
                        const fp = friendProfiles[otherId];
                        return fp ? <FriendRow key={f.id} fp={fp} onView={() => setViewFriend(fp)} onRemove={() => removeFriendship(f.id)} /> : null;
                      })
                )}

                {/* Recebidos */}
                {friendsTab === "recebidos" && (
                  friendsData.received.length === 0
                    ? <div style={{ fontSize: 11, color: C.tx4, textAlign: "center", padding: "12px 0" }}>Nenhum convite recebido</div>
                    : friendsData.received.map(f => {
                        const fp = friendProfiles[f.sender_id];
                        return fp ? <FriendRow key={f.id} fp={fp} onAccept={() => acceptRequest(f.id)} onDecline={() => removeFriendship(f.id)} /> : null;
                      })
                )}

                {/* Enviados */}
                {friendsTab === "enviados" && (
                  friendsData.sent.length === 0
                    ? <div style={{ fontSize: 11, color: C.tx4, textAlign: "center", padding: "12px 0" }}>Nenhum convite enviado</div>
                    : friendsData.sent.map(f => {
                        const fp = friendProfiles[f.receiver_id];
                        return fp ? <FriendRow key={f.id} fp={fp} onCancel={() => removeFriendship(f.id)} /> : null;
                      })
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Integração IA (Groq) ── */}
      <SLabel>Integração com IA</SLabel>
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 10, border: "1px solid " + C.brd, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.tx, marginBottom: 4 }}>Chave da API Groq</div>
        <div style={{ fontSize: 11, color: C.tx3, marginBottom: 8, lineHeight: 1.5 }}>
          Usada para gerar questionários personalizados de atributos. Gratuita em{" "}
          <span style={{ color: C.gold }}>console.groq.com</span>.
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="password"
            value={profile.groqApiKey || ""}
            onChange={e => setProfile(p => ({ ...p, groqApiKey: e.target.value }))}
            placeholder="gsk_..."
            style={{
              width: "100%", padding: "8px 10px", background: C.bg,
              border: "1px solid " + C.brd2, borderRadius: 6, color: C.tx,
              fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        {profile.groqApiKey && (
          <div style={{ fontSize: 11, color: C.green, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Chave configurada
          </div>
        )}
      </div>

      {/* ── Backup ── */}
      <SLabel>Backup</SLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Btn primary onClick={exportB} style={{ flex: 1 }}>Exportar</Btn>
        <Btn onClick={importB} style={{ flex: 1 }}>Importar</Btn>
      </div>

      {/* ── Presets & Weights ── */}
      <div style={{ background: C.card, borderRadius: 10, marginBottom: 10, border: "1px solid " + C.brd, padding: "10px 12px" }}>
        <SectionHeader label="Presets de dificuldade" skey="presets" />
        {openSections.presets && <>
          <div style={{ fontSize: 11, color: C.tx3, marginBottom: 8 }}>Dificuldade padrão ao criar atividade por categoria</div>
          {CATEGORIES.map(cat => {
            const curCat = DIFF_CATEGORIES.find(c => c.levels.includes(presets[cat])) || DIFF_CATEGORIES[2];
            return (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: C.tx2, width: 65 }}>{cat}</span>
                  <span style={{ fontSize: 11, color: curCat.color, fontWeight: 600 }}>
                    {curCat.id} · {getEnergia(presets[cat])} ⚡
                  </span>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {DIFF_CATEGORIES.map(c => {
                    const mid = c.levels[Math.floor(c.levels.length / 2)];
                    const isSel = curCat.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setPreset(cat, mid)}
                        style={{
                          flex: 1, paddingTop: 5, paddingBottom: 5,
                          borderRadius: 6, display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 1,
                          cursor: "pointer",
                          background: isSel ? c.color + "2e" : c.color + "0e",
                          border: "1px solid " + (isSel ? c.color + "88" : c.color + "28"),
                          transition: "background .1s, border-color .1s",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: isSel ? c.color : c.color + "77", lineHeight: 1 }}>{c.id}</span>
                        <span style={{ fontSize: 9, color: isSel ? c.color + "cc" : c.color + "44", lineHeight: 1 }}>{getEnergia(mid)}⚡</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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

      {/* ── Trash ── */}
      <SLabel>Lixeira ({trash.length})</SLabel>
      {trash.length === 0 && <div style={{ fontSize: 11, color: C.tx4, marginBottom: 8 }}>Vazia</div>}
      {trash.map(item => {
        const dl = Math.max(0, 30 - Math.floor((Date.now() - item.deletedAt) / 86400000));
        return (
          <div key={item.id + item._type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.card, borderRadius: 7, marginBottom: 4, opacity: 0.6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.tx2 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: C.tx4 }}>{item._type} · {dl}d restantes{item.autoArchived ? " (auto-arquivada)" : ""}</div>
            </div>
            <span onClick={() => restoreItem(item)} style={{ fontSize: 11, color: C.purple, cursor: "pointer", textDecoration: "underline" }}>Restaurar</span>
            <span onClick={() => setConfirmDel(item)} style={{ fontSize: 11, color: C.red, cursor: "pointer" }}>Deletar</span>
          </div>
        );
      })}
      {trash.length > 0 && <Btn danger small onClick={() => setTrash([])} style={{ marginTop: 4 }}>Esvaziar lixeira</Btn>}

      {/* ── Danger zone ── */}
      <SLabel>Zona de perigo</SLabel>
      <Btn danger onClick={() => { setShowReset(true); setResetInput(""); }} style={{ width: "100%", marginTop: 4 }}>Resetar tudo</Btn>

      {/* ── Logout (mobile) ── */}
      {onSignOut && (
        <div onClick={onSignOut} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "8px 0 20px", padding: "13px 0", background: C.card, border: "1px solid " + C.brd, borderRadius: 12, cursor: "pointer", color: C.tx3, fontSize: 14, fontWeight: 500 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair da conta
        </div>
      )}

      {/* ════ MODALS ════ */}

      {/* Username editing modal */}
      {usernameEditing && (
        <Modal>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Nome de usuário</div>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 12 }}>Visível para seus amigos. 3–20 caracteres. Apenas letras minúsculas, números, _ e .</div>
            <input
              value={usernameInput}
              onChange={e => { setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "")); setUsernameError(""); }}
              placeholder="seunome"
              maxLength={20}
              autoFocus
              style={{ width: "100%", padding: "9px 12px", background: C.bg, border: "1px solid " + (usernameError ? C.red : C.brd), borderRadius: 8, color: C.tx, fontSize: 14, boxSizing: "border-box", outline: "none" }}
            />
            {usernameError && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>{usernameError}</div>}
            {!usernameError && usernameInput.length > 0 && (
              <div style={{ fontSize: 11, color: C.tx4, marginTop: 6 }}>
                Ficará: <span style={{ color: C.gold, fontWeight: 600 }}>@{usernameInput.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "")}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { setUsernameEditing(false); setUsernameError(""); }} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn primary onClick={saveUsername} style={{ flex: 1, opacity: usernameSaving ? 0.6 : 1, pointerEvents: usernameSaving ? "none" : "auto" }}>
              {usernameSaving ? "Verificando..." : "Salvar"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Search friends modal */}
      {showSearch && (
        <Modal>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 12 }}>Buscar usuário</div>
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Digite o @username..."
            autoFocus
            style={{ width: "100%", padding: "9px 12px", background: C.bg, border: "1px solid " + C.brd, borderRadius: 8, color: C.tx, fontSize: 13, boxSizing: "border-box", outline: "none", marginBottom: 12 }}
          />
          {searchLoading && <div style={{ fontSize: 11, color: C.tx4, textAlign: "center", padding: "8px 0" }}>Buscando...</div>}
          {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div style={{ fontSize: 11, color: C.tx4, textAlign: "center", padding: "8px 0" }}>Nenhum usuário encontrado</div>
          )}
          {searchResults.map(r => (
            <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "0.5px solid " + C.brd }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: C.goldDim, border: "1px solid " + C.goldBrd, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconSVG id={r.equipped_icon || "i_estrela"} size={14} color={C.gold} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.tx }}>@{r.username}</div>
                <div style={{ fontSize: 11, color: C.tx4 }}>PODER {getPoderInfo(r.xp || 0).poder}</div>
              </div>
              {r.isAlreadyFriend ? (
                <span style={{ fontSize: 11, color: C.tx4, padding: "3px 7px" }}>Amigo</span>
              ) : r.isAlreadySent ? (
                <span style={{ fontSize: 11, color: C.tx4, padding: "3px 7px" }}>Enviado ✓</span>
              ) : r.isAlreadyReceived ? (
                <span onClick={() => { acceptRequest(friendsData.received.find(f => f.sender_id === r.user_id)?.id); setShowSearch(false); }}
                  style={{ fontSize: 11, color: C.gold, cursor: "pointer", fontWeight: 700, padding: "3px 7px", borderRadius: 4, background: C.goldDim, border: "0.5px solid " + C.goldBrd }}>
                  Aceitar
                </span>
              ) : (
                <Btn small primary onClick={() => sendRequest(r.user_id)}>Adicionar</Btn>
              )}
            </div>
          ))}
          <Btn onClick={() => { setShowSearch(false); }} style={{ width: "100%", marginTop: 14 }}>Fechar</Btn>
        </Modal>
      )}

      {/* Friend profile view modal */}
      {viewFriend && (() => {
        const fPoder = getPoderInfo(viewFriend.xp || 0).poder;
        const fRank  = getRankInfo(fPoder);
        const titleItem = SHOP_TITLES.find(t => t.id === viewFriend.equipped_title) || SHOP_TITLES[0];
        return (
          <Modal>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <BorderSVG level={(viewFriend.upgrade_levels || {})[viewFriend.equipped_border] || 0} color={C.gold} accentColor={(SHOP_BORDERS.find(b => b.id === viewFriend.equipped_border) || SHOP_BORDERS[0]).color} size={64}>
                  <IconSVG id={viewFriend.equipped_icon || "i_estrela"} size={26} color={C.gold} />
                </BorderSVG>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.gold, letterSpacing: -0.5 }}>@{viewFriend.username}</div>
              <div style={{ fontSize: 12, color: fRank.color || C.tx3, marginTop: 3 }}>PODER {fPoder} · {(viewFriend.xp || 0).toLocaleString()} ⚡</div>
              <div style={{ display: "inline-block", marginTop: 6 }}>
                <TitleBanner level={(viewFriend.upgrade_levels || {})[viewFriend.equipped_title] || 0} color={C.gold} accentColor={getTitleTargetColor(titleItem.price) || C.gold}>
                  <span style={{ fontSize: 11, fontStyle: "italic", fontWeight: 600, color: C.gold }}>{titleItem.name}</span>
                </TitleBanner>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
              {[
                [viewFriend.streak, "Streak"],
                [viewFriend.tasks_completed, "Tarefas"],
                [viewFriend.projects_completed, "Proj. Concluídos"],
                [viewFriend.objectives_count, "Objetivos Ativos"],
              ].map(([v, l]) => (
                <div key={l} style={{ background: C.bg, borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{v}</div>
                  <div style={{ fontSize: 11, color: C.tx4, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <Btn onClick={() => setViewFriend(null)} style={{ width: "100%" }}>Fechar</Btn>
          </Modal>
        );
      })()}

      {/* Reset modal */}
      {showReset && (
        <Modal>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px" }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Resetar tudo?</div>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 14 }}>Todos os dados, ENERGIA ⚡ e moedas serão perdidos. Seu @username será mantido.</div>
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
        </Modal>
      )}

      {/* Confirm permanent delete */}
      {confirmDel && (
        <ConfirmModal
          title="Deletar definitivamente?"
          subtitle={confirmDel.name}
          actions={[
            { label: "Deletar", danger: true, onClick: () => { setTrash(pr => pr.filter(t => !(t.id === confirmDel.id && t._type === confirmDel._type))); setConfirmDel(null); } },
            { label: "Cancelar", onClick: () => setConfirmDel(null), mt: true },
          ]}
        />
      )}

      {/* ── Dev Panel ── */}
      <DevPanel
        open={devOpen}
        onOpen={() => setDevOpen(true)}
        onClose={() => setDevOpen(false)}
        profile={profile}
        setProfile={setProfile}
        poderInfo={_poderInfo}
        rankInfo={_rankInfo}
      />
    </div>
  );
}

export default ConfigTab;
