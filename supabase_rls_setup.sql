-- ================================================================
-- RLS SETUP — Gestão Projetos Gamificado
-- Execute no SQL Editor do Supabase (Settings → SQL Editor)
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS / OR REPLACE)
-- ================================================================

-- ----------------------------------------------------------------
-- SEÇÃO 1: ESTRUTURA DAS TABELAS
-- Garante que as tabelas existem com as colunas corretas.
-- Se já existirem, o IF NOT EXISTS evita erros.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_data (
  user_id  UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key      TEXT    NOT NULL,
  value    TEXT    NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT        NOT NULL,
  xp                  INTEGER     NOT NULL DEFAULT 0,
  streak              INTEGER     NOT NULL DEFAULT 0,
  tasks_completed     INTEGER     NOT NULL DEFAULT 0,
  projects_completed  INTEGER     NOT NULL DEFAULT 0,
  objectives_count    INTEGER     NOT NULL DEFAULT 0,
  equipped_icon       TEXT        NOT NULL DEFAULT 'i_estrela',
  equipped_border     TEXT        NOT NULL DEFAULT 'b_simples',
  equipped_title      TEXT        NOT NULL DEFAULT 't_iniciante',
  equipped_theme      TEXT        NOT NULL DEFAULT 'obsidiana',
  upgrade_levels      JSONB       NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id),
  CONSTRAINT username_unique UNIQUE (username),
  -- Cliente valida: min 3, max 20, /[^a-z0-9_.]/g removido (ver configuracoes.jsx:430)
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_.]+$')
);

CREATE TABLE IF NOT EXISTS friendships (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  sender_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  -- Impede auto-amizade
  CONSTRAINT no_self_friendship CHECK (sender_id != receiver_id),
  -- Impede pedidos duplicados na mesma direção
  CONSTRAINT unique_friendship UNIQUE (sender_id, receiver_id)
);

-- ----------------------------------------------------------------
-- SEÇÃO 2: ÍNDICES DE PERFORMANCE
-- ----------------------------------------------------------------

-- app_data: queries por user_id são frequentes (getAll usa IN + eq user_id)
CREATE INDEX IF NOT EXISTS idx_app_data_user_id ON app_data(user_id);

-- user_profiles: busca por username com ILIKE
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- friendships: busca por sender OU receiver (OR query no getFriendships)
CREATE INDEX IF NOT EXISTS idx_friendships_sender ON friendships(sender_id);
CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON friendships(receiver_id);

-- ----------------------------------------------------------------
-- SEÇÃO 3: HABILITAR RLS EM TODAS AS TABELAS
-- RLS desabilitado = qualquer usuário autenticado acessa tudo.
-- ----------------------------------------------------------------

ALTER TABLE app_data      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships   ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- SEÇÃO 4: LIMPAR POLÍTICAS ANTIGAS
-- Evita conflito se o script for executado mais de uma vez.
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "app_data_select_own"   ON app_data;
DROP POLICY IF EXISTS "app_data_insert_own"   ON app_data;
DROP POLICY IF EXISTS "app_data_update_own"   ON app_data;

DROP POLICY IF EXISTS "profiles_select_any"   ON user_profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON user_profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON user_profiles;

DROP POLICY IF EXISTS "friendships_select_own"   ON friendships;
DROP POLICY IF EXISTS "friendships_insert_own"   ON friendships;
DROP POLICY IF EXISTS "friendships_update_receiver" ON friendships;
DROP POLICY IF EXISTS "friendships_delete_own"   ON friendships;

-- ================================================================
-- SEÇÃO 5: POLÍTICAS POR TABELA
-- ================================================================

-- ----------------------------------------------------------------
-- 5.1  app_data — dados privados do usuário
--
-- Acesso: APENAS o próprio usuário. Nunca exposto publicamente.
-- Queries do app: S.get(), S.getAll(), S.set() (upsert)
-- ----------------------------------------------------------------

-- Usuário lê APENAS seus próprios dados
CREATE POLICY "app_data_select_own" ON app_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário insere APENAS com seu próprio user_id
CREATE POLICY "app_data_insert_own" ON app_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuário atualiza APENAS seus próprios dados
-- (cobre o upsert: onConflict 'user_id,key' usa UPDATE)
CREATE POLICY "app_data_update_own" ON app_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nota: DELETE não é usado pelo app (dados só são sobrescritos via upsert).
-- Se precisar no futuro: CREATE POLICY "app_data_delete_own" ON app_data
--   FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 5.2  user_profiles — perfil público para sistema social
--
-- SELECT: qualquer usuário autenticado pode ver (busca, amigos)
-- INSERT/UPDATE: apenas o próprio usuário pode editar seu perfil
-- Queries do app:
--   SELECT: checkUsername(), searchUsers(), getProfiles()
--   UPSERT: syncProfile(), setUsername()
-- ----------------------------------------------------------------

