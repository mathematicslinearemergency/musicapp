import { Home, Search, Heart, Plus, Music2, Clock, ListMusic, Import, Trash2, LogOut } from 'lucide-react';
import type { Playlist, Page } from '@/lib/types';

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  onImportSpotify: () => void;
  onDeletePlaylist: (id: string) => void;
  onSignOut: () => void;
  userEmail: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  page,
  onNavigate,
  playlists,
  onCreatePlaylist,
  onImportSpotify,
  onDeletePlaylist,
  onSignOut,
  userEmail,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'Home', view: 'home' as const },
    { icon: Search, label: 'Search', view: 'search' as const },
    { icon: Heart, label: 'Liked Songs', view: 'liked' as const },
    { icon: Clock, label: 'Recently Played', view: 'recent' as const },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col gap-2 p-2 transition-transform duration-300 md:relative md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <Music2 size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Resonate</span>
        </div>

        {/* Nav */}
        <nav className="rounded-xl bg-ink-900 p-2">
          {navItems.map((item) => {
            const active = page.view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => {
                  onNavigate({ view: item.view });
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-brand-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <item.icon size={22} className={active ? 'fill-current' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Playlists */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-ink-900 p-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Playlists
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onImportSpotify}
                className="text-ink-500 transition-colors hover:text-brand-400"
                aria-label="Import from Spotify"
                title="Import from Spotify"
              >
                <Import size={16} />
              </button>
              <button
                onClick={onCreatePlaylist}
                className="text-ink-500 transition-colors hover:text-white"
                aria-label="Create playlist"
                title="Create playlist"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {playlists.length === 0 ? (
              <div className="px-3 py-2">
                <p className="text-xs text-ink-500">
                  No playlists yet. Click + to create one or the import icon to bring in a Spotify playlist.
                </p>
              </div>
            ) : (
              <div className="group/sidebar">
                {playlists.map((pl) => {
                  const active = page.view === 'playlist' && page.playlistId === pl.id;
                  return (
                    <div
                      key={pl.id}
                      className={`group/pl flex items-center rounded-lg transition-colors ${
                        active ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <button
                        onClick={() => {
                          onNavigate({ view: 'playlist', playlistId: pl.id });
                          onCloseMobile();
                        }}
                        className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left ${
                          active ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <ListMusic size={16} className="flex-shrink-0" />
                        <span className="truncate text-sm">{pl.name}</span>
                      </button>
                      <button
                        onClick={() => onDeletePlaylist(pl.id)}
                        className="flex-shrink-0 px-2 text-ink-600 opacity-0 transition-all hover:text-rose-400 group/pl:opacity-100"
                        aria-label="Delete playlist"
                        title="Delete playlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* User + Sign out */}
        <div className="flex items-center gap-3 rounded-xl bg-ink-900 px-3 py-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-400">
            {userEmail ? userEmail[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-200">{userEmail || 'User'}</p>
          </div>
          <button
            onClick={onSignOut}
            className="flex-shrink-0 text-ink-500 transition-colors hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
