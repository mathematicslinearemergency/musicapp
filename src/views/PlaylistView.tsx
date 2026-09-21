import { useEffect, useState, useCallback } from 'react';
import { Play, Shuffle, Loader2, ListMusic, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Song, PlaylistSong } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { getPlaylistSongs, removeSongFromPlaylist, getPlaylists, deletePlaylist, updatePlaylist } from '@/lib/music';
import SongRow from '@/components/SongRow';
import { getGradient, pluralize } from '@/lib/utils';

interface PlaylistViewProps {
  playlistId: string;
  onAddToPlaylist: (song: Song) => void;
  onPlaylistsChanged: () => void;
  onBack: () => void;
}

export default function PlaylistView({
  playlistId,
  onAddToPlaylist,
  onPlaylistsChanged,
  onBack,
}: PlaylistViewProps) {
  const { playSong, toggleShuffle, shuffle } = usePlayer();
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [coverColor, setCoverColor] = useState('emerald');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const [songData, playlists] = await Promise.all([getPlaylistSongs(playlistId), getPlaylists()]);
      setSongs(songData);
      const pl = playlists.find((p) => p.id === playlistId);
      if (pl) {
        setPlaylistName(pl.name);
        setPlaylistDesc(pl.description || '');
        setCoverColor(pl.cover_color);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    load();
  }, [load]);

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
    const queue: Song[] = songs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      duration: s.duration,
    }));
    const random = queue[Math.floor(Math.random() * queue.length)];
    playSong(random, queue);
  };

  const handleRemoveSong = async (songRowId: string) => {
    setSongs((s) => s.filter((x) => x.id !== songRowId));
    try {
      await removeSongFromPlaylist(songRowId);
      onPlaylistsChanged();
    } catch {
      load();
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await updatePlaylist(playlistId, { name: editName.trim() });
      setPlaylistName(editName.trim());
      onPlaylistsChanged();
      setEditing(false);
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlaylist(playlistId);
      onPlaylistsChanged();
      onBack();
    } catch {
      // ignore
    }
  };

  const gradient = getGradient(coverColor);
  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <div className={`flex h-32 w-32 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-xl`}>
          <ListMusic size={56} className="text-white/80" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Playlist</p>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                className="w-full max-w-md rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-2xl font-bold outline-none focus:border-brand-500"
                autoFocus
              />
              <button onClick={handleSaveEdit} className="text-brand-400 hover:text-brand-300">
                <Check size={24} />
              </button>
              <button onClick={() => setEditing(false)} className="text-ink-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-5xl">{playlistName}</h1>
              <button
                onClick={() => {
                  setEditName(playlistName);
                  setEditing(true);
                }}
                className="text-ink-500 hover:text-white"
              >
                <Pencil size={18} />
              </button>
            </div>
          )}
          <p className="text-sm text-ink-500">
            {pluralize(songs.length, 'song')}
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
          <div className="flex-1" />
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-500">Delete this playlist?</span>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg bg-ink-700 px-3 py-1.5 text-sm hover:bg-ink-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-ink-500 hover:text-rose-400"
              aria-label="Delete playlist"
            >
              <Trash2 size={20} />
            </button>
          )}
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
          <ListMusic size={40} className="mx-auto mb-3 text-ink-600" />
          <p className="text-sm text-ink-500">
            This playlist is empty. Search for songs and add them here!
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
              onAddToPlaylist={onAddToPlaylist}
              onRemove={() => handleRemoveSong(song.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
