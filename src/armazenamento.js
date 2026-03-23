/* ═══ STORAGE — Supabase ═══ */
import { createClient } from '@supabase/supabase-js';

// Estas constantes serão substituídas pelas credenciais reais do Supabase
const SUPABASE_URL = "https://ersisusnwmxkdvatynvn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dziqIYjdAn-uaqSroTXUdg_ZiO7tAjO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Auth helpers ── */
export const Auth = {
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  },
};

/* ── Data storage ── */
export const S = {
  async get(k) {
    const user = await Auth.getUser();
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', k)
        .maybeSingle();
      if (error) throw error;
      return data ? JSON.parse(data.value) : null;
    } catch { return null; }
  },
  async set(k, v) {
    const user = await Auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ user_id: user.id, key: k, value: JSON.stringify(v) }, { onConflict: 'user_id,key' });
      if (error) throw error;
    } catch {
      window.dispatchEvent(new CustomEvent("app:storageError"));
    }
  },
};
