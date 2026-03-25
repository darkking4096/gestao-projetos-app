import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C } from '../temas.js';
import { uid, td, fmtD } from '../utilidades.js';
import { Btn, Modal, TopBar } from '../componentes-base.jsx';

/* ═══ RELATÓRIOS — Sistema de Notas Pessoal ═══ */

function ReportsTab({ notes, folders, onUpdateNotes, onUpdateFolders }) {
  const [selNoteId, setSelNoteId] = useState(null);
  const [selFolderId, setSelFolderId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [nameVal, setNameVal] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragId, setDragId] = useState(null);
  const [dragType, setDragType] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showMoveModal, setShowMoveModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const editorRef = useRef(null);
  const isDesktop = window.innerWidth >= 768;

  const allNotes = notes || [];
  const allFolders = folders || [];

  const selNote = useMemo(() => allNotes.find(n => n.id === selNoteId), [allNotes, selNoteId]);

  // Notes in current folder or loose
  const visibleNotes = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return allNotes.filter(n =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q)
      );
    }
    if (selFolderId) return allNotes.filter(n => n.folderId === selFolderId);
    return allNotes;
  }, [allNotes, selFolderId, search]);

  // Loose notes (no folder)
  const looseNotes = useMemo(() => allNotes.filter(n => !n.folderId), [allNotes]);

  // Folder notes count
  const folderCount = useCallback((fId) => allNotes.filter(n => n.folderId === fId).length, [allNotes]);

  // Sub-folders
  const subFolders = useCallback((parentId) => allFolders.filter(f => f.parentId === parentId), [allFolders]);
  const rootFolders = useMemo(() => allFolders.filter(f => !f.parentId), [allFolders]);

  /* ── CRUD ── */
  const createNote = (folderId = null) => {
    const note = { id: uid(), title: "", content: "", folderId, createdAt: td(), updatedAt: td() };
    onUpdateNotes([...allNotes, note]);
    setSelNoteId(note.id);
    setSelFolderId(folderId);
    if (!isDesktop) setSidebarOpen(false);
  };

  const createQuickNote = () => {
    createNote(null);
    setShowMenu(false);
  };

  const updateNote = (id, changes) => {
    onUpdateNotes(allNotes.map(n => n.id === id ? { ...n, ...changes, updatedAt: td() } : n));
  };

  const deleteNote = (id) => {
    onUpdateNotes(allNotes.filter(n => n.id !== id));
    if (selNoteId === id) setSelNoteId(null);
    setConfirmDelete(null);
  };

  const createFolder = (parentId = null) => {
    if (!newFolderName.trim()) return;
    const folder = { id: uid(), name: newFolderName.trim(), parentId, createdAt: td() };
    onUpdateFolders([...allFolders, folder]);
    setShowNewFolder(false);
    setNewFolderName("");
  };

  const renameFolder = (id, name) => {
    onUpdateFolders(allFolders.map(f => f.id === id ? { ...f, name } : f));
    setEditingName(null);
  };

  const deleteFolder = (id) => {
    // Move notes to loose, delete sub-folders recursively
    const idsToDelete = new Set();
    const collectIds = (fId) => {
      idsToDelete.add(fId);
      allFolders.filter(f => f.parentId === fId).forEach(f => collectIds(f.id));
    };
    collectIds(id);
    onUpdateFolders(allFolders.filter(f => !idsToDelete.has(f.id)));
    onUpdateNotes(allNotes.map(n => idsToDelete.has(n.folderId) ? { ...n, folderId: null } : n));
    setConfirmDelete(null);
    if (selFolderId === id) setSelFolderId(null);
  };

  const moveNote = (noteId, targetFolderId) => {
    onUpdateNotes(allNotes.map(n => n.id === noteId ? { ...n, folderId: targetFolderId || null, updatedAt: td() } : n));
    setShowMoveModal(null);
  };

  /* ── Drag & Drop (mobile touch + desktop mouse) ── */
  const handleDragStart = (e, id, type) => {
    setDragId(id);
    setDragType(type);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    }
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    setDragOver(targetId);
  };

  const handleDrop = (e, targetFolderId) => {
    e.preventDefault();
    if (dragId && dragType === "note") {
      moveNote(dragId, targetFolderId);
    }
    setDragId(null);
    setDragType(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragType(null);
    setDragOver(null);
  };

  /* ── Download ── */
  const downloadNote = (note) => {
    const filename = (note.title || "nota-sem-titulo").replace(/[^a-zA-Z0-9\u00C0-\u024F\- ]/g, "_") + ".md";
    const blob = new Blob([note.content || ""], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Toggle folder ── */
  const toggleFolder = (fId) => {
    setExpandedFolders(e => ({ ...e, [fId]: !e[fId] }));
  };

  /* ── Render folder tree recursively ── */
  const renderFolder = (folder, depth = 0) => {
    const isOpen = expandedFolders[folder.id] !== false;
    const isSelected = selFolderId === folder.id;
    const isDragTarget = dragOver === folder.id;
    const children = subFolders(folder.id);
    const noteCount = folderCount(folder.id);
    const isEditing = editingName === folder.id;

    return (
      <div key={folder.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, folder.id, "folder")}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragEnd={handleDragEnd}
          onClick={() => { setSelFolderId(isSelected ? null : folder.id); setSelNoteId(null); }}
          onContextMenu={(e) => { e.preventDefault(); setEditingName(folder.id); setNameVal(folder.name); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 10px", paddingLeft: 10 + depth * 16,
            cursor: "pointer", fontSize: 12,
            background: isDragTarget ? C.gold + "15" : isSelected ? C.gold + "10" : "transparent",
            color: isSelected ? C.gold : C.tx2,
            borderLeft: "2px solid " + (isSelected ? C.gold : "transparent"),
            transition: "background .12s, color .12s, border-color .12s",
          }}
        >
          <svg onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          {isEditing ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => { if (nameVal.trim()) renameFolder(folder.id, nameVal.trim()); else setEditingName(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { if (nameVal.trim()) renameFolder(folder.id, nameVal.trim()); } if (e.key === "Escape") setEditingName(null); }}
              onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, background: C.bg, border: "1px solid " + C.goldBrd, borderRadius: 3, color: C.tx, fontSize: 11, padding: "2px 4px", outline: "none" }}
            />
          ) : (
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
          )}
          <span style={{ fontSize: 10, color: C.tx4, flexShrink: 0 }}>{noteCount}</span>
        </div>
        {isOpen && children.map(child => renderFolder(child, depth + 1))}
        {isOpen && isSelected && allNotes.filter(n => n.folderId === folder.id).map(n => renderNoteItem(n, depth + 1))}
      </div>
    );
  };

  const renderNoteItem = (note, depth = 0) => {
    const isSelected = selNoteId === note.id;
    const isDragging = dragId === note.id;
    return (
      <div
        key={note.id}
        draggable
        onDragStart={(e) => handleDragStart(e, note.id, "note")}
        onDragEnd={handleDragEnd}
        onClick={() => { setSelNoteId(note.id); if (!isDesktop) setSidebarOpen(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", paddingLeft: 10 + depth * 16 + 14,
          cursor: "pointer", fontSize: 11,
          background: isSelected ? C.gold + "10" : "transparent",
          color: isSelected ? C.gold : C.tx3,
          opacity: isDragging ? 0.4 : 1,
          borderLeft: "2px solid " + (isSelected ? C.gold + "60" : "transparent"),
          transition: "background .12s, opacity .12s",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {note.title || "Sem título"}
        </span>
      </div>
    );
  };

  /* ── Mobile: back to sidebar ── */
  const backToSidebar = () => {
    setSidebarOpen(true);
    setSelNoteId(null);
  };

  /* ── SIDEBAR ── */
  const Sidebar = () => (
    <div style={{
      width: isDesktop ? 240 : "100%",
      minWidth: isDesktop ? 240 : undefined,
      height: "100%",
      background: C.bg,
      borderRight: isDesktop ? "0.5px solid " + C.brd : "none",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.tx }}>Relatórios</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span onClick={() => setShowSearch(!showSearch)} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: showSearch ? C.gold : C.tx3 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <span onClick={() => setShowNewFolder(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx3 }} title="Nova pasta">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </span>
          <span onClick={() => createNote(selFolderId)} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx3 }} title="Nova nota">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </span>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div style={{ padding: "0 12px 8px" }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notas..."
            style={{ width: "100%", padding: "6px 10px", background: C.card, border: "1px solid " + C.brd2, borderRadius: 6, color: C.tx, fontSize: 11, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* Folder tree + notes */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver("root"); }}
        onDrop={(e) => handleDrop(e, null)}
      >
        {search.trim() ? (
          /* Search results */
          visibleNotes.length > 0 ? visibleNotes.map(n => renderNoteItem(n, 0)) : (
            <div style={{ padding: "20px 12px", textAlign: "center", color: C.tx4, fontSize: 11 }}>Nenhum resultado</div>
          )
        ) : (
          <>
            {rootFolders.map(f => renderFolder(f))}
            {/* Loose notes at bottom */}
            {looseNotes.length > 0 && (
              <div style={{ marginTop: rootFolders.length > 0 ? 6 : 0 }}>
                {rootFolders.length > 0 && <div style={{ fontSize: 10, color: C.tx4, padding: "6px 12px 2px", textTransform: "uppercase", letterSpacing: 0.8 }}>Sem pasta</div>}
                {looseNotes.map(n => renderNoteItem(n, 0))}
              </div>
            )}
            {allNotes.length === 0 && allFolders.length === 0 && (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>Nenhuma nota</div>
                <div style={{ fontSize: 11, color: C.tx4, lineHeight: 1.5 }}>Crie sua primeira nota ou pasta para começar.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  /* ── EDITOR ── */
  const Editor = () => {
    if (!selNote) return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.tx4, fontSize: 12 }}>
        <div style={{ textAlign: "center" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.tx4 + "80"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Selecione ou crie uma nota
        </div>
      </div>
    );

    const folder = selNote.folderId ? allFolders.find(f => f.id === selNote.folderId) : null;

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "0.5px solid " + C.brd, flexShrink: 0 }}>
          {!isDesktop && (
            <span onClick={backToSidebar} style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </span>
          )}
          <input
            value={selNote.title || ""}
            onChange={(e) => updateNote(selNote.id, { title: e.target.value })}
            placeholder="Título da nota"
            style={{ flex: 1, background: "transparent", border: "none", color: C.tx, fontSize: 14, fontWeight: 500, outline: "none", padding: 0 }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {/* Download */}
            <span onClick={() => downloadNote(selNote)} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx3 }} title="Download .md">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </span>
            {/* Move */}
            <span onClick={() => setShowMoveModal(selNote.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx3 }} title="Mover">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </span>
            {/* Delete */}
            <span onClick={() => setConfirmDelete({ type: "note", id: selNote.id, name: selNote.title || "Sem título" })} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx4 }} title="Excluir">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </span>
          </div>
        </div>
        {/* Breadcrumb */}
        {folder && (
          <div style={{ padding: "4px 14px", fontSize: 10, color: C.tx4 }}>
            {folder.name}
          </div>
        )}
        {/* Editor area */}
        <textarea
          ref={editorRef}
          value={selNote.content || ""}
          onChange={(e) => updateNote(selNote.id, { content: e.target.value })}
          placeholder="Comece a escrever..."
          style={{
            flex: 1, padding: "12px 14px", background: "transparent",
            border: "none", color: C.tx, fontSize: 13, fontFamily: "'Segoe UI','Helvetica Neue',system-ui,monospace",
            lineHeight: 1.7, outline: "none", resize: "none", overflow: "auto",
          }}
        />
        {/* Footer info */}
        <div style={{ padding: "6px 14px", borderTop: "0.5px solid " + C.brd, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.tx4, flexShrink: 0 }}>
          <span>{(selNote.content || "").length} caracteres</span>
          <span>{selNote.updatedAt ? fmtD(selNote.updatedAt) : ""}</span>
        </div>
      </div>
    );
  };

  /* ── New folder modal ── */
  const NewFolderModal = () => (
    <Modal>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 10 }}>Nova pasta</div>
      <input
        autoFocus
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        placeholder="Nome da pasta"
        onKeyDown={(e) => { if (e.key === "Enter") createFolder(selFolderId); if (e.key === "Escape") setShowNewFolder(false); }}
        style={{ width: "100%", padding: "8px 10px", background: C.bg, border: "1px solid " + C.brd2, borderRadius: 6, color: C.tx, fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn primary onClick={() => createFolder(selFolderId)} style={{ flex: 1 }}>Criar</Btn>
      </div>
    </Modal>
  );

  /* ── Move modal ── */
  const MoveModal = () => {
    const noteToMove = allNotes.find(n => n.id === showMoveModal);
    if (!noteToMove) return null;
    return (
      <Modal>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 4 }}>Mover nota</div>
        <div style={{ fontSize: 11, color: C.tx3, marginBottom: 12 }}>{noteToMove.title || "Sem título"}</div>
        <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
          <div
            onClick={() => moveNote(showMoveModal, null)}
            style={{ padding: "8px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12, color: !noteToMove.folderId ? C.gold : C.tx2, background: !noteToMove.folderId ? C.gold + "10" : "transparent", marginBottom: 2 }}
          >
            Sem pasta (solto)
          </div>
          {allFolders.map(f => (
            <div
              key={f.id}
              onClick={() => moveNote(showMoveModal, f.id)}
              style={{ padding: "8px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12, color: noteToMove.folderId === f.id ? C.gold : C.tx2, background: noteToMove.folderId === f.id ? C.gold + "10" : "transparent", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              {f.name}
            </div>
          ))}
        </div>
        <Btn onClick={() => setShowMoveModal(null)} style={{ width: "100%" }}>Cancelar</Btn>
      </Modal>
    );
  };

  /* ── Confirm delete ── */
  const DeleteConfirm = () => {
    if (!confirmDelete) return null;
    return (
      <Modal>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 4 }}>
            Excluir {confirmDelete.type === "folder" ? "pasta" : "nota"}?
          </div>
          <div style={{ fontSize: 11, color: C.tx3 }}>{confirmDelete.name}</div>
          {confirmDelete.type === "folder" && <div style={{ fontSize: 11, color: C.tx4, marginTop: 4 }}>As notas serão movidas para "Sem pasta".</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setConfirmDelete(null)} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn danger onClick={() => confirmDelete.type === "folder" ? deleteFolder(confirmDelete.id) : deleteNote(confirmDelete.id)} style={{ flex: 1 }}>Excluir</Btn>
        </div>
      </Modal>
    );
  };

  /* ── MAIN LAYOUT ── */
  return (
    <div style={{ height: isDesktop ? "calc(100vh - 0px)" : "calc(100vh - 56px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 3-dot menu for quick note */}
      <div style={{ position: "fixed", top: isDesktop ? 12 : 10, right: isDesktop ? 16 : 12, zIndex: 150 }}>
        <div onClick={() => setShowMenu(!showMenu)} style={{ width: 32, height: 32, borderRadius: 8, background: C.card, border: "0.5px solid " + C.brd, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </div>
        {showMenu && (
          <div style={{ position: "absolute", top: 36, right: 0, background: C.card, border: "0.5px solid " + C.brd, borderRadius: 8, padding: 4, minWidth: 160, boxShadow: "0 4px 16px #0008", zIndex: 160 }}>
            <div onClick={createQuickNote} style={{ padding: "8px 12px", borderRadius: 5, cursor: "pointer", fontSize: 12, color: C.tx2, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Nota rápida
            </div>
            <div onClick={() => { setShowNewFolder(true); setShowMenu(false); }} style={{ padding: "8px 12px", borderRadius: 5, cursor: "pointer", fontSize: 12, color: C.tx2, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              Nova pasta
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {isDesktop ? (
          <>
            <Sidebar />
            <Editor />
          </>
        ) : (
          sidebarOpen ? <Sidebar /> : <Editor />
        )}
      </div>

      {/* Modals */}
      {showNewFolder && <NewFolderModal />}
      {showMoveModal && <MoveModal />}
      {confirmDelete && <DeleteConfirm />}

      {/* Click-away for menu */}
      {showMenu && <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 140 }} />}
    </div>
  );
}

export default ReportsTab;
