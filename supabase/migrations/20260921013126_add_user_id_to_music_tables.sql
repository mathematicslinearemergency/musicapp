/*
# Add user_id columns and switch to per-user RLS

## Overview
Converts the music app from single-tenant to multi-user. Each table gets a
`user_id` column defaulting to `auth.uid()`, and all RLS policies become
ownership-scoped via `auth.uid() = user_id`.

## Steps
1. Add `user_id` as nullable column.
2. Delete any rows with NULL user_id (no auth user exists yet to claim them).
3. Set columns to NOT NULL with DEFAULT auth.uid().
4. Replace all RLS policies with authenticated-only ownership checks.
5. Add indexes on user_id.

## Security
- All policies: `TO authenticated` with `auth.uid() = user_id`.
- INSERT uses WITH CHECK, UPDATE uses both USING and WITH CHECK.
- `DEFAULT auth.uid()` lets frontend inserts omit user_id safely.
*/

-- Step 1: Add user_id as nullable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlists' AND column_name = 'user_id') THEN
    ALTER TABLE playlists ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_songs' AND column_name = 'user_id') THEN
    ALTER TABLE playlist_songs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'liked_songs' AND column_name = 'user_id') THEN
    ALTER TABLE liked_songs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recent_plays' AND column_name = 'user_id') THEN
    ALTER TABLE recent_plays ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: Delete rows with NULL user_id (no auth user exists to claim legacy data)
DELETE FROM playlist_songs WHERE user_id IS NULL;
DELETE FROM playlists WHERE user_id IS NULL;
DELETE FROM liked_songs WHERE user_id IS NULL;
DELETE FROM recent_plays WHERE user_id IS NULL;

-- Step 3: Set NOT NULL + DEFAULT auth.uid()
ALTER TABLE playlists ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE playlists ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE playlist_songs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE playlist_songs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE liked_songs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE liked_songs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE recent_plays ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE recent_plays ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Step 4: Replace all RLS policies
-- playlists
DROP POLICY IF EXISTS "anon_select_playlists" ON playlists;
DROP POLICY IF EXISTS "anon_insert_playlists" ON playlists;
DROP POLICY IF EXISTS "anon_update_playlists" ON playlists;
DROP POLICY IF EXISTS "anon_delete_playlists" ON playlists;

CREATE POLICY "select_own_playlists" ON playlists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_playlists" ON playlists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_playlists" ON playlists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_playlists" ON playlists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- playlist_songs
DROP POLICY IF EXISTS "anon_select_playlist_songs" ON playlist_songs;
DROP POLICY IF EXISTS "anon_insert_playlist_songs" ON playlist_songs;
DROP POLICY IF EXISTS "anon_update_playlist_songs" ON playlist_songs;
DROP POLICY IF EXISTS "anon_delete_playlist_songs" ON playlist_songs;

CREATE POLICY "select_own_playlist_songs" ON playlist_songs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_playlist_songs" ON playlist_songs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_playlist_songs" ON playlist_songs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_playlist_songs" ON playlist_songs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- liked_songs
DROP POLICY IF EXISTS "anon_select_liked_songs" ON liked_songs;
DROP POLICY IF EXISTS "anon_insert_liked_songs" ON liked_songs;
DROP POLICY IF EXISTS "anon_update_liked_songs" ON liked_songs;
DROP POLICY IF EXISTS "anon_delete_liked_songs" ON liked_songs;

CREATE POLICY "select_own_liked_songs" ON liked_songs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_liked_songs" ON liked_songs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_liked_songs" ON liked_songs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_liked_songs" ON liked_songs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- recent_plays
DROP POLICY IF EXISTS "anon_select_recent_plays" ON recent_plays;
DROP POLICY IF EXISTS "anon_insert_recent_plays" ON recent_plays;
DROP POLICY IF EXISTS "anon_delete_recent_plays" ON recent_plays;

CREATE POLICY "select_own_recent_plays" ON recent_plays FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_recent_plays" ON recent_plays FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_recent_plays" ON recent_plays FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Step 5: Indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_user_id ON playlist_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_user_id ON liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_plays_user_id ON recent_plays(user_id);
