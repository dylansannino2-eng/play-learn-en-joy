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

    /* ------------------ Public API ------------------ */

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      toggle: () => {
        playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo();
      },
      isPlaying: () => playing,
      seekTo: (time: number) => playerRef.current?.seekTo(time, true),
      setPlaybackRate: (rate: number) => playerRef.current?.setPlaybackRate(rate),
    }));

    /* ------------------ Load YouTube API ------------------ */

    useEffect(() => {
      if (window.YT && window.YT.Player) {
        setIsAPIReady(true);
        return;
      }

      const existingScript = document.getElementById("youtube-iframe-api");
      if (existingScript) return;

      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      window.onYouTubeIframeAPIReady = () => {
        setIsAPIReady(true);
      };
    }, []);

    /* ------------------ Init Player ------------------ */

    const initPlayer = useCallback(() => {
      if (!isAPIReady || !videoId) return;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        playerVars: {
          start: Math.floor(startTime),
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          disablekb: 1,
          fs: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            event.target.seekTo(startTime);
            onReady();
          },
          onStateChange: (event: any) => {
            const isNowPlaying = event.data === window.YT.PlayerState.PLAYING;

            setPlaying(isNowPlaying);
            onPlayingChange?.(isNowPlaying);

            if (isNowPlaying) {
              intervalRef.current = window.setInterval(() => {
                const currentTime = playerRef.current?.getCurrentTime() || 0;

                onTimeUpdate(currentTime);

                if (endTime > 0 && currentTime >= endTime) {
                  playerRef.current.pauseVideo();
                  playerRef.current.seekTo(startTime);
                }
              }, 100);
            } else if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          },
        },
      });
    }, [videoId, startTime, endTime, isAPIReady, onTimeUpdate, onReady, onPlayingChange]);

    useEffect(() => {
      initPlayer();

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [initPlayer]);

    /* ------------------ Render ------------------ */

    return (
      <div className="aspect-video w-full bg-foreground/5 relative overflow-hidden">
        {/* Overlay para ocultar título, foto del canal y menú */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-10 pointer-events-none" />
        <div id={playerIdRef.current} className="w-full h-full" />
      </div>
    );
  },
);

YouTubePlayer.displayName = "YouTubePlayer";
