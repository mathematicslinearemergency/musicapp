import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Song } from '@/lib/types';
import { loadYouTubeAPI } from '@/lib/youtubePlayer';
import { supabase } from '@/lib/supabase';

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  queue: Song[];
  queueIndex: number;
  history: Song[];
}

interface PlayerContextValue extends PlayerState {
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [apiReady, setApiReady] = useState(false);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [shuffle, setShuffle] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [history, setHistory] = useState<Song[]>([]);

  // Stable refs for event handlers
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const queueIndexRef = useRef(queueIndex);
  queueIndexRef.current = queueIndex;
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Load the YouTube API
  useEffect(() => {
    loadYouTubeAPI().then(() => setApiReady(true));
  }, []);

  // Create the hidden player container once
  useEffect(() => {
    if (!apiReady || containerRef.current) return;
    const div = document.createElement('div');
    div.id = 'yt-player-container';
    div.style.position = 'fixed';
    div.style.left = '-9999px';
    div.style.top = '-9999px';
    div.style.width = '1px';
    div.style.height = '1px';
    div.style.pointerEvents = 'none';
    document.body.appendChild(div);
    containerRef.current = div;
  }, [apiReady]);

  // Create the player instance
  useEffect(() => {
    if (!apiReady || !containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player('yt-player-container', {
      height: '1',
      width: '1',
      videoId: '',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          setIsReady(true);
          playerRef.current?.setVolume(volume);
        },
        onStateChange: (e: YT.OnStateChangeEvent) => {
          if (e.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            const d = playerRef.current?.getDuration() || 0;
            if (d > 0) setDuration(d);
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (e.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            handleSongEnd();
          } else if (e.data === window.YT.PlayerState.CUED) {
            const d = playerRef.current?.getDuration() || 0;
            if (d > 0) setDuration(d);
          }
        },
        onError: () => {
          // Skip to next on error
          handleSongEnd();
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady]);

  // Poll current time while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const t = playerRef.current?.getCurrentTime() || 0;
      setCurrentTime(t);
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Track recent plays
  const trackRecent = useCallback(async (song: Song) => {
    try {
      // Remove existing entry for this video, then insert fresh
      await supabase.from('recent_plays').delete().eq('video_id', song.videoId);
      await supabase.from('recent_plays').insert({
        video_id: song.videoId,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        duration: song.duration,
      });
      // Keep only last 50
      const { data } = await supabase
        .from('recent_plays')
        .select('id')
        .order('played_at', { ascending: false })
        .range(50, 100);
      if (data && data.length > 0) {
        const ids = data.map((r) => r.id);
        await supabase.from('recent_plays').delete().in('id', ids);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadAndPlay = useCallback(
    (song: Song) => {
      if (!playerRef.current || !isReadyRef.current) {
        // Will play once ready
        setCurrentSong(song);
        return;
      }
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(song.duration || 0);
      playerRef.current.loadVideoById(song.videoId);
      playerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current);
      trackRecent(song);
    },
    [trackRecent]
  );

  const loadAndPlayRef = useRef(loadAndPlay);
  loadAndPlayRef.current = loadAndPlay;

  const nextInternal = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (q.length === 0) return;

    let nextIdx: number;
    if (shuffleRef.current && q.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * q.length);
      } while (nextIdx === idx);
    } else {
      nextIdx = idx + 1;
      if (nextIdx >= q.length) {
        if (repeatRef.current === 'all') {
          nextIdx = 0;
        } else {
          return; // End of queue
        }
      }
    }
    setQueueIndex(nextIdx);
    loadAndPlayRef.current(q[nextIdx]);
  }, []);

  const nextInternalRef = useRef(nextInternal);
  nextInternalRef.current = nextInternal;

  const handleSongEnd = useCallback(() => {
    const r = repeatRef.current;
    if (r === 'one') {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
      return;
    }
    nextInternalRef.current();
  }, []);

  const playSong = useCallback(
    (song: Song, newQueue?: Song[]) => {
      if (newQueue && newQueue.length > 0) {
        const idx = newQueue.findIndex((s) => s.videoId === song.videoId);
        const finalQueue = idx >= 0 ? newQueue : [song, ...newQueue];
        const finalIdx = idx >= 0 ? idx : 0;
        setQueue(finalQueue);
        setQueueIndex(finalIdx);
      } else {
        setQueue([song]);
        setQueueIndex(0);
      }
      setHistory((h) => {
        const filtered = h.filter((s) => s.videoId !== song.videoId);
        return [song, ...filtered].slice(0, 20);
      });
      loadAndPlay(song);
    },
    [loadAndPlay]
  );

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !currentSong) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, currentSong]);

  const next = useCallback(() => {
    nextInternal();
  }, [nextInternal]);

  const prev = useCallback(() => {
    const t = playerRef.current?.getCurrentTime() || 0;
    if (t > 3) {
      playerRef.current?.seekTo(0, true);
      return;
    }
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (q.length === 0) return;
    let prevIdx = idx - 1;
    if (prevIdx < 0) {
      if (repeatRef.current === 'all') prevIdx = q.length - 1;
      else prevIdx = 0;
    }
    setQueueIndex(prevIdx);
    loadAndPlay(q[prevIdx]);
  }, [loadAndPlay]);

  const seek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    setMuted(false);
    playerRef.current?.setVolume(v);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      playerRef.current?.setVolume(nm ? 0 : volume);
      return nm;
    });
  }, [volume]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s);
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((q) => {
      // Don't add duplicates
      if (q.some((s) => s.videoId === song.videoId)) return q;
      return [...q, song];
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
    if (index < queueIndexRef.current) {
      setQueueIndex((i) => i - 1);
    }
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(currentSong ? [currentSong] : []);
    setQueueIndex(0);
  }, [currentSong]);

  const value: PlayerContextValue = {
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
    history,
    playSong,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    cycleRepeat,
    toggleShuffle,
    addToQueue,
    removeFromQueue,
    clearQueue,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
