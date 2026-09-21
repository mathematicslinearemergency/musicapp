import { ListMusic, Play } from 'lucide-react';
import type { Playlist } from '@/lib/types';
import { getGradient, pluralize } from '@/lib/utils';

interface PlaylistCardProps {
  playlist: Playlist;
  onOpen: () => void;
}

export default function PlaylistCard({ playlist, onOpen }: PlaylistCardProps) {
  const gradient = getGradient(playlist.cover_color);
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-xl bg-ink-850 p-3 text-left transition-all hover:bg-ink-800"
    >
      <div
        className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${gradient}`}
      >
        <ListMusic size={48} className="text-white/80" />
        <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-black/40">
            <Play size={20} className="translate-x-0.5 fill-current text-white" />
          </div>
        </div>
      </div>
      <div>
        <p className="truncate text-sm font-semibold text-gray-100">{playlist.name}</p>
        <p className="truncate text-xs text-ink-500">
          {pluralize(playlist.song_count || 0, 'song')}
        </p>
      </div>
    </button>
  );
}
