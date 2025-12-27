import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, RefreshCw, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import CorrectAnswerAnimation from './shared/CorrectAnswerAnimation';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';
import GameLobby from './shared/GameLobby';
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
  // New fields for predefined hidden word
  target_subtitle_index: number | null;
  hidden_word: string | null;
  hidden_word_index: number | null;
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

type GamePhase = 'waiting' | 'playing' | 'ranking';

interface TheMovieInterpreterGameProps {
  roomCode?: string;
  onBack?: () => void;
}

export default function TheMovieInterpreterGame({ roomCode, onBack }: TheMovieInterpreterGameProps) {
  const { playSound, preloadSounds } = useGameSounds();

  const [displayName, setDisplayName] = useState('');
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>(undefined);
  const [isHostInRoom, setIsHostInRoom] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('medium');

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
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isPausedOnTarget, setIsPausedOnTarget] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

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

  // Add remote chat messages
  useEffect(() => {
    remoteChatMessages.forEach((msg) => {
      if (msg.username !== username) {
        const newMessage: ChatMessage = {
          id: `remote-${msg.timestamp}-${msg.username}`,
          username: msg.username,
          message: msg.message,
          type: 'message',
          timestamp: new Date(msg.timestamp),
          isCurrentUser: false,
        };
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }
    });
  }, [remoteChatMessages, username]);

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
        },
        events: {
          onReady: (event: any) => {
            event.target.seekTo(startTime, true);
            event.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === (window as any).YT.PlayerState.PAUSED) {
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

  const fetchRandomConfig = useCallback(async (excludeIds: Set<string>) => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('subtitle_configs')
      .select('*')
      .not('hidden_word', 'is', null); // Only fetch configs with hidden word configured

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
    };

    setSubtitleConfig(config);
    setUsedConfigIds(prev => new Set(prev).add(config.id));
    setCurrentSubtitleIndex(-1); // Start at -1 so first subtitle triggers update
    setBlankSubtitle(null);
    setIsPausedOnTarget(false);

    setHasAnsweredThisRound(false);
    setIsLoading(false);
  }, []);

  const endRound = useCallback(() => {
    setGamePhase('ranking');
    if (ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }
  }, []);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (!roundEndsAt) {
      startRoundTimer();
      return;
    }

    const timer = window.setInterval(() => {
      const remainingMs = roundEndsAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSec !== lastTimerSecondRef.current) {
        if (remainingSec <= 6 && remainingSec > 1) {
          playSound('tick', 0.3);
        }

        if (remainingSec <= 0 && lastTimerSecondRef.current > 0) {
          playSound('roundEnd', 0.6);
          endRound();
        }

        lastTimerSecondRef.current = remainingSec;
        setTimeLeft(remainingSec);
      }
    }, 250);

    return () => window.clearInterval(timer);
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

  const nextRound = useCallback(() => {
    if (round >= totalRounds) {
      return;
    }

    setRound((r) => r + 1);
    startRoundTimer();
    setHasAnsweredThisRound(false);
    setChatMessages([]);
    setGamePhase('playing');
    playSound('gameStart', 0.5);
    fetchRandomConfig(usedConfigIds);
  }, [round, totalRounds, fetchRandomConfig, playSound, usedConfigIds, startRoundTimer]);

  const handleLobbyStart = useCallback(
    async (payload: { difficulty: Difficulty; roomCode?: string; isHost: boolean; startPayload?: unknown; playerName: string }) => {
      const normalizedRoom = payload.roomCode?.toUpperCase();
      if (normalizedRoom) setGameRoomCode(normalizedRoom);

      setDisplayName(payload.playerName);
      setIsHostInRoom(payload.isHost);
      setCurrentDifficulty(payload.difficulty);
      setUsedConfigIds(new Set());

      playSound('gameStart', 0.6);
      setGamePhase('playing');
      startRoundTimer((payload.startPayload as any)?.roundEndsAt);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
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
      await fetchRandomConfig(new Set());
    },
    [playSound, fetchRandomConfig, startRoundTimer]
  );

  const handleSendMessage = async (message: string) => {
    if (!blankSubtitle || gamePhase !== 'playing') return;
    if (hasAnsweredThisRound) return;

    const normalizedAnswer = message.toLowerCase().trim();
    const isCorrect = normalizedAnswer === blankSubtitle.hiddenWord;
    const now = new Date();

    // Add user's message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      username,
      message,
      type: 'message',
      timestamp: now,
      isCurrentUser: true,
    };
    setChatMessages((prev) => [...prev, userMessage]);

    // Broadcast message
    await broadcastChatMessage(message);

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

  const handleRepeatSubtitle = () => {
    if (!ytPlayerRef.current || !subtitleConfig?.subtitles) return;

    const subtitles = subtitleConfig.subtitles as SubtitleItem[];
    const currentSub = subtitles[currentSubtitleIndex];
    if (currentSub) {
      setIsPausedOnTarget(false);
      ytPlayerRef.current.seekTo(currentSub.startTime, true);
      ytPlayerRef.current.playVideo();
    }
  };

  const togglePlayPause = () => {
    if (!ytPlayerRef.current) return;
    // Don't allow resuming if paused on target subtitle
    if (isPausedOnTarget && !isPlaying) return;
    
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
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

  // Lobby phase
  if (gamePhase === 'waiting') {
    return (
      <GameLobby
        gameSlug="the-movie-interpreter"
        onStartGame={handleLobbyStart}
        initialRoomCode={roomCode}
        existingRoomCode={gameRoomCode}
        isHostReturning={isHostInRoom && !!gameRoomCode}
      />
    );
  }

  const subtitles = subtitleConfig?.subtitles as SubtitleItem[] | null;
  const totalSubtitles = subtitles?.length ?? 0;

  return (
    <>
      {/* Correct answer animation */}
      <CorrectAnswerAnimation
        word={animationWord}
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
            
            {/* Play/Pause overlay button - hidden when paused on target */}
            {!isPausedOnTarget && (
              <button
                onClick={togglePlayPause}
                className="absolute bottom-4 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
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

              {/* Repeat button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8"
                onClick={handleRepeatSubtitle}
                title="Repetir frase"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

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
