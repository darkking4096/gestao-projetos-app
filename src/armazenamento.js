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

/* ── Social features ── */
export const Social = {
  async syncProfile({ username, totalXp, streak, tasksCompleted, projectsCompleted, objectivesCount, equippedIcon, equippedBorder, equippedTitle, equippedTheme, upgradeLevels }) {
    const user = await Auth.getUser();
    if (!user || !username) return;
    try {
      await supabase.from('user_profiles').upsert({
        user_id: user.id, username,
        xp: totalXp || 0, streak: streak || 0,
        tasks_completed: tasksCompleted || 0, projects_completed: projectsCompleted || 0,
        objectives_count: objectivesCount || 0,
        equipped_icon: equippedIcon || 'i_estrela', equipped_border: equippedBorder || 'b_simples',
        equipped_title: equippedTitle || 't_iniciante', equipped_theme: equippedTheme || 'obsidiana',
        upgrade_levels: upgradeLevels || {}, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch(e) { /* silently fail */ }
  },
  async checkUsername(username) {
    try {
      const { data } = await supabase.from('user_profiles').select('user_id').eq('username', username).maybeSingle();
      return !data; // true = available
    } catch { return false; }
  },
  async setUsername(username, profileData) {
    const user = await Auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('user_profiles').upsert({
      user_id: user.id, username,
      xp: profileData.totalXp || 0, streak: profileData.streak || 0,
      tasks_completed: profileData.tasksCompleted || 0, projects_completed: profileData.projectsCompleted || 0,
      objectives_count: profileData.objectivesCount || 0,
      equipped_icon: profileData.equippedIcon || 'i_estrela', equipped_border: profileData.equippedBorder || 'b_simples',
      equipped_title: profileData.equippedTitle || 't_iniciante', equipped_theme: profileData.equippedTheme || 'obsidiana',
      upgrade_levels: profileData.upgradeLevels || {}, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
  },
  async searchUsers(query) {
    const user = await Auth.getUser();
    if (!user) return [];
    try {
      const { data } = await supabase.from('user_profiles')
        .select('user_id, username, xp, streak, tasks_completed, projects_completed, objectives_count, equipped_icon, equipped_border, equipped_title, upgrade_levels')
        .ilike('username', `${query}%`).neq('user_id', user.id).limit(8);
      return data || [];
    } catch { return []; }
  },
  async sendFriendRequest(receiverId) {
    const user = await Auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('friendships').insert({ sender_id: user.id, receiver_id: receiverId });
    if (error) throw error;
  },
  async getFriendships() {
    const user = await Auth.getUser();
    if (!user) return { friends: [], received: [], sent: [], userId: null };
    try {
      const { data } = await supabase.from('friendships').select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (!data) return { friends: [], received: [], sent: [], userId: user.id };
      return {
        userId: user.id,
        friends: data.filter(f => f.status === 'accepted'),
        received: data.filter(f => f.status === 'pending' && f.receiver_id === user.id),
        sent: data.filter(f => f.status === 'pending' && f.sender_id === user.id),
      };
    } catch { return { friends: [], received: [], sent: [], userId: user.id }; }
  },
  async acceptFriendRequest(id) {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    if (error) throw error;
  },
  async removeFriendship(id) {
    const { error } = await supabase.from('friendships').delete().eq('id', id);
    if (error) throw error;
  },
  async getProfiles(userIds) {
    if (!userIds || !userIds.length) return [];
    try {
      const { data } = await supabase.from('user_profiles').select('*').in('user_id', userIds);
      return data || [];
    } catch { return []; }
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
