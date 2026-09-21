import { useState } from 'react';
import { X, Plus, ListMusic } from 'lucide-react';
import type { Song, Playlist } from '@/lib/types';
import { addSongToPlaylist, createPlaylist } from '@/lib/music';

interface AddToPlaylistModalProps {
  song: Song;
  playlists: Playlist[];
  onClose: () => void;
  onPlaylistsChanged: () => void;
}

export default function AddToPlaylistModal({
  song,
  playlists,
  onClose,
  onPlaylistsChanged,
}: AddToPlaylistModalProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    setAdding('new');
    try {
      const pl = await createPlaylist(newName.trim());
      await addSongToPlaylist(pl.id, song);
      onPlaylistsChanged();
      onClose();
    } catch {
      // ignore
    } finally {
      setAdding(null);
    }
  };

  const handleAdd = async (playlistId: string) => {
    setAdding(playlistId);
    try {
      await addSongToPlaylist(playlistId, song);
      onPlaylistsChanged();
      onClose();
    } catch {
      // ignore
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add to playlist</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Song preview */}
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-ink-800 p-3">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
            {song.thumbnail && (
              <img src={song.thumbnail} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{song.title}</p>
            <p className="truncate text-xs text-ink-500">{song.artist}</p>
          </div>
        </div>

        {/* Create new */}
        {creating ? (
          <div className="mb-3 flex gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
              placeholder="Playlist name"
              className="flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={!newName.trim() || adding === 'new'}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
            >
              {adding === 'new' ? 'Adding...' : 'Create'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mb-3 flex w-full items-center gap-3 rounded-lg border border-dashed border-white/15 p-3 text-sm text-gray-200 transition-colors hover:bg-white/5"
          >
            <Plus size={18} className="text-brand-400" />
            Create new playlist
          </button>
        )}

        {/* Existing playlists */}
        <div className="scrollbar-thin max-h-64 overflow-y-auto">
          {playlists.length === 0 && !creating ? (
            <p className="py-4 text-center text-sm text-ink-500">
              No playlists yet. Create one above.
            </p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                disabled={adding === pl.id}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5 disabled:opacity-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700">
                  <ListMusic size={18} className="text-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pl.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {pl.song_count || 0} songs
                  </p>
                </div>
                {adding === pl.id && (
                  <span className="text-xs text-ink-500">Adding...</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
