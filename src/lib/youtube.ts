import type { Song } from './types';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function searchSongs(query: string, limit = 15): Promise<Song[]> {
  const url = `${API_URL}?q=${encodeURIComponent(query)}&limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  const results: Song[] = (data.results || []).map((r: any) => ({
    videoId: r.videoId,
    title: r.title,
    artist: r.artist,
    thumbnail: r.thumbnail,
    duration: r.duration || 0,
  }));

  return results;
}