-- Qualquer usuário autenticado pode ler perfis (necessário para busca de amigos)
CREATE POLICY "profiles_select_any" ON user_profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Usuário insere APENAS seu próprio perfil
CREATE POLICY "profiles_insert_own" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuário atualiza APENAS seu próprio perfil
CREATE POLICY "profiles_update_own" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 5.3  friendships — relacionamentos entre usuários
--
-- SELECT: usuário vê friendships onde é sender OU receiver
-- INSERT: usuário só pode criar pedido onde ELE é o sender
-- UPDATE: APENAS o receiver pode aceitar (status → 'accepted')
-- DELETE: sender OU receiver podem remover/cancelar
--
-- Queries do app:
--   INSERT:  sendFriendRequest()
--   SELECT:  getFriendships()
--   UPDATE:  acceptFriendRequest()
--   DELETE:  removeFriendship()
-- ----------------------------------------------------------------

-- Ver apenas as friendships onde o usuário está envolvido
CREATE POLICY "friendships_select_own" ON friendships
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Só pode enviar pedido onde é o remetente (não pode forjar pedido de outro)
CREATE POLICY "friendships_insert_own" ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Só o RECEIVER pode aceitar um pedido (status pending → accepted)
-- Protege contra o sender aceitar seu próprio pedido ou aceitar pedidos alheios
CREATE POLICY "friendships_update_receiver" ON friendships
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Sender OU receiver podem remover a friendship (cancelar pedido ou desfazer amizade)
CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ================================================================
-- SEÇÃO 6: VERIFICAÇÃO
-- Execute após o setup para confirmar que tudo está ativo.
-- ================================================================

-- Lista tabelas com RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('app_data', 'user_profiles', 'friendships')
ORDER BY tablename;

-- Lista todas as policies criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('app_data', 'user_profiles', 'friendships')
ORDER BY tablename, cmd;

-- ================================================================
-- SEÇÃO 7: TESTE MANUAL (opcional, em sessão autenticada)
-- Troque '<SEU_USER_ID>' pelo UUID do seu usuário em auth.users
-- ================================================================

/*
-- 7.1 Simula acesso como usuário autenticado
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "<SEU_USER_ID>", "role": "authenticated"}';

-- 7.2 Deve retornar APENAS os dados do usuário acima
SELECT key FROM app_data;

-- 7.3 Deve retornar TODOS os perfis (leitura pública)
SELECT username FROM user_profiles LIMIT 5;

-- 7.4 Deve retornar APENAS friendships do usuário
SELECT * FROM friendships;

-- 7.5 Deve FALHAR (tentar inserir como outro usuário)
INSERT INTO app_data (user_id, key, value)
VALUES ('<OUTRO_USER_ID>', 'profile', '{}');
-- Erro esperado: "new row violates row-level security policy"
*/

-- ================================================================
-- SEÇÃO 8: NOTAS DE SEGURANÇA
-- ================================================================

/*
[1] ANON KEY no frontend é OK com RLS habilitado:
    A anon key dá acesso ao banco APENAS dentro das policies.
    Sem RLS, a anon key daria acesso total — por isso RLS é obrigatório.

[2] username_format CHECK constraint:
    Bloqueia usernames com caracteres especiais (XSS via username).
    Só permite letras, números e underscores.

[3] no_self_friendship CHECK constraint:
    Impede sender_id = receiver_id no banco, independente do cliente.

[4] unique_friendship UNIQUE (sender_id, receiver_id):
    Impede pedidos duplicados. Nota: não impede A→B e B→A simultâneos.
    Se precisar, adicionar: UNIQUE (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))

[5] groqApiKey no perfil:
    A chave de API da Groq está salva em app_data.profile (campo groqApiKey).
    RLS protege contra outros usuários lerem, mas o dado está em plaintext.
    Recomendação futura: criptografar com pgcrypto antes de salvar.

[6] Auth.getUser() por operação:
    O código atual chama Auth.getUser() a cada S.get/S.set.
    Com RLS ativo, o Supabase já valida auth.uid() no servidor —
    a chamada client-side é redundante para segurança (mas ainda gera overhead).
    Ver issue registrado: cachear user após login.
*/
