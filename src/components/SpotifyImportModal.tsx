import { useState, useCallback } from 'react';
import { X, Loader2, AlertCircle, Check, Music, Plus, ListMusic, Play } from 'lucide-react';
import type { Song, Playlist } from '@/lib/types';
import { importFromSpotify, type MatchedSong } from '@/lib/spotify';
import { createPlaylist, addSongsToPlaylist, likeSong } from '@/lib/music';
import { usePlayer } from '@/context/PlayerContext';

interface SpotifyImportModalProps {
  onClose: () => void;
  playlists: Playlist[];
  onPlaylistsChanged: () => void;
}

type Step = 'input' | 'loading' | 'results' | 'done';
type ImportTarget = 'new' | 'liked' | string;

export default function SpotifyImportModal({ onClose, playlists, onPlaylistsChanged }: SpotifyImportModalProps) {
  const { playSong } = usePlayer();
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchedSong[]>([]);
  const [notFound, setNotFound] = useState<{ title: string; artist: string }[]>([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [importTarget, setImportTarget] = useState<ImportTarget>('new');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleImport = useCallback(async () => {
    setStep('loading');
    setError(null);
    try {
      const result = await importFromSpotify(url.trim());
      setMatched(result.matched);
      setNotFound(result.notFound);
      setTotalTracks(result.totalTracks);
      // Default playlist name from the URL
      setNewPlaylistName('Imported from Spotify');
      setStep('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setStep('input');
    }
  }, [url]);

  const handleConfirmImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const songs: Song[] = matched.map((m) => ({
        videoId: m.videoId,
        title: m.spotifyTitle || m.title,
        artist: m.spotifyArtist || m.artist,
        thumbnail: m.thumbnail,
        duration: m.duration,
      }));

      if (importTarget === 'liked') {
        // Add all to liked songs
        for (const s of songs) {
          try {
            await likeSong(s);
          } catch {
            // skip duplicates
          }
        }
      } else if (importTarget === 'new') {
        const name = newPlaylistName.trim() || 'Imported from Spotify';
        const pl = await createPlaylist(name, 'Imported from Spotify');
        await addSongsToPlaylist(pl.id, songs);
        onPlaylistsChanged();
      } else {
        // Add to existing playlist
        await addSongsToPlaylist(importTarget, songs);
        onPlaylistsChanged();
      }

      setImportedCount(songs.length);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import songs');
    } finally {
      setImporting(false);
    }
  };

  const handlePlayAll = () => {
    if (matched.length === 0) return;
    const songs: Song[] = matched.map((m) => ({
      videoId: m.videoId,
      title: m.spotifyTitle || m.title,
      artist: m.spotifyArtist || m.artist,
      thumbnail: m.thumbnail,
      duration: m.duration,
    }));
    playSong(songs[0], songs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-ink-850 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Music size={20} className="text-brand-400" />
            Import from Spotify
          </h2>
          <button onClick={onClose} className="text-ink-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">
                  Spotify URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && url.trim() && handleImport()}
                  placeholder="https://open.spotify.com/track/... or /playlist/..."
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  autoFocus
                />
                <p className="mt-2 text-xs text-ink-500">
                  Paste a Spotify track, playlist, or album link. We'll find the YouTube equivalent for each song.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!url.trim()}
                className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
              >
                Find on YouTube
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 size={40} className="animate-spin text-brand-400" />
              <p className="text-sm text-ink-500">Searching YouTube for matching songs...</p>
              <p className="text-xs text-ink-600">This may take a moment for large playlists</p>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-lg bg-ink-800 p-4">
                <p className="text-sm text-gray-200">
                  Found <span className="font-bold text-brand-400">{matched.length}</span> of{' '}
                  <span className="font-bold">{totalTracks}</span> songs on YouTube
                </p>
                {notFound.length > 0 && (
                  <p className="mt-1 text-xs text-ink-500">
                    {notFound.length} song{notFound.length !== 1 ? 's' : ''} couldn't be matched
                  </p>
                )}
              </div>

              {/* Preview matched songs */}
              <div className="scrollbar-thin max-h-48 space-y-1 overflow-y-auto rounded-lg bg-ink-900 p-2">
                {matched.slice(0, 10).map((song, i) => (
                  <div key={`${song.videoId}-${i}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md">
                      {song.thumbnail && (
                        <img src={song.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-100">{song.spotifyTitle}</p>
                      <p className="truncate text-xs text-ink-500">{song.spotifyArtist}</p>
                    </div>
                    <Check size={16} className="flex-shrink-0 text-brand-400" />
                  </div>
                ))}
                {matched.length > 10 && (
                  <p className="px-2 py-1 text-xs text-ink-500">...and {matched.length - 10} more</p>
                )}
              </div>

              {/* Import target selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Import to:</label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5">
                    <input
                      type="radio"
                      name="target"
                      checked={importTarget === 'new'}
                      onChange={() => setImportTarget('new')}
                      className="accent-brand-500"
                    />
                    <Plus size={18} className="text-brand-400" />
                    <span className="text-sm">New playlist</span>
                    {importTarget === 'new' && (
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Playlist name"
                        className="ml-2 flex-1 rounded border border-white/10 bg-ink-900 px-2 py-1 text-sm outline-none focus:border-brand-500"
                        autoFocus
                      />
                    )}
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5">
                    <input
                      type="radio"
                      name="target"
                      checked={importTarget === 'liked'}
                      onChange={() => setImportTarget('liked')}
                      className="accent-brand-500"
                    />
                    <ListMusic size={18} className="text-brand-400" />
                    <span className="text-sm">Liked Songs</span>
                  </label>

                  {playlists.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5">
                      <input
                        type="radio"
                        name="target"
                        checked={importTarget !== 'new' && importTarget !== 'liked'}
                        onChange={() => setImportTarget(playlists[0]?.id || 'new')}
                        className="accent-brand-500"
                      />
                      <ListMusic size={18} className="text-brand-400" />
                      <select
                        value={importTarget !== 'new' && importTarget !== 'liked' ? importTarget : ''}
                        onChange={(e) => setImportTarget(e.target.value)}
                        className="flex-1 rounded border border-white/10 bg-ink-900 px-2 py-1 text-sm outline-none focus:border-brand-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Choose playlist...</option>
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>{pl.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmImport}
                  disabled={importing || (importTarget === 'new' && !newPlaylistName.trim()) || (importTarget !== 'new' && importTarget !== 'liked' && !importTarget)}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${matched.length} song${matched.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={handlePlayAll}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/5"
                >
                  <Play size={16} className="inline fill-current" />
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/20">
                <Check size={32} className="text-brand-400" />
              </div>
              <p className="text-lg font-bold">Import complete!</p>
              <p className="text-sm text-ink-500">
                {importedCount} song{importedCount !== 1 ? 's' : ''} imported successfully
              </p>
              {notFound.length > 0 && (
                <p className="text-xs text-ink-600">
                  {notFound.length} song{notFound.length !== 1 ? 's' : ''} couldn't be found on YouTube
                </p>
              )}
              <button
                onClick={onClose}
                className="mt-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
