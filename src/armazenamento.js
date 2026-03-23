/* ═══ STORAGE ═══ */
export const S = {
  async get(k) {
    try {
      const val = localStorage.getItem("app_" + k);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(k, v) {
    try {
      localStorage.setItem("app_" + k, JSON.stringify(v));
    } catch {
      window.dispatchEvent(new CustomEvent("app:storageError"));
    }
  },
};
