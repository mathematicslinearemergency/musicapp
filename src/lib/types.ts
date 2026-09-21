export interface Song {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // seconds
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_color: string;
  created_at: string;
  song_count?: number;
}

export interface PlaylistSong extends Song {
  id: string;
  playlist_id: string;
  position: number;
  added_at: string;
}

export interface LikedSong extends Song {
  id: string;
  liked_at: string;
}

export type View = 'home' | 'search' | 'liked' | 'playlist' | 'recent';

export interface RepeatMode {
  mode: 'off' | 'all' | 'one';
}

export type Page = { view: View; playlistId?: string };
