import { supabase } from './supabase';
import type { Song, Playlist, PlaylistSong, LikedSong } from './types';

// ---- Playlists ----

export async function getPlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Get song counts
  const playlists = data || [];
  const withCounts = await Promise.all(
    playlists.map(async (p) => {
      const { count } = await supabase
        .from('playlist_songs')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', p.id);
      return { ...p, song_count: count || 0 };
    })
  );
  return withCounts;
}

export async function createPlaylist(name: string, description = '', coverColor = 'emerald'): Promise<Playlist> {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ name, description, cover_color: coverColor })
    .select('*')
    .single();
  if (error) throw error;
  return { ...data, song_count: 0 };
}

export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await supabase.from('playlists').delete().eq('id', id);
  if (error) throw error;
}

export async function updatePlaylist(id: string, updates: { name?: string; description?: string }): Promise<void> {
  const { error } = await supabase.from('playlists').update(updates).eq('id', id);
  if (error) throw error;
}

// ---- Playlist Songs ----

export async function getPlaylistSongs(playlistId: string): Promise<PlaylistSong[]> {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    playlist_id: r.playlist_id,
    position: r.position,
    added_at: r.added_at,
    videoId: r.video_id,
    title: r.title,
    artist: r.artist,
    thumbnail: r.thumbnail,
    duration: r.duration,
  }));
}

export async function addSongToPlaylist(playlistId: string, song: Song): Promise<void> {
  // Get next position
  const { data } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = (data && data.length > 0 ? data[0].position : -1) + 1;

  const { error } = await supabase.from('playlist_songs').insert({
    playlist_id: playlistId,
    video_id: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    duration: song.duration,
    position: nextPos,
  });
  if (error) throw error;
}

export async function addSongsToPlaylist(playlistId: string, songs: Song[]): Promise<void> {
  if (songs.length === 0) return;
  // Get current max position
  const { data } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  let pos = (data && data.length > 0 ? data[0].position : -1) + 1;

  // Get existing video IDs to skip duplicates
  const { data: existing } = await supabase
    .from('playlist_songs')
    .select('video_id')
    .eq('playlist_id', playlistId);
  const existingIds = new Set((existing || []).map((r) => r.video_id));

  const rows = songs
    .filter((s) => !existingIds.has(s.videoId))
    .map((s) => ({
      playlist_id: playlistId,
      video_id: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      duration: s.duration,
      position: pos++,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from('playlist_songs').insert(rows);
  if (error) throw error;
}

export async function removeSongFromPlaylist(songRowId: string): Promise<void> {
  const { error } = await supabase.from('playlist_songs').delete().eq('id', songRowId);
  if (error) throw error;
}

// ---- Liked Songs ----

export async function getLikedSongs(): Promise<LikedSong[]> {
  const { data, error } = await supabase
    .from('liked_songs')
    .select('*')
    .order('liked_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    liked_at: r.liked_at,
    videoId: r.video_id,
    title: r.title,
    artist: r.artist,
    thumbnail: r.thumbnail,
    duration: r.duration,
  }));
}

export async function isLiked(videoId: string): Promise<boolean> {
  const { data } = await supabase
    .from('liked_songs')
    .select('id')
    .eq('video_id', videoId)
    .maybeSingle();
  return !!data;
}

export async function likeSong(song: Song): Promise<void> {
  const { error } = await supabase.from('liked_songs').insert({
    video_id: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    duration: song.duration,
  });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function unlikeSong(videoId: string): Promise<void> {
  const { error } = await supabase.from('liked_songs').delete().eq('video_id', videoId);
  if (error) throw error;
}

// ---- Recent Plays ----

export async function getRecentPlays(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('recent_plays')
    .select('*')
    .order('played_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []).map((r) => ({
    videoId: r.video_id,
    title: r.title,
    artist: r.artist,
    thumbnail: r.thumbnail,
    duration: r.duration,
  }));
}
