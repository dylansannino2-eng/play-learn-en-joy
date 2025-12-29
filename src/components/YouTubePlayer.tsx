import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
  onTimeUpdate: (time: number) => void;
  onReady: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  isPlaying: () => boolean;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  ({ videoId, startTime, endTime, onTimeUpdate, onReady, onPlayingChange }, ref) => {
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<number | null>(null);
    const playerIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);
    const [isAPIReady, setIsAPIReady] = useState(false);
    const [playing, setPlaying] = useState(false);

    // Guardamos las funciones en refs para que el intervalo siempre use la versión más reciente
    // sin necesidad de reiniciar el reproductor cuando cambian las props.
    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;

    /* ------------------ Public API ------------------ */
    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      toggle: () => {
        const state = playerRef.current?.getPlayerState();
        if (state === 1) playerRef.current?.pauseVideo();
        else playerRef.current?.playVideo();
      },
      isPlaying: () => playing,
      seekTo: (time: number) => playerRef.current?.seekTo(time, true),
      setPlaybackRate: (rate: number) => playerRef.current?.setPlaybackRate(rate),
    }));

    /* ------------------ Load API Script ------------------ */
    useEffect(() => {
      if (window.YT && window.YT.Player) {
        setIsAPIReady(true);
        return;
      }
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => setIsAPIReady(true);
    }, []);

    /* ------------------ Manejo de Intervalo ------------------ */
    const startInterval = useCallback(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = window.setInterval(() => {
        if (!playerRef.current || !playerRef.current.getCurrentTime) return;

        const currentTime = playerRef.current.getCurrentTime();
        onTimeUpdateRef.current(currentTime);

        // Control de fin de rango
        if (endTime > 0 && currentTime >= endTime) {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(startTime);
        }
      }, 100);
    }, [startTime, endTime]);

    /* ------------------ Init & Update Video ------------------ */
    useEffect(() => {
      if (!isAPIReady || !videoId) return;

      // Si el reproductor ya existe, solo cambiamos el video en lugar de destruir todo
      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.cueVideoById({
          videoId: videoId,
          startSeconds: startTime,
        });
        return;
      }

      // Primera inicialización
      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        playerVars: {
          start: Math.floor(startTime),
          autoplay: 0,
          controls: 1, // Cambiado a 1 temporalmente para debug, puedes volver a 0 luego
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            onReady();
          },
          onStateChange: (event: any) => {
            const isNowPlaying = event.data === window.YT.PlayerState.PLAYING;
            setPlaying(isNowPlaying);
            onPlayingChange?.(isNowPlaying);

            if (isNowPlaying) {
              startInterval();
            } else {
              if (intervalRef.current) clearInterval(intervalRef.current);
            }
          },
        },
      });

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [isAPIReady, videoId]); // Solo re-inicializar si cambia la API o el ID base del video

    return (
      <div className="aspect-video w-full bg-black relative overflow-hidden rounded-lg">
        <div id={playerIdRef.current} className="w-full h-full" />
      </div>
    );
  },
);

YouTubePlayer.displayName = "YouTubePlayer";
