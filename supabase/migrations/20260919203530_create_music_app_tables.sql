/*
# Create music app tables (single-tenant, no auth)

## Overview
Creates the core data tables for a music streaming app that stores playlists,
liked songs, and recently played history. Since the app has no sign-in screen,
all tables use single-tenant (anon + authenticated) access policies.

## New Tables
1. `playlists` — user-created playlists
   - id (uuid, PK)
   - name (text, not null)
   - description (text, nullable)
   - cover_color (text, gradient color seed, default emerald)
   - created_at (timestamptz)

2. `playlist_songs` — songs within a playlist
   - id (uuid, PK)
   - playlist_id (uuid, FK to playlists, cascade delete)
   - video_id (text, YouTube video ID)
   - title (text)
   - artist (text)
   - thumbnail (text, image URL)
   - duration (integer, seconds)
   - position (integer, ordering)
   - added_at (timestamptz)

3. `liked_songs` — songs the user has liked
   - id (uuid, PK)
   - video_id (text, unique)
   - title (text)
   - artist (text)
   - thumbnail (text)
   - duration (integer, seconds)
   - liked_at (timestamptz)

4. `recent_plays` — recently played songs for history
   - id (uuid, PK)
   - video_id (text)
   - title (text)
   - artist (text)
   - thumbnail (text)
   - duration (integer, seconds)
   - played_at (timestamptz)

## Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` since there is no sign-in screen.
- All data is intentionally shared (single-tenant app).
*/

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_color text NOT NULL DEFAULT 'emerald',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_playlists" ON playlists;
CREATE POLICY "anon_select_playlists" ON playlists FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_playlists" ON playlists;
CREATE POLICY "anon_insert_playlists" ON playlists FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_playlists" ON playlists;
CREATE POLICY "anon_update_playlists" ON playlists FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_playlists" ON playlists;
CREATE POLICY "anon_delete_playlists" ON playlists FOR DELETE
  TO anon, authenticated USING (true);

-- Playlist songs table
CREATE TABLE IF NOT EXISTS playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  thumbnail text,
  duration integer DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_playlist_songs" ON playlist_songs;
CREATE POLICY "anon_select_playlist_songs" ON playlist_songs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_playlist_songs" ON playlist_songs;
CREATE POLICY "anon_insert_playlist_songs" ON playlist_songs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_playlist_songs" ON playlist_songs;
CREATE POLICY "anon_update_playlist_songs" ON playlist_songs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_playlist_songs" ON playlist_songs;
CREATE POLICY "anon_delete_playlist_songs" ON playlist_songs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlist_id, position);

-- Liked songs table
CREATE TABLE IF NOT EXISTS liked_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL UNIQUE,
  title text NOT NULL,
  artist text NOT NULL,
  thumbnail text,
  duration integer DEFAULT 0,
  liked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE liked_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_liked_songs" ON liked_songs;
CREATE POLICY "anon_select_liked_songs" ON liked_songs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_liked_songs" ON liked_songs;
CREATE POLICY "anon_insert_liked_songs" ON liked_songs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_liked_songs" ON liked_songs;
CREATE POLICY "anon_update_liked_songs" ON liked_songs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_liked_songs" ON liked_songs;
CREATE POLICY "anon_delete_liked_songs" ON liked_songs FOR DELETE
  TO anon, authenticated USING (true);

-- Recent plays table
CREATE TABLE IF NOT EXISTS recent_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  thumbnail text,
  duration integer DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recent_plays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_recent_plays" ON recent_plays;
CREATE POLICY "anon_select_recent_plays" ON recent_plays FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_recent_plays" ON recent_plays;
CREATE POLICY "anon_insert_recent_plays" ON recent_plays FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_recent_plays" ON recent_plays;
CREATE POLICY "anon_delete_recent_plays" ON recent_plays FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_recent_plays_played_at ON recent_plays(played_at DESC);
