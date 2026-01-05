import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import CorrectAnswerAnimation from './shared/CorrectAnswerAnimation';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';
import GameLobby from './shared/GameLobby';
import MicroLesson from './shared/MicroLesson';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ROUND_SECONDS = 45;

type Difficulty = 'easy' | 'medium' | 'hard';

interface SubtitleItem {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleConfig {
  id: string;
  name: string | null;
  video_id: string | null;
  start_time: number | null;
  end_time: number | null;
  subtitles: SubtitleItem[] | null;
  translations: SubtitleItem[] | null;
  // Fields for predefined hidden word
  target_subtitle_index: number | null;
  hidden_word: string | null;
  hidden_word_index: number | null;
  // Pre-generated microlesson data
  microlesson_meaning: string | null;
  microlesson_examples: string[] | null;
}

// Generates a blank version of subtitle with one word hidden
interface BlankSubtitle {
  originalText: string;
  displayText: string;
  hiddenWord: string;
  wordIndex: number;
}

// Create blank using predefined word if available, otherwise random
function createBlankSubtitle(
  text: string, 
  predefinedWord?: string | null, 
  predefinedWordIndex?: number | null
): BlankSubtitle | null {
  const words = text.replace(/\n/g, ' ').split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;

  // If we have a predefined word, use it
  if (predefinedWord && predefinedWordIndex !== null && predefinedWordIndex !== undefined) {
    const displayWords = [...words];
    if (predefinedWordIndex >= 0 && predefinedWordIndex < words.length) {
      displayWords[predefinedWordIndex] = '____';
      return {
        originalText: text,
        displayText: displayWords.join(' '),
        hiddenWord: predefinedWord.toLowerCase(),
        wordIndex: predefinedWordIndex,
      };
    }
  }

  // If predefined word exists but no index, find it in text
  if (predefinedWord) {
    const lowerPredefined = predefinedWord.toLowerCase();
    for (let i = 0; i < words.length; i++) {
      const cleanWord = words[i].replace(/[.,!?'"()]/g, '').toLowerCase();
      if (cleanWord === lowerPredefined) {
        const displayWords = [...words];
        displayWords[i] = '____';
        return {
          originalText: text,
          displayText: displayWords.join(' '),
          hiddenWord: lowerPredefined,
          wordIndex: i,
        };
      }
    }
  }

  // Fallback: Pick a random word that's at least 3 characters
  const validIndices = words
    .map((w, i) => ({ word: w.replace(/[.,!?'"()]/g, ''), index: i }))
    .filter(item => item.word.length >= 3);

  if (validIndices.length === 0) {
    const randomIndex = Math.floor(Math.random() * words.length);
    const hiddenWord = words[randomIndex].replace(/[.,!?'"()]/g, '');
    const displayWords = [...words];
    displayWords[randomIndex] = '____';
    return {
      originalText: text,
      displayText: displayWords.join(' '),
      hiddenWord: hiddenWord.toLowerCase(),
      wordIndex: randomIndex,
    };
  }

  const chosen = validIndices[Math.floor(Math.random() * validIndices.length)];
  const displayWords = [...words];
  displayWords[chosen.index] = '____';

  return {
    originalText: text,
    displayText: displayWords.join(' '),
    hiddenWord: chosen.word.toLowerCase(),
    wordIndex: chosen.index,
  };
}

type GamePhase = 'waiting' | 'ready' | 'playing' | 'microlesson' | 'ranking';

interface TheMovieInterpreterGameProps {
  roomCode?: string;
  onBack?: () => void;
  microlessonsEnabled?: boolean;
  multiplayerEnabled?: boolean;
  category?: string;
}

export default function TheMovieInterpreterGame({ roomCode, onBack, microlessonsEnabled = true, multiplayerEnabled = true, category }: TheMovieInterpreterGameProps) {
  const { playSound, preloadSounds } = useGameSounds();

  const [displayName, setDisplayName] = useState('');
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>(undefined);
  const [isHostInRoom, setIsHostInRoom] = useState(false);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(['medium']);

  const {
    players,
    playerCount,
    isConnected,
    username,
    updateScore,
    broadcastCorrectAnswer,
    correctAnswerEvents,
    gameEvent,
    broadcastGameEvent,
    chatMessages: remoteChatMessages,
    broadcastChatMessage,
  } = useMultiplayerGame('the-movie-interpreter', gameRoomCode, displayName || undefined);

  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig | null>(null);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);
  const [blankSubtitle, setBlankSubtitle] = useState<BlankSubtitle | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hasAnsweredThisRound, setHasAnsweredThisRound] = useState(false);
  const [usedConfigIds, setUsedConfigIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const lastTimerSecondRef = useRef<number>(ROUND_SECONDS);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isPausedOnTarget, setIsPausedOnTarget] = useState(false);
  const [repeatCount, setRepeatCount] = useState(0);
  const MAX_REPEATS = 3;
  const playerRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

  // Pending start payload for joiners (saved during 'ready' phase)
  const pendingStartRef = useRef<{ difficulties: Difficulty[]; roomCode?: string; startPayload?: unknown; playerName: string } | null>(null);

  const startRoundTimer = useCallback((endsAt?: number) => {
    const nextEndsAt = endsAt ?? Date.now() + ROUND_SECONDS * 1000;
    const nextSeconds = Math.max(0, Math.ceil((nextEndsAt - Date.now()) / 1000));

    lastTimerSecondRef.current = nextSeconds;
    setRoundEndsAt(nextEndsAt);
    setTimeLeft(nextSeconds);

    return nextEndsAt;
  }, []);

  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [isLoading, setIsLoading] = useState(false);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);

  // Animation state
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationWord, setAnimationWord] = useState('');
  const [animationPoints, setAnimationPoints] = useState(0);

  // Microlesson state
  const [microlessonWord, setMicrolessonWord] = useState('');
  const [microlessonContext, setMicrolessonContext] = useState('');
  const [microlessonMeaning, setMicrolessonMeaning] = useState<string | null>(null);
  const [microlessonExamples, setMicrolessonExamples] = useState<string[] | null>(null);

  // Sync refs (multiplayer)
  const lastSyncedConfigRef = useRef<string | null>(null);
  const hasRequestedSyncRef = useRef(false);

  // Reset sync request when room/role changes
  useEffect(() => {
    hasRequestedSyncRef.current = false;
  }, [gameRoomCode, isHostInRoom]);

  // If a player joins mid-game they won't receive earlier broadcasts; request a full sync from host.
  useEffect(() => {
    if (!gameRoomCode) return;
    if (isHostInRoom) return;
    if (!isConnected) return;
    if (subtitleConfig) return;
    if (hasRequestedSyncRef.current) return;

    hasRequestedSyncRef.current = true;
    setIsLoading(true);
    void broadcastGameEvent('request_sync', { at: Date.now() });
  }, [gameRoomCode, isHostInRoom, isConnected, subtitleConfig, broadcastGameEvent]);

  // Preload sounds
  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  // Load YouTube API
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Add correct answer events from other players to chat
  useEffect(() => {
    correctAnswerEvents.forEach((event) => {
      if (event.username !== username) {
        const newMessage: ChatMessage = {
          id: `correct-${Date.now()}-${event.username}`,
          username: event.username,
          message: '',
          type: 'correct',
          timestamp: new Date(),
        };
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }
    });
  }, [correctAnswerEvents, username]);

  // Note: We intentionally do NOT add remote chat messages to avoid showing correct answers
  // Other players' messages are hidden - only "ha acertado" notifications are shown via correctAnswerEvents

  // Initialize YouTube player when config changes
  useEffect(() => {
    if (!subtitleConfig?.video_id || gamePhase !== 'playing') return;

    const initPlayer = () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
      }

      const startTime = subtitleConfig.start_time ?? 0;

      ytPlayerRef.current = new (window as any).YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: subtitleConfig.video_id,
        playerVars: {
          autoplay: 1,
          start: Math.floor(startTime),
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          showinfo: 0,
          cc_load_policy: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            setNeedsUserPlay(false);

            try {
              event.target.seekTo(startTime, true);
            } catch {
              // ignore
            }

            try {
              event.target.playVideo?.();
            } catch {
              // ignore
            }

            window.setTimeout(() => {
              const YT = (window as any).YT;
              const state = event.target.getPlayerState?.();
              if (state !== YT?.PlayerState?.PLAYING) {
                setIsPlaying(false);
                setNeedsUserPlay(true);
              }
            }, 900);
          },
          onStateChange: (event: any) => {
            const YT = (window as any).YT;
            if (event.data === YT?.PlayerState?.PLAYING) {
              setIsPlaying(true);
              setNeedsUserPlay(false);
            } else if (event.data === YT?.PlayerState?.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === YT?.PlayerState?.UNSTARTED || event.data === YT?.PlayerState?.CUED) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, [subtitleConfig?.video_id, subtitleConfig?.start_time, gamePhase]);

  // Track video time and update subtitle
  useEffect(() => {
    if (!ytPlayerRef.current || gamePhase !== 'playing' || !subtitleConfig?.subtitles) return;

    const interval = setInterval(() => {
      try {
        const currentTime = ytPlayerRef.current?.getCurrentTime?.() ?? 0;
        setVideoCurrentTime(currentTime);

        // Find current subtitle
        const subtitles = subtitleConfig.subtitles as SubtitleItem[];
        const currentSub = subtitles.find(
          (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
        );

        if (currentSub) {
          const newIndex = subtitles.findIndex((s) => s.id === currentSub.id);
          if (newIndex !== currentSubtitleIndex) {
            setCurrentSubtitleIndex(newIndex);
            
            // Only create blank for the target subtitle, show normal text for others
            const isTargetSubtitle = subtitleConfig.target_subtitle_index !== null && 
                                     subtitleConfig.target_subtitle_index !== undefined &&
                                     newIndex === subtitleConfig.target_subtitle_index;
            
            if (isTargetSubtitle) {
              const blank = createBlankSubtitle(
                currentSub.text,
                subtitleConfig.hidden_word,
                subtitleConfig.hidden_word_index
              );
              setBlankSubtitle(blank);
              setHasAnsweredThisRound(false);
            } else {
              // For non-target subtitles, show the full text without blanks
              setBlankSubtitle({
                originalText: currentSub.text,
                displayText: currentSub.text.replace(/\n/g, ' '),
                hiddenWord: '',
                wordIndex: -1,
              });
            }
          }
          
          // Pause video at the END of the target subtitle (when reaching its endTime)
          const isTargetSubtitle = subtitleConfig.target_subtitle_index !== null && 
                                   subtitleConfig.target_subtitle_index !== undefined &&
                                   newIndex === subtitleConfig.target_subtitle_index;
          
          if (isTargetSubtitle && !isPausedOnTarget && currentTime >= currentSub.endTime - 0.15) {
            ytPlayerRef.current.pauseVideo();
            setIsPausedOnTarget(true);
          }
        }
      } catch (e) {
        // Player might not be ready
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gamePhase, subtitleConfig, currentSubtitleIndex, isPausedOnTarget]);

  // Helper to pick a random difficulty from selected ones
  const getRandomDifficulty = useCallback(() => {
    return selectedDifficulties[Math.floor(Math.random() * selectedDifficulties.length)];
  }, [selectedDifficulties]);

  // Apply a config (used by both host and joiners)
  const applyConfig = useCallback((config: SubtitleConfig) => {
    lastSyncedConfigRef.current = config.id;
    setSubtitleConfig(config);
    setUsedConfigIds(prev => new Set(prev).add(config.id));
    setCurrentSubtitleIndex(-1); // Start at -1 so first subtitle triggers update
    setBlankSubtitle(null);
    setIsPausedOnTarget(false);
    setRepeatCount(0);
    setHasAnsweredThisRound(false);
    setIsLoading(false);
  }, []);

  const fetchRandomConfig = useCallback(async (excludeIds: Set<string>, difficulty?: Difficulty) => {
    // Only host fetches config in multiplayer
    if (gameRoomCode && !isHostInRoom) {
      // Joiners wait for host to broadcast
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    const targetDifficulty = difficulty || getRandomDifficulty();

    // Build query with category filter if provided - ensure video_id is not empty
    let query = supabase
      .from('subtitle_configs')
      .select('*')
      .not('hidden_word', 'is', null)
      .not('video_id', 'is', null)
      .neq('video_id', '')
      .eq('difficulty', targetDifficulty);
    // Apply category filter if specified
    if (category) {
      query = query.eq('category', category);
    }

    let { data, error } = await query;

    // Fallback to any config matching category if no difficulty matches
    if (error || !data || data.length === 0) {
      let fallbackQuery = supabase
        .from('subtitle_configs')
        .select('*')
        .not('hidden_word', 'is', null)
        .not('video_id', 'is', null)
        .neq('video_id', '');
      
      if (category) {
        fallbackQuery = fallbackQuery.eq('category', category);
      }
      
      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }
    
    // Final fallback: any config (without category filter)
    if (error || !data || data.length === 0) {
      const finalFallback = await supabase
        .from('subtitle_configs')
        .select('*')
        .not('hidden_word', 'is', null)
        .not('video_id', 'is', null)
        .neq('video_id', '');
      data = finalFallback.data;
      error = finalFallback.error;
    }

    if (error || !data || data.length === 0) {
      toast.error('No hay configuraciones de video con palabra oculta configurada');
      setIsLoading(false);
      return;
    }

    // Filter out used configs
    const availableConfigs = data.filter(c => c.id && !excludeIds.has(c.id));
    const finalPool = availableConfigs.length > 0 ? availableConfigs : data;

    const randomConfig = finalPool[Math.floor(Math.random() * finalPool.length)];
    
    // Parse the subtitles JSON - cast through unknown for JSON types
    const subtitlesArray = Array.isArray(randomConfig.subtitles) 
      ? randomConfig.subtitles as unknown as SubtitleItem[]
      : null;
    const translationsArray = Array.isArray(randomConfig.translations)
      ? randomConfig.translations as unknown as SubtitleItem[]
      : null;

    const config: SubtitleConfig = {
      id: randomConfig.id ?? '',
      name: randomConfig.name,
      video_id: randomConfig.video_id,
      start_time: randomConfig.start_time,
      end_time: randomConfig.end_time,
      subtitles: subtitlesArray,
      translations: translationsArray,
      target_subtitle_index: randomConfig.target_subtitle_index,
      hidden_word: randomConfig.hidden_word,
      hidden_word_index: randomConfig.hidden_word_index,
      microlesson_meaning: randomConfig.microlesson_meaning ?? null,
      microlesson_examples: randomConfig.microlesson_examples ?? null,
    };

    applyConfig(config);

    // Broadcast config to other players in the room
    if (gameRoomCode && isHostInRoom) {
      await broadcastGameEvent('sync_config', { config, round, roundEndsAt, phase: gamePhase });
    }
  }, [getRandomDifficulty, selectedDifficulties, gameRoomCode, isHostInRoom, broadcastGameEvent, round, roundEndsAt, gamePhase, applyConfig, category]);

  const endRound = useCallback(async () => {
    // Start microlesson phase with the hidden word (if enabled)
    const word = blankSubtitle?.hiddenWord || '';
    const context = blankSubtitle?.originalText || '';
    const meaning = subtitleConfig?.microlesson_meaning || null;
    const examples = subtitleConfig?.microlesson_examples || null;
    
    if (microlessonsEnabled && word) {
      setMicrolessonWord(word);
      setMicrolessonContext(context);
      setMicrolessonMeaning(meaning);
      setMicrolessonExamples(examples);
      setGamePhase('microlesson');
      
      // Host broadcasts microlesson phase with pregenerated data
      if (gameRoomCode && isHostInRoom) {
        await broadcastGameEvent('sync_microlesson', { word, context, meaning, examples });
      }
    } else {
      setGamePhase('ranking');
      
      // Host broadcasts ranking phase
      if (gameRoomCode && isHostInRoom) {
        await broadcastGameEvent('sync_ranking', {});
      }
    }
    if (ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }
  }, [blankSubtitle, subtitleConfig, gameRoomCode, isHostInRoom, broadcastGameEvent, microlessonsEnabled]);

  // Listen for sync events (host <-> joiners)
  useEffect(() => {
    if (!gameEvent) return;

    // Joiner asks host for a full snapshot (handles mid-game joins / refresh)
    if (gameEvent.type === 'request_sync' && isHostInRoom && gameRoomCode) {
      // If host hasn't loaded a config yet, there's nothing to sync.
      if (!subtitleConfig) return;

      void (async () => {
        await broadcastGameEvent('sync_state', {
          config: subtitleConfig,
          round,
          roundEndsAt,
          phase: gamePhase,
          microlessonWord,
        });
      })();
      return;
    }

    // Sync config from host
    if (gameEvent.type === 'sync_config' && !isHostInRoom && gameRoomCode) {
      const payload = gameEvent.payload as {
        config: SubtitleConfig;
        round?: number;
        roundEndsAt?: number | null;
        phase?: GamePhase;
      };

      if (typeof payload.round === 'number') setRound(payload.round);
      if (typeof payload.roundEndsAt === 'number') startRoundTimer(payload.roundEndsAt);
      if (payload.phase) setGamePhase(payload.phase);

      if (payload.config && payload.config.id !== lastSyncedConfigRef.current) {
        applyConfig(payload.config);
      }
      return;
    }

    // Full state sync (response to request_sync)
    if (gameEvent.type === 'sync_state' && !isHostInRoom && gameRoomCode) {
      const payload = gameEvent.payload as {
        config: SubtitleConfig | null;
        round: number;
        roundEndsAt: number | null;
        phase: GamePhase;
        microlessonWord: string;
      };

      setRound(payload.round);
      if (typeof payload.roundEndsAt === 'number') startRoundTimer(payload.roundEndsAt);
      setGamePhase(payload.phase);
      setMicrolessonWord(payload.microlessonWord || '');

      if (payload.config && payload.config.id !== lastSyncedConfigRef.current) {
        applyConfig(payload.config);
      } else {
        setIsLoading(false);
      }

      if (payload.phase !== 'playing' && ytPlayerRef.current) {
        ytPlayerRef.current.pauseVideo();
      }
      return;
    }

    // Sync microlesson from host
    if (gameEvent.type === 'sync_microlesson' && !isHostInRoom && gameRoomCode) {
      const payload = gameEvent.payload as { 
        word: string; 
        context?: string;
        meaning?: string | null;
        examples?: string[] | null;
      };
      if (payload.word) {
        setMicrolessonWord(payload.word);
        setMicrolessonContext(payload.context || '');
        setMicrolessonMeaning(payload.meaning ?? null);
        setMicrolessonExamples(payload.examples ?? null);
        setGamePhase('microlesson');
        if (ytPlayerRef.current) {
          ytPlayerRef.current.pauseVideo();
        }
      }
    }

    // Sync ranking phase from host
    if (gameEvent.type === 'sync_ranking' && !isHostInRoom && gameRoomCode) {
      setGamePhase('ranking');
      if (ytPlayerRef.current) {
        ytPlayerRef.current.pauseVideo();
      }
    }
  }, [
    gameEvent,
    isHostInRoom,
    gameRoomCode,
    applyConfig,
    broadcastGameEvent,
    subtitleConfig,
    round,
    roundEndsAt,
    gamePhase,
    microlessonWord,
    startRoundTimer,
  ]);

  // Host broadcasts periodic sync to keep all players aligned (every 5 seconds during playing)
  useEffect(() => {
    if (!isHostInRoom || !gameRoomCode) return;
    if (gamePhase !== 'playing') return;
    if (!subtitleConfig) return;

    const interval = window.setInterval(() => {
      void broadcastGameEvent('sync_state', {
        config: subtitleConfig,
        round,
        roundEndsAt,
        phase: gamePhase,
        microlessonWord,
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isHostInRoom, gameRoomCode, gamePhase, subtitleConfig, round, roundEndsAt, microlessonWord, broadcastGameEvent]);

  // Joiners request sync when their tab becomes visible again
  useEffect(() => {
    if (isHostInRoom) return;
    if (!gameRoomCode) return;
    if (!isConnected) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void broadcastGameEvent('request_sync', { at: Date.now() });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isHostInRoom, gameRoomCode, isConnected, broadcastGameEvent]);


  // Check if all players answered correctly - auto advance round
  const hasAdvancedRef = useRef(false);
  
  useEffect(() => {
    hasAdvancedRef.current = false;
  }, [round]);
  
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (!hasAnsweredThisRound) return;
    if (hasAdvancedRef.current) return;
    
    // Solo mode: advance when player answers correctly
    if (playerCount <= 1) {
      hasAdvancedRef.current = true;
      setTimeout(() => {
        playSound('roundEnd', 0.6);
        endRound();
      }, 800);
      return;
    }
    
    // Multiplayer: only host checks and broadcasts
    if (!isHostInRoom) return;
    
    // Check if all players answered correctly this round
    // Use correctAnswers >= round since correctAnswers accumulates across rounds
    // Also ensure we have at least 2 players for multiplayer auto-advance
    const allAnswered = players.length >= 2 && players.every(p => p.correctAnswers >= round);
    
    if (allAnswered) {
      hasAdvancedRef.current = true;
      setTimeout(async () => {
        playSound('roundEnd', 0.6);
        endRound();
        await broadcastGameEvent('round_advance', { round });
      }, 800);
    }
  }, [gamePhase, players, playerCount, round, hasAnsweredThisRound, playSound, isHostInRoom, broadcastGameEvent, endRound]);

  // Listen for round advance from host (non-hosts)
  useEffect(() => {
    if (isHostInRoom) return;
    if (!gameRoomCode) return;
    if (!gameEvent || gameEvent.type !== 'round_advance') return;
    
    playSound('roundEnd', 0.6);
    endRound();
  }, [gameEvent, isHostInRoom, gameRoomCode, playSound, endRound]);

  // Timer - uses roundEndsAt (absolute timestamp) to stay synced across tabs
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (!roundEndsAt) {
      startRoundTimer();
      return;
    }

    // Recalculate immediately on mount/visibility (handles tab coming back active)
    const recalculate = () => {
      const remainingMs = roundEndsAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      // Time already expired while tab was inactive
      if (remainingSec <= 0 && lastTimerSecondRef.current > 0) {
        lastTimerSecondRef.current = 0;
        setTimeLeft(0);
        playSound('roundEnd', 0.6);
        endRound();
        return true; // ended
      }

      if (remainingSec !== lastTimerSecondRef.current) {
        if (remainingSec <= 6 && remainingSec > 1 && lastTimerSecondRef.current > remainingSec) {
          playSound('tick', 0.3);
        }
        lastTimerSecondRef.current = remainingSec;
        setTimeLeft(remainingSec);
      }
      return false;
    };

    // Initial recalculation
    if (recalculate()) return;

    const timer = window.setInterval(() => {
      recalculate();
    }, 250);

    // Handle visibility change - resync timer when tab becomes active
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        recalculate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [gamePhase, roundEndsAt, playSound, endRound, startRoundTimer]);

  // Handle return to lobby event
  useEffect(() => {
    if (!gameEvent) return;
    if (gameEvent.type === 'return_to_lobby') {
      playSound('gameStart', 0.5);
      setGamePhase('waiting');
      setRound(1);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      setUsedConfigIds(new Set());
    }
  }, [gameEvent, playSound]);

  const handlePlayAgain = useCallback(async () => {
    if (gameRoomCode && isHostInRoom) {
      await broadcastGameEvent('return_to_lobby', { roomCode: gameRoomCode });
    }

    playSound('gameStart', 0.5);
    setGamePhase('waiting');
    setRound(1);
    setScore(0);
    setCorrectAnswers(0);
    setStreak(0);
    setUsedConfigIds(new Set());
  }, [gameRoomCode, isHostInRoom, broadcastGameEvent, playSound]);

  const nextRound = useCallback(async () => {
    if (round >= totalRounds) {
      return;
    }

    const newRound = round + 1;
    const newRoundEndsAt = startRoundTimer();
    
    setRound(newRound);
    setHasAnsweredThisRound(false);
    setChatMessages([]);
    setRepeatCount(0);
    setShowAnimation(false); // Reset animation state
    setGamePhase('playing');
    playSound('gameStart', 0.5);
    
    // Broadcast next round for joiners (host broadcasts)
    if (gameRoomCode && isHostInRoom) {
      await broadcastGameEvent('next_round', { round: newRound, roundEndsAt: newRoundEndsAt });
    }
    
    fetchRandomConfig(usedConfigIds);
  }, [round, totalRounds, fetchRandomConfig, playSound, usedConfigIds, startRoundTimer, gameRoomCode, isHostInRoom, broadcastGameEvent]);
  
  // Listen for next_round from host (joiners)
  useEffect(() => {
    if (isHostInRoom) return;
    if (!gameRoomCode) return;
    if (!gameEvent || gameEvent.type !== 'next_round') return;
    
    const payload = gameEvent.payload as { round: number; roundEndsAt: number };
    setRound(payload.round);
    startRoundTimer(payload.roundEndsAt);
    setHasAnsweredThisRound(false);
    setChatMessages([]);
    setRepeatCount(0);
    setShowAnimation(false);
    setGamePhase('playing');
    playSound('gameStart', 0.5);
  }, [gameEvent, isHostInRoom, gameRoomCode, startRoundTimer, playSound]);

  // Called by GameLobby when game starts (host clicks Start, or joiner receives broadcast)
  const handleLobbyStart = useCallback(
    async (payload: { difficulties: Difficulty[]; roomCode?: string; isHost: boolean; startPayload?: unknown; playerName: string }) => {
      const normalizedRoom = payload.roomCode?.toUpperCase();
      if (normalizedRoom) setGameRoomCode(normalizedRoom);

      setDisplayName(payload.playerName);
      setIsHostInRoom(payload.isHost);
      setSelectedDifficulties(payload.difficulties);
      setUsedConfigIds(new Set());

      // For joiners: show "ready" screen so they click → provides user gesture for autoplay with sound
      if (!payload.isHost && normalizedRoom) {
        pendingStartRef.current = {
          difficulties: payload.difficulties,
          roomCode: normalizedRoom,
          startPayload: payload.startPayload,
          playerName: payload.playerName,
        };
        setGamePhase('ready');
        return;
      }

      // Host starts immediately (they just clicked, so gesture is fresh)
      await startGamePlay(payload.difficulties, payload.startPayload);
    },
    []
  );

  // Actually starts playing (called after user gesture is guaranteed)
  const startGamePlay = useCallback(
    async (difficulties: Difficulty[], startPayload?: unknown) => {
      const firstDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

      playSound('gameStart', 0.6);
      setGamePhase('playing');
      startRoundTimer((startPayload as any)?.roundEndsAt);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      setRepeatCount(0);
      setHasAnsweredThisRound(false);
      setChatMessages([
        {
          id: 'start',
          username: 'Sistema',
          message: '¡Escucha el video y completa la palabra que falta!',
          type: 'system',
          timestamp: new Date(),
        },
      ]);
      setRound(1);
      await fetchRandomConfig(new Set(), firstDifficulty);
    },
    [playSound, fetchRandomConfig, startRoundTimer]
  );

  // Joiner clicks "Start" on ready screen → triggers user gesture → start with sound
  const handleReadyClick = useCallback(async () => {
    const pending = pendingStartRef.current;
    if (!pending) return;
    pendingStartRef.current = null;
    await startGamePlay(pending.difficulties, pending.startPayload);
  }, [startGamePlay]);

  const handleSendMessage = async (message: string) => {
    if (!blankSubtitle || gamePhase !== 'playing') return;
    if (hasAnsweredThisRound) return;

    const normalizedAnswer = message.toLowerCase().trim();
    const isCorrect = normalizedAnswer === blankSubtitle.hiddenWord;
    const now = new Date();

    // Add user's message (only visible to them - not broadcasted to avoid showing correct answers)
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      username,
      message,
      type: 'message',
      timestamp: now,
      isCurrentUser: true,
    };
    setChatMessages((prev) => [...prev, userMessage]);
    // Note: We intentionally do NOT broadcast chat messages to avoid showing correct answers to other players

    if (isCorrect) {
      playSound('correct', 0.6);
      setHasAnsweredThisRound(true);

      const basePoints = 10;
      const timeBonus = Math.floor(timeLeft / 5);
      const streakBonus = streak * 2;
      const pointsEarned = basePoints + timeBonus + streakBonus;

      const newScore = score + pointsEarned;
      const newCorrectAnswers = correctAnswers + 1;
      const newStreak = streak + 1;

      setScore(newScore);
      setCorrectAnswers(newCorrectAnswers);
      setStreak(newStreak);

      await updateScore(newScore, newCorrectAnswers, newStreak);
      await broadcastCorrectAnswer(message, pointsEarned);

      setAnimationWord(message.toUpperCase());
      setAnimationPoints(pointsEarned);
      setShowAnimation(true);

      setTimeout(() => {
        const correctMessage: ChatMessage = {
          id: `correct-${Date.now()}`,
          username,
          message: '',
          type: 'correct',
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, correctMessage]);
      }, 100);
    } else {
      playSound('wrong', 0.4);
      setStreak(0);
      await updateScore(score, correctAnswers, 0);
    }
  };

  const handleRepeatSubtitle = useCallback(() => {
    if (!ytPlayerRef.current || !subtitleConfig?.subtitles) return;
    if (repeatCount >= MAX_REPEATS) return;

    const subtitles = subtitleConfig.subtitles as SubtitleItem[];
    const targetIndex = subtitleConfig.target_subtitle_index ?? currentSubtitleIndex;
    const targetSub = subtitles[targetIndex];
    
    if (targetSub) {
      playSound('repeat', 0.4);
      setIsPausedOnTarget(false);
      setRepeatCount(prev => prev + 1);
      ytPlayerRef.current.seekTo(targetSub.startTime, true);
      ytPlayerRef.current.playVideo();
      
      // Add chat message for repeat
      const repeatMessage: ChatMessage = {
        id: `repeat-${Date.now()}`,
        username,
        message: `repitió el clip (${repeatCount + 1}/${MAX_REPEATS})`,
        type: 'system',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, repeatMessage]);
      
      // Broadcast to sync with other players
      if (gameRoomCode) {
        broadcastGameEvent('repeat_clip', { 
          startTime: targetSub.startTime,
          roomCode: gameRoomCode,
          username,
          repeatNumber: repeatCount + 1,
        });
      }
    }
  }, [subtitleConfig, currentSubtitleIndex, gameRoomCode, broadcastGameEvent, repeatCount, username, playSound]);

  // Listen for repeat_clip events from other players
  useEffect(() => {
    if (!gameEvent || gameEvent.type !== 'repeat_clip') return;
    
    const payload = gameEvent.payload as { startTime: number; roomCode: string; username: string; repeatNumber: number };
    if (payload.roomCode === gameRoomCode && ytPlayerRef.current) {
      playSound('repeat', 0.4);
      setIsPausedOnTarget(false);
      setRepeatCount(payload.repeatNumber);
      ytPlayerRef.current.seekTo(payload.startTime, true);
      ytPlayerRef.current.playVideo();
      
      // Add chat message for remote repeat (only if not from current user)
      if (payload.username !== username) {
        const repeatMessage: ChatMessage = {
          id: `repeat-remote-${Date.now()}`,
          username: payload.username,
          message: `repitió el clip (${payload.repeatNumber}/${MAX_REPEATS})`,
          type: 'system',
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, repeatMessage]);
      }
    }
  }, [gameEvent, gameRoomCode, username, playSound]);

  // Check if current subtitle is the target
  const isOnTargetSubtitle = subtitleConfig?.target_subtitle_index !== null && 
                              subtitleConfig?.target_subtitle_index !== undefined &&
                              currentSubtitleIndex === subtitleConfig.target_subtitle_index;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show microlesson between rounds
  if (gamePhase === 'microlesson') {
    return (
      <MicroLesson
        word={microlessonWord}
        context={microlessonContext}
        duration={10}
        onComplete={() => setGamePhase('ranking')}
        pregeneratedMeaning={microlessonMeaning}
        pregeneratedExamples={microlessonExamples}
      />
    );
  }

  // Show ranking between rounds
  if (gamePhase === 'ranking') {
    const isLastRound = round >= totalRounds;
    const rankingPlayers = players.length > 0 ? players : [
      { rank: 1, username, points: score, correctAnswers, streak, isCurrentUser: true }
    ];

    return (
      <>
        <RoundRanking
          players={rankingPlayers}
          roundNumber={round}
          totalRounds={totalRounds}
          countdownSeconds={5}
          onCountdownComplete={isLastRound ? handlePlayAgain : nextRound}
          isLastRound={isLastRound}
          allPlayersCorrect={false}
          isSoloMode={playerCount <= 1}
        />
        <div className="w-80 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Resumen de la ronda</h3>
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-2">Palabras acertadas</p>
            <span className="text-4xl font-black text-primary">{correctAnswers}</span>
            <p className="text-sm text-muted-foreground mt-4">
              {isLastRound ? 'Puntuación final' : 'Prepárate para la siguiente ronda'}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Ready phase (joiner clicks to start with sound)
  if (gamePhase === 'ready') {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#1c1f2e] to-[#141625] border border-white/10 shadow-2xl text-center"
        >
          <h1 className="text-3xl font-black text-white mb-4">¡Listo para jugar!</h1>
          <p className="text-white/60 mb-8">Toca el botón para iniciar con sonido</p>
          <Button
            onClick={handleReadyClick}
            size="lg"
            className="px-8 py-6 text-lg gap-2"
          >
            <Zap className="h-5 w-5" />
            ¡Empezar!
          </Button>
        </motion.div>
      </div>
    );
  }

  // Lobby phase
  if (gamePhase === 'waiting') {
    return (
      <GameLobby
        gameSlug="the-movie-interpreter"
        onStartGame={handleLobbyStart}
        initialRoomCode={roomCode}
        existingRoomCode={gameRoomCode}
        isHostReturning={isHostInRoom && !!gameRoomCode}
        multiplayerEnabled={multiplayerEnabled}
      />
    );
  }

  const subtitles = subtitleConfig?.subtitles as SubtitleItem[] | null;
  const totalSubtitles = subtitles?.length ?? 0;

  return (
    <>
      {/* Correct answer animation */}
      <CorrectAnswerAnimation
        points={animationPoints}
        isVisible={showAnimation}
        onComplete={() => setShowAnimation(false)}
      />

      {/* Game Area */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        {/* Header Stats */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={20} />
              <span className="font-bold text-lg">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock
                className={`${timeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}
                size={20}
              />
              <span className={`font-bold text-lg ${timeLeft <= 10 ? 'text-destructive' : ''}`}>
                {timeLeft}s
              </span>
            </div>
            {streak > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full">
                <span className="text-sm font-bold text-orange-400">🔥 x{streak}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 bg-secondary rounded-full">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" />
              )}
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{playerCount}</span>
            </div>
            <span className="text-sm text-muted-foreground">Ronda {round}/{totalRounds}</span>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 max-h-[50vh] relative bg-black rounded-lg overflow-hidden">
            <div id="yt-player" className="absolute inset-0" />
            {/* Overlay to prevent clicking on video */}
            <div className="absolute inset-0 z-10" />

            {needsUserPlay && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setNeedsUserPlay(false);
                    try {
                      ytPlayerRef.current?.unMute?.();
                    } catch {
                      // ignore
                    }
                    try {
                      ytPlayerRef.current?.playVideo?.();
                    } catch {
                      // ignore
                    }
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tocar para reproducir
                </Button>
              </div>
            )}
          </div>

          {/* Subtitle Display */}
          <div className="mt-4">
            <div className={cn(
              "bg-card border border-border rounded-xl p-6 min-h-[120px] flex flex-col justify-center items-center relative",
              hasAnsweredThisRound && "border-green-500/50 bg-green-500/5"
            )}>
              {/* Subtitle counter */}
              {totalSubtitles > 0 && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {currentSubtitleIndex + 1}/{totalSubtitles}
                  </span>
                </div>
              )}

              {/* Repeat button - only visible on target subtitle */}
              {isOnTargetSubtitle && isPausedOnTarget && !hasAnsweredThisRound && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-3 right-3"
                >
                  <Button
                    variant={repeatCount >= MAX_REPEATS ? "outline" : "default"}
                    size="sm"
                    className={cn(
                      "gap-2 transition-all",
                      repeatCount >= MAX_REPEATS 
                        ? "opacity-50 cursor-not-allowed" 
                        : "animate-pulse hover:animate-none"
                    )}
                    onClick={handleRepeatSubtitle}
                    disabled={repeatCount >= MAX_REPEATS}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Repetir ({MAX_REPEATS - repeatCount})</span>
                  </Button>
                </motion.div>
              )}

              {blankSubtitle ? (
                <div className="text-center">
                  <p className={cn(
                    "text-xl md:text-2xl font-semibold transition-colors",
                    hasAnsweredThisRound ? "text-green-400" : "text-foreground"
                  )}>
                    {hasAnsweredThisRound
                      ? blankSubtitle.originalText.replace(/\n/g, ' ')
                      : blankSubtitle.displayText.split('____').map((part, i, arr) => (
                          <span key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <span className="inline-block min-w-[80px] mx-1 border-b-2 border-primary bg-primary/10 rounded px-2 py-0.5">
                                &nbsp;
                              </span>
                            )}
                          </span>
                        ))
                    }
                  </p>
                  {hasAnsweredThisRound && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-green-400 text-sm mt-2 flex items-center justify-center gap-1"
                    >
                      ✓ ¡Correcto!
                    </motion.p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">
                  Esperando subtítulo...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat */}
      <ParticipationChat
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        placeholder="Escribe la palabra que falta..."
        disabled={hasAnsweredThisRound}
      />
    </>
  );
}
