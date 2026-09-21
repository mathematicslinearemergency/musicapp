import { useEffect, useState, useCallback } from 'react';
import { Play, Shuffle, Loader2, Trash2, Clock } from 'lucide-react';
import type { Song } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { getRecentPlays } from '@/lib/music';
import SongRow from '@/components/SongRow';

interface RecentViewProps {
  onAddToPlaylist: (song: Song) => void;
}

export default function RecentView({ onAddToPlaylist }: RecentViewProps) {
  const { playSong, toggleShuffle, shuffle } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getRecentPlays();
      setSongs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(songs[0], songs);
  };

  const handleShufflePlay = () => {
    if (songs.length === 0) return;
    if (!shuffle) toggleShuffle();
    const random = songs[Math.floor(Math.random() * songs.length)];
    playSong(random, songs);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-800 shadow-xl">
          <Clock size={56} className="text-white" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">History</p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-5xl">Recently Played</h1>
          <p className="text-sm text-ink-500">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Action bar */}
      {songs.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={handlePlayAll}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-105"
            aria-label="Play all"
          >
            <Play size={26} className="translate-x-0.5 fill-current" />
          </button>
          <button
            onClick={handleShufflePlay}
            className={`transition-colors ${
              shuffle ? 'text-brand-400' : 'text-ink-500 hover:text-white'
            }`}
            aria-label="Shuffle"
          >
            <Shuffle size={24} />
          </button>
        </div>
      )}

      {/* Songs */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-ink-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : songs.length === 0 ? (
        <div className="rounded-xl bg-ink-850 p-12 text-center">
          <Clock size={40} className="mx-auto mb-3 text-ink-600" />
          <p className="text-sm text-ink-500">
            Your listening history will appear here. Play a song to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song, i) => (
            <SongRow
              key={`${song.videoId}-${i}`}
              song={song}
              index={i}
              queue={songs}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
