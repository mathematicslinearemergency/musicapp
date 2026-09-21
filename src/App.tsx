import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PlayerProvider } from '@/context/PlayerContext';
import LoginPage from '@/views/LoginPage';
import Sidebar from '@/components/Sidebar';
import PlayerBar from '@/components/PlayerBar';
import MobileBar from '@/components/MobileBar';
import HomeView from '@/views/HomeView';
import SearchView from '@/views/SearchView';
import LikedView from '@/views/LikedView';
import RecentView from '@/views/RecentView';
import PlaylistView from '@/views/PlaylistView';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import SpotifyImportModal from '@/components/SpotifyImportModal';
import type { Song, Playlist, Page } from '@/lib/types';
import { getPlaylists, createPlaylist, deletePlaylist } from '@/lib/music';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>({ view: 'home' });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addModalSong, setAddModalSong] = useState<Song | null>(null);
  const [spotifyModalOpen, setSpotifyModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadPlaylists = useCallback(async () => {
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user) loadPlaylists();
  }, [user, loadPlaylists]);

  const handleNavigate = (p: Page) => {
    setPage(p);
    const main = document.getElementById('main-scroll');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreatePlaylist = async () => {
    const name = `My Playlist #${playlists.length + 1}`;
    try {
      await createPlaylist(name);
      await loadPlaylists();
    } catch {
      // ignore
    }
  };

  const handleOpenPlaylist = (id: string) => {
    handleNavigate({ view: 'playlist', playlistId: id });
  };

  const handleAddToPlaylist = (song: Song) => {
    setAddModalSong(song);
  };

  const handleDeletePlaylist = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deletePlaylist(confirmDeleteId);
      await loadPlaylists();
      if (page.view === 'playlist' && page.playlistId === confirmDeleteId) {
        handleNavigate({ view: 'home' });
      }
    } catch {
      // ignore
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <div className="flex min-h-0 flex-1">
        <Sidebar
          page={page}
          onNavigate={handleNavigate}
          playlists={playlists}
          onCreatePlaylist={handleCreatePlaylist}
          onImportSpotify={() => setSpotifyModalOpen(true)}
          onDeletePlaylist={handleDeletePlaylist}
          onSignOut={signOut}
          userEmail={user.email || null}
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileBar
            onOpenSidebar={() => setSidebarOpen(true)}
            onNavigateSearch={() => handleNavigate({ view: 'search' })}
          />

          <main
            id="main-scroll"
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6"
          >
            {page.view === 'home' && (
              <HomeView
                playlists={playlists}
                onOpenPlaylist={handleOpenPlaylist}
                onNavigate={(v) => handleNavigate({ view: v })}
                onAddToPlaylist={handleAddToPlaylist}
              />
            )}
            {page.view === 'search' && <SearchView onAddToPlaylist={handleAddToPlaylist} />}
            {page.view === 'liked' && <LikedView onAddToPlaylist={handleAddToPlaylist} />}
            {page.view === 'recent' && <RecentView onAddToPlaylist={handleAddToPlaylist} />}
            {page.view === 'playlist' && page.playlistId && (
              <PlaylistView
                playlistId={page.playlistId}
                onAddToPlaylist={handleAddToPlaylist}
                onPlaylistsChanged={loadPlaylists}
                onBack={() => handleNavigate({ view: 'home' })}
              />
            )}
          </main>
        </div>
      </div>

      <PlayerBar />

      {addModalSong && (
        <AddToPlaylistModal
          song={addModalSong}
          playlists={playlists}
          onClose={() => setAddModalSong(null)}
          onPlaylistsChanged={loadPlaylists}
        />
      )}

      {spotifyModalOpen && (
        <SpotifyImportModal
          playlists={playlists}
          onClose={() => setSpotifyModalOpen(false)}
          onPlaylistsChanged={loadPlaylists}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold">Delete playlist?</h3>
            <p className="mb-4 text-sm text-ink-500">
              This will permanently delete the playlist and all songs in it. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-ink-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </AuthProvider>
  );
}
