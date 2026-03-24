-- ══════════════════════════════════════════════════════
-- Social features — Atividades App
-- Cole TUDO isso no SQL Editor do Supabase e execute
-- ══════════════════════════════════════════════════════

-- 1. Perfis públicos (username, XP, estatísticas, cosméticos)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT        UNIQUE NOT NULL,
  xp                  INTEGER     NOT NULL DEFAULT 0,
  streak              INTEGER     NOT NULL DEFAULT 0,
  tasks_completed     INTEGER     NOT NULL DEFAULT 0,
  projects_completed  INTEGER     NOT NULL DEFAULT 0,
  objectives_count    INTEGER     NOT NULL DEFAULT 0,
  equipped_icon       TEXT        DEFAULT 'i_estrela',
  equipped_border     TEXT        DEFAULT 'b_simples',
  equipped_title      TEXT        DEFAULT 't_iniciante',
  equipped_theme      TEXT        DEFAULT 'obsidiana',
  upgrade_levels      JSONB       DEFAULT '{}',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read profiles"
  ON user_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 2. Amizades (convites + amigos aceitos)
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own friendships"
  ON friendships FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users send friend requests"
  ON friendships FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receiver accepts request"
  ON friendships FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid());

CREATE POLICY "Either party can remove"
  ON friendships FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
