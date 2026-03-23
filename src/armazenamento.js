/* ═══ STORAGE ═══ */
export const S = {
  async get(k) {
    if (!window.storage) return null;
    try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(k, v) {
    if (!window.storage) return;
    try { await window.storage.set(k, JSON.stringify(v)); } catch { window.dispatchEvent(new CustomEvent("app:storageError")); }
  },
};
