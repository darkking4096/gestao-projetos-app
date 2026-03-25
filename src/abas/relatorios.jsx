import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { C } from '../temas.js';
import { uid, td, fmtD } from '../utilidades.js';
import { Modal, Btn } from '../componentes-base.jsx';

/*
  RELATÓRIOS — Sistema de Notas
  ─────────────────────────────
  IMPORTANTE: renderSidebar() e renderEditor() são FUNÇÕES (não componentes).
  Isso evita que o React desmonte/remonte o <textarea> a cada tecla digitada,
  o que causava perda de foco.
*/

export default function ReportsTab({ notes, folders, onUpdateNotes, onUpdateFolders }) {
  /* ── Estado ── */
  const [selNoteId, setSelNoteId]         = useState(null);
  const [selFolderId, setSelFolderId]     = useState(null);
  const [mobileView, setMobileView]       = useState("sidebar");
  const [search, setSearch]               = useState("");
  const [showSearch, setShowSearch]       = useState(false);
  const [showMenu, setShowMenu]           = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [renamingFolder, setRenamingFolder]   = useState(null); // { id, name }
  const [showMoveModal, setShowMoveModal]     = useState(null); // noteId
  const [confirmDelete, setConfirmDelete]     = useState(null); // { type, id, name }

  /* ── Drag Desktop (mouse / HTML5) ── */
  const [deskDrag, setDeskDrag]   = useState(null);  // { id, type: "note"|"folder" }
  const [dragOverId, setDragOverId] = useState(null); // folderId | "root" | null

  /* ── Drag Mobile (touch) ── */
  const touchRef     = useRef(null); // { id, type, label, startX, startY, active }
  const [dragPos, setDragPos] = useState(null); // { x, y }
  const sidebarRef   = useRef(null); // para registrar listener não-passivo

  const isDesktop = window.innerWidth >= 768;
  const allNotes   = notes   || [];
  const allFolders = folders || [];

  const selNote     = useMemo(() => allNotes.find(n => n.id === selNoteId) || null, [allNotes, selNoteId]);
  const rootFolders = useMemo(() => allFolders.filter(f => !f.parentId),            [allFolders]);
  const looseNotes  = useMemo(() => allNotes.filter(n => !n.folderId),              [allNotes]);

  /* ══════════════════════════════════════════
     CRUD
  ══════════════════════════════════════════ */
  const createNote = useCallback((folderId = null) => {
    const note = { id: uid(), title: "", content: "", folderId: folderId || null, createdAt: td(), updatedAt: td() };
    onUpdateNotes(prev => [...(prev || []), note]);
    setSelNoteId(note.id);
    if (!isDesktop) setMobileView("editor");
  }, [onUpdateNotes, isDesktop]);

  const updateNoteField = useCallback((id, field, value) => {
    onUpdateNotes(prev => (prev || []).map(n =>
      n.id === id ? { ...n, [field]: value, updatedAt: td() } : n
    ));
  }, [onUpdateNotes]);

  const deleteNote = useCallback((id) => {
    onUpdateNotes(prev => (prev || []).filter(n => n.id !== id));
    if (selNoteId === id) { setSelNoteId(null); if (!isDesktop) setMobileView("sidebar"); }
    setConfirmDelete(null);
  }, [onUpdateNotes, selNoteId, isDesktop]);

  const moveNote = useCallback((noteId, targetFolderId) => {
    onUpdateNotes(prev => (prev || []).map(n =>
      n.id === noteId ? { ...n, folderId: targetFolderId || null, updatedAt: td() } : n
    ));
    setShowMoveModal(null);
  }, [onUpdateNotes]);

  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const f = { id: uid(), name: newFolderName.trim(), parentId: null, createdAt: td() };
    onUpdateFolders(prev => [...(prev || []), f]);
    setShowNewFolder(false);
    setNewFolderName("");
  }, [newFolderName, onUpdateFolders]);

  const renameFolder = useCallback((id, name) => {
    if (!name.trim()) return;
    onUpdateFolders(prev => (prev || []).map(f => f.id === id ? { ...f, name: name.trim() } : f));
    setRenamingFolder(null);
  }, [onUpdateFolders]);

  const deleteFolder = useCallback((id) => {
    const toDelete = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      allFolders.forEach(f => {
        if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
          toDelete.add(f.id); changed = true;
        }
      });
    }
    onUpdateFolders(prev => (prev || []).filter(f => !toDelete.has(f.id)));
    onUpdateNotes(prev => (prev || []).map(n => toDelete.has(n.folderId) ? { ...n, folderId: null } : n));
    if (toDelete.has(selFolderId)) setSelFolderId(null);
    setConfirmDelete(null);
  }, [allFolders, onUpdateFolders, onUpdateNotes, selFolderId]);

  // Move pasta — previne ciclos (drop em si mesmo ou em descendente)
  const moveFolder = useCallback((folderId, targetParentId) => {
    if (!folderId) return;
    if (targetParentId === folderId) return;
    const isDesc = (ancId, checkId) => {
      if (!checkId) return false;
      const f = allFolders.find(x => x.id === checkId);
      if (!f) return false;
      if (f.parentId === ancId) return true;
      return isDesc(ancId, f.parentId);
    };
    if (targetParentId && isDesc(folderId, targetParentId)) return;
    onUpdateFolders(prev => (prev || []).map(f =>
      f.id === folderId ? { ...f, parentId: targetParentId || null } : f
    ));
  }, [allFolders, onUpdateFolders]);

  const downloadNote = useCallback((note) => {
    const name = (note.title || "nota").replace(/[^a-zA-Z0-9\u00C0-\u024F _-]/g, "_") + ".md";
    const blob = new Blob([note.content || ""], { type: "text/markdown;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }, []);

  /* ══════════════════════════════════════════
     DRAG & DROP — Desktop (HTML5)
  ══════════════════════════════════════════ */
  const handleDrop = useCallback((targetRawId) => {
    const targetFolderId = targetRawId === "root" ? null : (targetRawId || null);
    if (!deskDrag) return;
    if (deskDrag.type === "note")   moveNote(deskDrag.id, targetFolderId);
    if (deskDrag.type === "folder") moveFolder(deskDrag.id, targetFolderId);
    setDeskDrag(null);
    setDragOverId(null);
  }, [deskDrag, moveNote, moveFolder]);

  /* ══════════════════════════════════════════
     DRAG & DROP — Mobile (touch)
     Listener registrado como não-passivo para
     poder chamar e.preventDefault() corretamente
  ══════════════════════════════════════════ */
  const handleTouchStart = useCallback((e, id, type, label) => {
    const t = e.touches[0];
    touchRef.current = { id, type, label, startX: t.clientX, startY: t.clientY, active: false };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchRef.current) return;
    const t = e.touches[0];

    if (touchRef.current.active) {
      // Drag já ativo — bloqueia scroll e atualiza posição
      e.preventDefault();
      setDragPos({ x: t.clientX, y: t.clientY });
      const el  = document.elementFromPoint(t.clientX, t.clientY);
      const fEl = el?.closest('[data-folder-id]');
      setDragOverId(fEl ? fEl.getAttribute('data-folder-id') : null);
      return;
    }

    const dx = Math.abs(t.clientX - touchRef.current.startX);
    const dy = Math.abs(t.clientY - touchRef.current.startY);

    // Se movimento claramente vertical → é scroll, cancela drag
    if (dy > 8 && dy > dx * 1.6) {
      touchRef.current = null;
      return;
    }
    // Threshold atingido → ativa drag
    if (dx > 8 || dy > 8) {
      touchRef.current.active = true;
      e.preventDefault();
      setDragPos({ x: t.clientX, y: t.clientY });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchRef.current?.active) {
      const { id, type } = touchRef.current;
      const target = dragOverId === "root" ? null : (dragOverId || null);
      if (type === "note")   moveNote(id, target);
      if (type === "folder") moveFolder(id, target === id ? null : target);
    }
    touchRef.current = null;
    setDragPos(null);
    setDragOverId(null);
  }, [dragOverId, moveNote, moveFolder]);

  // Registra touchmove/touchend como não-passivos na sidebar
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const opts = { passive: false };
    el.addEventListener('touchmove', handleTouchMove, opts);
    el.addEventListener('touchend',  handleTouchEnd,  opts);
    return () => {
      el.removeEventListener('touchmove', handleTouchMove, opts);
      el.removeEventListener('touchend',  handleTouchEnd,  opts);
    };
  }, [handleTouchMove, handleTouchEnd]);

  /* ══════════════════════════════════════════
     RENDER HELPERS (funções, não componentes!)
  ══════════════════════════════════════════ */

  // Botão ícone com área de toque confortável (≥ 36px)
  const iconBtn = (onClick, title, color, svg) => (
    <span
      key={title}
      onClick={onClick}
      title={title}
      style={{
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: color || C.tx3,
        minWidth: 36, minHeight: 36,
        borderRadius: 6,
        WebkitTapHighlightColor: "transparent",
        flexShrink: 0,
      }}
    >
      {svg}
    </span>
  );

  const renderNoteRow = (note, depth) => {
    const isSel = selNoteId === note.id;
    const isDraggingThis = (touchRef.current?.active && touchRef.current?.id === note.id)
                        || (deskDrag?.id === note.id);
    return (
      <div
        key={note.id}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", note.id);
          // Adia para não bloquear a imagem de drag do browser
          setTimeout(() => setDeskDrag({ id: note.id, type: "note" }), 0);
        }}
        onDragEnd={() => { setDeskDrag(null); setDragOverId(null); }}
        onTouchStart={(e) => handleTouchStart(e, note.id, "note", note.title || "Sem título")}
        onClick={() => { setSelNoteId(note.id); if (!isDesktop) setMobileView("editor"); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: `${isDesktop ? 6 : 11}px 10px ${isDesktop ? 6 : 11}px ${10 + depth * 14 + 16}px`,
          cursor: "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          background: isSel ? C.gold + "12" : "transparent",
          color: isSel ? C.gold : C.tx3,
          borderLeft: "2px solid " + (isSel ? C.gold + "70" : "transparent"),
          opacity: isDraggingThis ? 0.3 : 1,
          fontSize: 12,
          transition: "background .1s, opacity .1s",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, pointerEvents: "none" }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>
          {note.title || "Sem título"}
        </span>
      </div>
    );
  };

  const renderFolderRow = (folder, depth) => {
    const isOpen         = expandedFolders[folder.id] !== false;
    const isSel          = selFolderId === folder.id;
    const isDragOver     = dragOverId === folder.id;
    const isRenaming     = renamingFolder?.id === folder.id;
    const isDraggingThis = (touchRef.current?.active && touchRef.current?.id === folder.id)
                         || (deskDrag?.id === folder.id);
    const noteCount   = allNotes.filter(n => n.folderId === folder.id).length;
    const children    = allFolders.filter(f => f.parentId === folder.id);
    const folderNotes = allNotes.filter(n => n.folderId === folder.id);

    return (
      <div key={folder.id} style={{ opacity: isDraggingThis ? 0.3 : 1, transition: "opacity .1s" }}>
        <div
          data-folder-id={folder.id}
          draggable={!isRenaming}
          onDragStart={(e) => {
            if (isRenaming) { e.preventDefault(); return; }
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", folder.id);
            setTimeout(() => setDeskDrag({ id: folder.id, type: "folder" }), 0);
          }}
          onDragEnd={() => { setDeskDrag(null); setDragOverId(null); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverId(folder.id); }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setDragOverId(prev => prev === folder.id ? null : prev);
            }
          }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(folder.id); }}
          onTouchStart={(e) => handleTouchStart(e, folder.id, "folder", folder.name)}
          onClick={() => {
            setSelFolderId(isSel ? null : folder.id);
            setExpandedFolders(e => ({ ...e, [folder.id]: e[folder.id] === false ? true : !isOpen }));
          }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: `${isDesktop ? 8 : 11}px 8px ${isDesktop ? 8 : 11}px ${8 + depth * 14}px`,
            cursor: "grab",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            background: isDragOver ? C.gold + "22" : isSel ? C.gold + "10" : "transparent",
            color: isSel ? C.gold : C.tx2,
            borderLeft: "2px solid " + (isDragOver ? C.gold : isSel ? C.gold : "transparent"),
            fontSize: 12,
            transition: "background .1s, border-color .1s",
          }}
        >
          {/* Seta expand/collapse */}
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            onClick={(e) => { e.stopPropagation(); setExpandedFolders(prev => ({ ...prev, [folder.id]: !isOpen })); }}
            style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0, cursor: "pointer" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>

          {/* Ícone pasta */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, pointerEvents: "none" }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>

          {/* Nome (ou input renomear) */}
          {isRenaming ? (
            <input
              autoFocus
              value={renamingFolder.name}
              onChange={(e) => setRenamingFolder({ ...renamingFolder, name: e.target.value })}
              onBlur={() => renameFolder(folder.id, renamingFolder.name || folder.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  renameFolder(folder.id, renamingFolder.name || folder.name);
                if (e.key === "Escape") setRenamingFolder(null);
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, background: C.bg, border: "1px solid " + C.goldBrd, borderRadius: 3, color: C.tx, fontSize: 11, padding: "2px 5px", outline: "none", minWidth: 0 }}
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setRenamingFolder({ id: folder.id, name: folder.name }); }}
              style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}
            >{folder.name}</span>
          )}

          {/* Contagem + botão excluir */}
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0, marginLeft: 2 }}>
            {noteCount > 0 && <span style={{ fontSize: 10, color: C.tx4, pointerEvents: "none" }}>{noteCount}</span>}
            <span
              onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "folder", id: folder.id, name: folder.name }); }}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx4, padding: "4px 2px" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </span>
          </div>
        </div>

        {isOpen && (
          <>
            {children.map(child => renderFolderRow(child, depth + 1))}
            {folderNotes.map(n => renderNoteRow(n, depth + 1))}
          </>
        )}
      </div>
    );
  };

  /* ── SIDEBAR (função, não componente) ── */
  const renderSidebar = () => (
    <div
      ref={sidebarRef}
      style={{
        width: isDesktop ? 220 : "100%",
        flexShrink: 0, height: "100%",
        borderRight: isDesktop ? "0.5px solid " + C.brd : "none",
        display: "flex", flexDirection: "column",
        background: C.bg, overflow: "hidden",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ padding: "6px 8px 6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "0.5px solid " + C.brd }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.tx, letterSpacing: 0.3 }}>Relatórios</span>
        <div style={{ display: "flex", alignItems: "center" }}>

          {iconBtn(
            () => setShowSearch(s => !s), "Buscar",
            showSearch ? C.gold : C.tx3,
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          )}

          {iconBtn(
            () => setShowNewFolder(true), "Nova pasta", C.tx3,
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          )}

          {iconBtn(
            () => createNote(selFolderId), "Nova nota", C.tx3,
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}

          {/* ⋮ menu */}
          <div style={{ position: "relative" }}>
            {iconBtn(
              () => setShowMenu(s => !s), "Mais opções", C.tx3,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>
              </svg>
            )}
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 140 }} />
                <div style={{ position: "absolute", top: 38, right: 0, background: C.card, border: "0.5px solid " + C.brd2, borderRadius: 8, padding: 4, minWidth: 148, boxShadow: "0 4px 16px #0008", zIndex: 150 }}>
                  <div
                    onClick={() => { createNote(null); setShowMenu(false); }}
                    style={{ padding: "9px 12px", borderRadius: 5, cursor: "pointer", fontSize: 12, color: C.tx2, display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Nota rápida
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Campo de busca */}
      {showSearch && (
        <div style={{ padding: "8px 10px", borderBottom: "0.5px solid " + C.brd, flexShrink: 0 }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar em notas..."
            style={{ width: "100%", padding: "6px 10px", background: C.card, border: "1px solid " + C.brd2, borderRadius: 6, color: C.tx, fontSize: 11, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* Área scrollável: pastas + notas */}
      <div
        data-folder-id="root"
        onDragOver={(e) => { e.preventDefault(); if (dragOverId !== "root") setDragOverId("root"); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null); }}
        onDrop={(e) => { e.preventDefault(); handleDrop("root"); }}
        style={{
          flex: 1, overflowY: "auto", paddingBottom: 20,
          background: dragOverId === "root" ? C.gold + "06" : "transparent",
          transition: "background .1s",
        }}
      >
        {search.trim() ? (
          (() => {
            const q = search.toLowerCase();
            const res = allNotes.filter(n =>
              (n.title || "").toLowerCase().includes(q) ||
              (n.content || "").toLowerCase().includes(q)
            );
            return res.length > 0
              ? res.map(n => renderNoteRow(n, 0))
              : <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: C.tx4 }}>Nenhum resultado</div>;
          })()
        ) : (
          <>
            {rootFolders.map(f => renderFolderRow(f, 0))}
            {looseNotes.length > 0 && rootFolders.length > 0 && (
              <div style={{ fontSize: 10, color: C.tx4, padding: "8px 10px 2px", textTransform: "uppercase", letterSpacing: 0.8 }}>
                Sem pasta
              </div>
            )}
            {looseNotes.map(n => renderNoteRow(n, 0))}
            {allNotes.length === 0 && allFolders.length === 0 && (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div style={{ fontSize: 12, color: C.tx3, marginBottom: 3 }}>Nenhuma nota ainda</div>
                <div style={{ fontSize: 11, color: C.tx4 }}>Use + para criar a primeira nota</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  /* ── EDITOR (função, não componente) ── */
  const renderEditor = () => {
    if (!selNote) return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: C.tx4 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.tx4 + "70"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span style={{ fontSize: 12 }}>Selecione ou crie uma nota</span>
      </div>
    );

    const folder = selNote.folderId ? allFolders.find(f => f.id === selNote.folderId) : null;

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Barra superior do editor */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderBottom: "0.5px solid " + C.brd, flexShrink: 0 }}>
          {!isDesktop && (
            <span onClick={() => setMobileView("sidebar")} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, minWidth: 36, minHeight: 36, justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </span>
          )}
          <input
            key={selNote.id + "_title"}
            defaultValue={selNote.title || ""}
            onBlur={(e) => updateNoteField(selNote.id, "title", e.target.value)}
            onChange={(e) => updateNoteField(selNote.id, "title", e.target.value)}
            placeholder="Título da nota"
            style={{ flex: 1, background: "transparent", border: "none", color: C.tx, fontSize: 14, fontWeight: 500, outline: "none", padding: 0, minWidth: 0 }}
          />
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {iconBtn(() => downloadNote(selNote), "Download .md", C.tx3,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            {iconBtn(() => setShowMoveModal(selNote.id), "Mover para pasta", C.tx3,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            )}
            {iconBtn(() => setConfirmDelete({ type: "note", id: selNote.id, name: selNote.title || "Sem título" }), "Excluir", C.tx4,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            )}
          </div>
        </div>

        {/* Breadcrumb da pasta */}
        {folder && (
          <div style={{ padding: "4px 14px", fontSize: 10, color: C.tx4, borderBottom: "0.5px solid " + C.brd + "40", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {folder.name}
          </div>
        )}

        {/* Textarea — defaultValue + onBlur para não perder foco */}
        <textarea
          key={selNote.id + "_content"}
          defaultValue={selNote.content || ""}
          onBlur={(e) => updateNoteField(selNote.id, "content", e.target.value)}
          placeholder="Comece a escrever..."
          style={{
            flex: 1, padding: "14px 16px",
            background: "transparent", border: "none",
            color: C.tx, fontSize: 13,
            fontFamily: "'Segoe UI', 'Helvetica Neue', system-ui, sans-serif",
            lineHeight: 1.8, outline: "none", resize: "none", overflow: "auto",
          }}
        />

        {/* Rodapé */}
        <div style={{ padding: "5px 14px", borderTop: "0.5px solid " + C.brd, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.tx4, flexShrink: 0 }}>
          <span>{(selNote.content || "").length} caracteres</span>
          <span>{selNote.updatedAt ? fmtD(selNote.updatedAt) : ""}</span>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════
     LAYOUT PRINCIPAL
  ══════════════════════════════════════════ */
  return (
    <div
      style={{
        height: isDesktop ? "100vh" : "calc(100vh - 56px)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {isDesktop ? (
          <>{renderSidebar()}{renderEditor()}</>
        ) : (
          mobileView === "sidebar" ? renderSidebar() : renderEditor()
        )}
      </div>

      {/* Mini-carta flutuante durante drag touch */}
      {dragPos && touchRef.current?.active && (
        <div style={{
          position: "fixed",
          left: dragPos.x - 55, top: dragPos.y - 18,
          pointerEvents: "none", zIndex: 9999,
          background: C.card, border: "1px solid " + C.goldBrd,
          borderRadius: 6, padding: "5px 10px",
          fontSize: 11, color: C.gold,
          boxShadow: "0 4px 16px #0009",
          maxWidth: 130, opacity: 0.92,
          transform: "scale(0.82) rotate(-2deg)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {touchRef.current.label || "Item"}
        </div>
      )}

      {/* ─── Modais ─── */}

      {/* Nova pasta */}
      {showNewFolder && (
        <Modal>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 10 }}>Nova pasta</div>
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
            placeholder="Nome da pasta"
            style={{ width: "100%", padding: "8px 10px", background: C.bg, border: "1px solid " + C.brd2, borderRadius: 6, color: C.tx, fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn primary onClick={createFolder} style={{ flex: 1 }}>Criar</Btn>
          </div>
        </Modal>
      )}

      {/* Mover nota */}
      {showMoveModal && (() => {
        const note = allNotes.find(n => n.id === showMoveModal);
        if (!note) return null;
        return (
          <Modal>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 4 }}>Mover nota</div>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 10 }}>{note.title || "Sem título"}</div>
            <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
              <div
                onClick={() => moveNote(showMoveModal, null)}
                style={{ padding: "8px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12, marginBottom: 2, color: !note.folderId ? C.gold : C.tx2, background: !note.folderId ? C.gold + "10" : "transparent" }}
              >
                Sem pasta
              </div>
              {allFolders.map(f => (
                <div key={f.id}
                  onClick={() => moveNote(showMoveModal, f.id)}
                  style={{ padding: "8px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12, marginBottom: 2, display: "flex", alignItems: "center", gap: 6, color: note.folderId === f.id ? C.gold : C.tx2, background: note.folderId === f.id ? C.gold + "10" : "transparent" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  {f.name}
                </div>
              ))}
            </div>
            <Btn onClick={() => setShowMoveModal(null)} style={{ width: "100%" }}>Cancelar</Btn>
          </Modal>
        );
      })()}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <Modal>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 4 }}>
              Excluir {confirmDelete.type === "folder" ? "pasta" : "nota"}?
            </div>
            <div style={{ fontSize: 11, color: C.tx3 }}>{confirmDelete.name}</div>
            {confirmDelete.type === "folder" && (
              <div style={{ fontSize: 11, color: C.tx4, marginTop: 4 }}>As notas serão movidas para "Sem pasta".</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setConfirmDelete(null)} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn danger onClick={() => confirmDelete.type === "folder" ? deleteFolder(confirmDelete.id) : deleteNote(confirmDelete.id)} style={{ flex: 1 }}>
              Excluir
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
