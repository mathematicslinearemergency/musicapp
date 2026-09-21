import { useEffect, useState } from 'react';
import { Play, Clock, Heart, TrendingUp, ListMusic } from 'lucide-react';
import type { Song, Playlist } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { getRecentPlays, getLikedSongs } from '@/lib/music';
import SongRow from '@/components/SongRow';
import PlaylistCard from '@/components/PlaylistCard';
import { pluralize } from '@/lib/utils';

interface HomeViewProps {
  playlists: Playlist[];
  onOpenPlaylist: (id: string) => void;
  onNavigate: (view: 'liked' | 'recent') => void;
  onAddToPlaylist: (song: Song) => void;
}

export default function HomeView({
  playlists,
  onOpenPlaylist,
  onNavigate,
  onAddToPlaylist,
}: HomeViewProps) {
  const { playSong } = usePlayer();
  const [recent, setRecent] = useState<Song[]>([]);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getRecentPlays(), getLikedSongs()])
      .then(([r, l]) => {
        setRecent(r);
        setLikedCount(l.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const quickItems = [
    {
      label: 'Liked Songs',
      icon: Heart,
      count: pluralize(likedCount, 'song'),
      gradient: 'from-brand-500 to-brand-700',
      onClick: () => onNavigate('liked'),
    },
    {
      label: 'Recently Played',
      icon: Clock,
      count: pluralize(recent.length, 'song'),
      gradient: 'from-blue-500 to-blue-700',
      onClick: () => onNavigate('recent'),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{greeting}</h1>
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickItems.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="group flex items-center gap-4 overflow-hidden rounded-lg bg-ink-850 transition-colors hover:bg-ink-800"
          >
            <div className={`flex h-16 w-16 items-center justify-center bg-gradient-to-br ${item.gradient}`}>
              <item.icon size={28} className="text-white" />
            </div>
            <div className="min-w-0 flex-1 pr-3 text-left">
              <p className="truncate text-sm font-bold">{item.label}</p>
              <p className="truncate text-xs text-ink-500">{item.count}</p>
            </div>
            <Play
              size={20}
              className="mr-4 translate-x-2 fill-current text-white opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>

      {/* Recently played */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <TrendingUp size={20} className="text-brand-400" />
            Recently Played
          </h2>
          {recent.length > 0 && (
            <button
              onClick={() => onNavigate('recent')}
              className="text-xs font-semibold uppercase tracking-wider text-ink-500 hover:text-white"
            >
              See all
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-ink-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-xl bg-ink-850 p-8 text-center">
            <Clock size={32} className="mx-auto mb-2 text-ink-600" />
            <p className="text-sm text-ink-500">
              No recently played songs yet. Search and play something!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.slice(0, 6).map((song, i) => (
              <SongRow
                key={`${song.videoId}-${i}`}
                song={song}
                index={i}
                queue={recent}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        )}
      </section>

      {/* Playlists */}
      {playlists.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ListMusic size={20} className="text-brand-400" />
            <h2 className="text-xl font-bold">Your Playlists</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} onOpen={() => onOpenPlaylist(pl.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
