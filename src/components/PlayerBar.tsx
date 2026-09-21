import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Mic2,
  ListMusic,
  X,
  Download,
  Loader2,
  Trash2,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/utils';
import { unlikeSong, likeSong } from '@/lib/music';
import { downloadSong } from '@/lib/download';

export default function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    isReady,
    currentTime,
    duration,
    volume,
    muted,
    repeat,
    shuffle,
    queue,
    queueIndex,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    cycleRepeat,
    toggleShuffle,
    clearQueue,
    removeFromQueue,
  } = usePlayer();

  const [liked, setLiked] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Track liked state when song changes
  // (Simplified: we don't persist this in player bar, just visual)
  const handleLike = async () => {
    if (!currentSong) return;
    if (liked) {
      await unlikeSong(currentSong.videoId);
      setLiked(false);
    } else {
      await likeSong(currentSong);
      setLiked(true);
    }
  };

  const handleDownload = () => {
    if (!currentSong) return;
    setDownloading(true);
    downloadSong(currentSong.videoId, currentSong.title);
    setTimeout(() => setDownloading(false), 3000);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePct = muted ? 0 : volume;

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <>
      {/* Queue panel */}
      {queueOpen && (
        <div className="fixed bottom-[88px] right-2 z-40 flex max-h-[60vh] w-80 flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-850 shadow-2xl md:w-96">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <h3 className="text-sm font-semibold">Queue</h3>
            <div className="flex items-center gap-2">
              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="text-xs text-ink-500 transition-colors hover:text-rose-400"
                  title="Clear queue"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setQueueOpen(false)} className="text-ink-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
            {queue.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-ink-500">Queue is empty</p>
            ) : (
              <>
                {/* Now playing */}
                {currentSong && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-600">Now Playing</p>
                    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-2 py-2">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-ink-800">
                        {currentSong.thumbnail && (
                          <img src={currentSong.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-brand-400">{currentSong.title}</p>
                        <p className="truncate text-xs text-ink-500">{currentSong.artist}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Next up */}
                {queue.length > queueIndex + 1 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-600">Next Up</p>
                    {queue.slice(queueIndex + 1).map((song, i) => {
                      const realIdx = queueIndex + 1 + i;
                      return (
                        <div
                          key={`${song.videoId}-${realIdx}`}
                          className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                        >
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-ink-800">
                            {song.thumbnail && (
                              <img src={song.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-gray-100">{song.title}</p>
                            <p className="truncate text-xs text-ink-500">{song.artist}</p>
                          </div>
                          <button
                            onClick={() => removeFromQueue(realIdx)}
                            className="text-ink-500 opacity-0 hover:text-white group-hover:opacity-100"
                            aria-label="Remove from queue"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <footer className="glass z-30 border-t border-white/5">
        <div className="flex h-[88px] items-center gap-3 px-3 md:gap-4 md:px-4">
          {/* Left: Song info */}
          <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none md:w-[280px]">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-ink-800">
              {currentSong?.thumbnail ? (
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-600">
                  <Mic2 size={20} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-100">
                {currentSong?.title || 'Nothing playing'}
              </p>
              <p className="truncate text-xs text-ink-500">
                {currentSong?.artist || '—'}
              </p>
            </div>
            {currentSong && (
              <button
                onClick={handleLike}
                className={`hidden flex-shrink-0 md:block ${
                  liked ? 'text-brand-400' : 'text-ink-500 hover:text-white'
                }`}
                aria-label="Like"
              >
                <Heart size={18} className={liked ? 'fill-current' : ''} />
              </button>
            )}
            {currentSong && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="hidden flex-shrink-0 text-ink-500 transition-colors hover:text-white disabled:opacity-50 md:block"
                aria-label="Download"
                title="Download"
              >
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              </button>
            )}
          </div>

          {/* Center: Controls */}
          <div className="flex flex-1 flex-col items-center gap-1.5 md:flex-none md:w-[40%] md:max-w-[600px]">
            <div className="flex items-center gap-3 md:gap-5">
              <button
                onClick={toggleShuffle}
                className={`hidden transition-colors sm:block ${
                  shuffle ? 'text-brand-400' : 'text-ink-500 hover:text-white'
                }`}
                aria-label="Shuffle"
              >
                <Shuffle size={18} />
              </button>
              <button
                onClick={prev}
                className="text-ink-500 transition-colors hover:text-white"
                aria-label="Previous"
              >
                <SkipBack size={20} className="fill-current" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!currentSong || !isReady}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 disabled:opacity-40"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={20} className="fill-current" />
                ) : (
                  <Play size={20} className="translate-x-0.5 fill-current" />
                )}
              </button>
              <button
                onClick={next}
                className="text-ink-500 transition-colors hover:text-white"
                aria-label="Next"
              >
                <SkipForward size={20} className="fill-current" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`hidden transition-colors sm:block ${
                  repeat !== 'off' ? 'text-brand-400' : 'text-ink-500 hover:text-white'
                }`}
                aria-label="Repeat"
              >
                <RepeatIcon size={18} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="player-range-group flex w-full items-center gap-2">
              <span className="hidden w-10 text-right text-[10px] tabular-nums text-ink-500 sm:block">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  step={0.1}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="player-range absolute inset-0 w-full"
                  style={{ '--track-bg': 'transparent' } as React.CSSProperties}
                  aria-label="Seek"
                />
              </div>
              <span className="hidden w-10 text-[10px] tabular-nums text-ink-500 sm:block">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume + Queue */}
          <div className="hidden flex-1 items-center justify-end gap-3 md:flex md:w-[280px]">
            <button
              onClick={() => setQueueOpen((o) => !o)}
              className={`transition-colors ${
                queueOpen ? 'text-brand-400' : 'text-ink-500 hover:text-white'
              }`}
              aria-label="Queue"
            >
              <ListMusic size={18} />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className="text-ink-500 transition-colors hover:text-white"
                aria-label="Mute"
              >
                {muted || volumePct === 0 ? (
                  <VolumeX size={18} />
                ) : volumePct < 50 ? (
                  <Volume1 size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
              <div className="player-range-group relative w-24">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-[width]"
                    style={{ width: `${volumePct}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volumePct}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="player-range absolute inset-0 w-full"
                  style={{ '--track-bg': 'transparent' } as React.CSSProperties}
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
