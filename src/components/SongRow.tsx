import { useState } from 'react';
import { Play, Pause, Heart, MoreHorizontal, Plus, ListPlus, Trash2, Download, Loader2 } from 'lucide-react';
import type { Song } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/utils';
import { likeSong, unlikeSong } from '@/lib/music';
import { downloadSong } from '@/lib/download';

interface SongRowProps {
  song: Song;
  index?: number;
  queue?: Song[];
  showIndex?: boolean;
  onRemove?: () => void;
  onAddToPlaylist?: (song: Song) => void;
  liked?: boolean;
  onToggleLike?: (videoId: string, liked: boolean) => void;
  variant?: 'default' | 'compact';
}

export default function SongRow({
  song,
  index,
  queue,
  showIndex = true,
  onRemove,
  onAddToPlaylist,
  liked = false,
  onToggleLike,
  variant = 'default',
}: SongRowProps) {
  const { currentSong, isPlaying, playSong, togglePlay, addToQueue } = usePlayer();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isCurrent = currentSong?.videoId === song.videoId;
  const isCurrentPlaying = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, queue);
    }
  };

  const handleLike = async () => {
    try {
      if (liked) {
        await unlikeSong(song.videoId);
        onToggleLike?.(song.videoId, false);
      } else {
        await likeSong(song);
        onToggleLike?.(song.videoId, true);
      }
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    downloadSong(song.videoId, song.title);
    // Reset after a delay (download opens in new tab)
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5 ${
        isCurrent ? 'bg-white/5' : ''
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
      }}
    >
      {/* Play button / index */}
      <div className="flex w-8 flex-shrink-0 items-center justify-center">
        {showIndex && !hovered && !isCurrent && (
          <span className="text-sm text-ink-500">{(index ?? 0) + 1}</span>
        )}
        {(hovered || isCurrent) && (
          <button
            onClick={handlePlay}
            className="text-white"
            aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentPlaying ? (
              <Pause size={16} className="fill-current text-brand-400" />
            ) : (
              <Play size={16} className="fill-current" />
            )}
          </button>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-ink-800">
        {song.thumbnail ? (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play size={16} className="text-ink-500" />
          </div>
        )}
      </div>

      {/* Title + Artist */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            isCurrent ? 'text-brand-400' : 'text-gray-100'
          }`}
        >
          {song.title}
        </p>
        <p className="truncate text-xs text-ink-500">{song.artist}</p>
      </div>

      {/* Like button */}
      <button
        onClick={handleLike}
        className={`flex-shrink-0 transition-opacity ${
          liked ? 'text-brand-400 opacity-100' : 'text-ink-500 opacity-0 group-hover:opacity-100 hover:text-white'
        }`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart size={16} className={liked ? 'fill-current' : ''} />
      </button>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`flex-shrink-0 transition-opacity ${
          'text-ink-500 opacity-0 group-hover:opacity-100 hover:text-white disabled:opacity-50'
        }`}
        aria-label="Download"
        title="Download"
      >
        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>

      {/* Duration */}
      {variant === 'default' && (
        <span className="hidden w-12 flex-shrink-0 text-right text-xs text-ink-500 sm:block">
          {formatTime(song.duration)}
        </span>
      )}

      {/* Menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="text-ink-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          aria-label="More options"
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-white/10 bg-ink-800 py-1 shadow-xl">
              {onAddToPlaylist && (
                <button
                  onClick={() => {
                    onAddToPlaylist(song);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                >
                  <Plus size={16} /> Add to playlist
                </button>
              )}
              <button
                onClick={() => {
                  addToQueue(song);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
              >
                <ListPlus size={16} /> Add to queue
              </button>
              <button
                onClick={handleLike}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
              >
                <Heart size={16} className={liked ? 'fill-current text-brand-400' : ''} />
                {liked ? 'Remove from liked' : 'Add to liked'}
              </button>
              <button
                onClick={() => {
                  handleDownload();
                  setMenuOpen(false);
                }}
                disabled={downloading}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download
              </button>
              {onRemove && (
                <button
                  onClick={() => {
                    onRemove();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:bg-white/5"
                >
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
