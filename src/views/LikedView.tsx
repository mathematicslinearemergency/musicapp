import { useEffect, useState, useCallback } from 'react';
import { Heart, Play, Shuffle, Loader2 } from 'lucide-react';
import type { Song, LikedSong } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { getLikedSongs, unlikeSong } from '@/lib/music';
import SongRow from '@/components/SongRow';

interface LikedViewProps {
  onAddToPlaylist: (song: Song) => void;
}

export default function LikedView({ onAddToPlaylist }: LikedViewProps) {
  const { playSong, toggleShuffle, shuffle } = usePlayer();
  const [songs, setSongs] = useState<LikedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await getLikedSongs();
      setSongs(data);
      setLikedSet(new Set(data.map((s) => s.videoId)));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleLike = (videoId: string, liked: boolean) => {
    if (!liked) {
      setSongs((s) => s.filter((x) => x.videoId !== videoId));
      setLikedSet((prev) => {
        const n = new Set(prev);
        n.delete(videoId);
        return n;
      });
    }
  };

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    const queue: Song[] = songs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      duration: s.duration,
    }));
    playSong(queue[0], queue);
  };

  const handleShufflePlay = () => {
    if (songs.length === 0) return;
    if (!shuffle) toggleShuffle();
    const queue: Song[] = [...songs].map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      duration: s.duration,
    }));
    const random = queue[Math.floor(Math.random() * queue.length)];
    playSong(random, queue);
  };

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-xl">
          <Heart size={56} className="fill-current text-white" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Playlist</p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-5xl">Liked Songs</h1>
          <p className="text-sm text-ink-500">
            {songs.length} song{songs.length !== 1 ? 's' : ''}
            {totalDuration > 0 && ` • ${Math.floor(totalDuration / 60)} min`}
          </p>
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
          <Heart size={40} className="mx-auto mb-3 text-ink-600" />
          <p className="text-sm text-ink-500">
            Songs you like will appear here. Tap the heart icon on any song to like it.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              queue={songs}
              liked={likedSet.has(song.videoId)}
              onToggleLike={handleToggleLike}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
