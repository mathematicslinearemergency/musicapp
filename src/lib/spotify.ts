import type { Song } from './types';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-import`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface SpotifyImportResult {
  type: string;
  totalTracks: number;
  matched: MatchedSong[];
  notFound: { title: string; artist: string }[];
}

export interface MatchedSong extends Song {
  spotifyTitle: string;
  spotifyArtist: string;
}

export async function importFromSpotify(spotifyUrl: string): Promise<SpotifyImportResult> {
  const url = `${API_URL}?url=${encodeURIComponent(spotifyUrl)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Import failed (${response.status})`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data as SpotifyImportResult;
}
