import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, AlertCircle } from 'lucide-react';
import type { Song } from '@/lib/types';
import { searchSongs } from '@/lib/youtube';
import SongRow from '@/components/SongRow';

interface SearchViewProps {
  onAddToPlaylist: (song: Song) => void;
}

export default function SearchView({ onAddToPlaylist }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const songs = await searchSongs(query.trim());
        setResults(songs);
        setHasSearched(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const genres = [
    { label: 'Pop', color: 'from-pink-500 to-rose-700', query: 'top pop hits 2024' },
    { label: 'Hip-Hop', color: 'from-orange-500 to-red-700', query: 'top hip hop hits 2024' },
    { label: 'Rock', color: 'from-red-500 to-rose-800', query: 'best rock songs' },
    { label: 'Electronic', color: 'from-cyan-500 to-blue-700', query: 'electronic dance music hits' },
    { label: 'R&B', color: 'from-violet-500 to-purple-800', query: 'r&b soul hits 2024' },
    { label: 'Jazz', color: 'from-amber-500 to-orange-700', query: 'smooth jazz music' },
    { label: 'Classical', color: 'from-teal-500 to-emerald-800', query: 'classical music best' },
    { label: 'Indie', color: 'from-blue-500 to-indigo-700', query: 'indie alternative hits' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Search bar */}
      <div className="relative max-w-2xl">
        <Search
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, artists..."
          className="w-full rounded-full bg-ink-800 py-3 pl-12 pr-12 text-sm text-gray-100 outline-none ring-1 ring-transparent transition-all placeholder:text-ink-500 focus:ring-brand-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-white"
            aria-label="Clear"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-ink-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Searching YouTube...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertCircle size={32} className="text-rose-500" />
          <p className="text-sm text-rose-400">{error}</p>
          <p className="text-xs text-ink-500">Try a different search term.</p>
        </div>
      )}

      {!loading && !error && hasSearched && results.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-ink-500">No results found for "{query}"</p>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-1">
          <p className="mb-3 text-sm text-ink-500">
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </p>
          {results.map((song, i) => (
            <SongRow
              key={`${song.videoId}-${i}`}
              song={song}
              index={i}
              queue={results}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      )}

      {/* Browse genres (when not searching) */}
      {!query && !hasSearched && (
        <div>
          <h2 className="mb-4 text-xl font-bold">Browse genres</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {genres.map((g) => (
              <button
                key={g.label}
                onClick={() => setQuery(g.query)}
                className={`relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br ${g.color} p-4 text-left transition-transform hover:scale-[1.02]`}
              >
                <span className="text-lg font-bold text-white drop-shadow">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
