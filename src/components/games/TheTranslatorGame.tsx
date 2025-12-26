import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, Languages, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';
import GameLobby from './shared/GameLobby';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';

type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyOption {
  value: Difficulty;
  label: string;
  levels: string;
  color: string;
  bgColor: string;
}

const difficultyOptions: DifficultyOption[] = [
  { value: 'easy', label: 'Easy', levels: 'A1, A2', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30' },
  { value: 'medium', label: 'Medium', levels: 'B1, B2', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30' },
  { value: 'hard', label: 'Hard', levels: 'C1, C2', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30' },
];
// Removed inline GameLobbyInline - now using shared GameLobby component

interface TranslatorPhrase {
  id: string;
  spanish_text: string;
  english_translation: string;
  difficulty: string;
  category: string | null;
  gif: string | null;
}

type GamePhase = 'waiting' | 'playing' | 'reveal' | 'ranking';

interface TheTranslatorGameProps {
  roomCode?: string;
  onBack?: () => void;
}

export default function TheTranslatorGame({ roomCode, onBack }: TheTranslatorGameProps) {
  const { playSound, preloadSounds } = useGameSounds();

  const [displayName, setDisplayName] = useState('');
  // Don't connect to game channel until game starts (displayName is set)
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>(undefined);
  const [isHostInRoom, setIsHostInRoom] = useState(false);

  const {
    players,
    playerCount,
    isConnected,
    username,
    oderId,
    updateScore,
    broadcastCorrectAnswer,
    correctAnswerEvents,
    gameEvent,
    broadcastGameEvent,
    chatMessages: remoteChatMessages,
    broadcastChatMessage,
    clearChatMessages,
  } = useMultiplayerGame('the-translator', gameRoomCode, displayName || undefined);

  const [currentPhrase, setCurrentPhrase] = useState<TranslatorPhrase | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [isLoading, setIsLoading] = useState(false);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('medium');

  // Preload sounds on mount
  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

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

  // Add remote chat messages from other players
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

  const pickRandomPhraseId = useCallback(async (difficulty: Difficulty): Promise<string | null> => {
    const { data, error } = await supabase
      .from('translator_phrases')
      .select('id')
      .eq('is_active', true)
      .eq('difficulty', difficulty);

    let pool = data as { id: string }[] | null;

    if (error || !pool || pool.length === 0) {
      const { data: fallbackData } = await supabase
        .from('translator_phrases')
        .select('id')
        .eq('is_active', true);

      pool = (fallbackData as { id: string }[] | null) ?? null;
    }

    if (!pool || pool.length === 0) {
      toast.error('No hay frases disponibles');
      return null;
    }

    return pool[Math.floor(Math.random() * pool.length)].id;
  }, []);

  const fetchPhraseById = useCallback(async (phraseId: string) => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('translator_phrases')
      .select('*')
      .eq('id', phraseId)
      .single();

    if (error || !data) {
      console.error('Error loading phrase:', error);
      toast.error('No se pudo cargar la frase');
      setIsLoading(false);
      return;
    }

    setCurrentPhrase(data as TranslatorPhrase);
    setHasAnsweredCorrectly(false);
    setIsLoading(false);
  }, []);

  const fetchRandomPhrase = useCallback(async (difficulty: Difficulty) => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('translator_phrases')
      .select('*')
      .eq('is_active', true)
      .eq('difficulty', difficulty);

    if (error || !data || data.length === 0) {
      // Fallback: fetch any phrase if no phrases for this difficulty
      const { data: fallbackData } = await supabase
        .from('translator_phrases')
        .select('*')
        .eq('is_active', true);

      if (!fallbackData || fallbackData.length === 0) {
        toast.error('No hay frases disponibles');
        setIsLoading(false);
        return;
      }
      const randomPhrase = fallbackData[Math.floor(Math.random() * fallbackData.length)] as TranslatorPhrase;
      setCurrentPhrase(randomPhrase);
      setHasAnsweredCorrectly(false);
      setIsLoading(false);
      return;
    }

    const randomPhrase = data[Math.floor(Math.random() * data.length)] as TranslatorPhrase;
    setCurrentPhrase(randomPhrase);
    setHasAnsweredCorrectly(false);
    setIsLoading(false);
  }, []);

  // Joiners: receive phrase sync from host during the match
  useEffect(() => {
    if (isHostInRoom) return;
    if (!gameRoomCode) return;
    if (!gameEvent || gameEvent.type !== 'translator_phrase') return;

    const p = gameEvent.payload as any;
    if (!p?.phraseId) return;

    console.log('Translator synced phrase:', p);

    if (typeof p.round === 'number') {
      setRound(p.round);
    }

    // Bring player back to play state if needed
    setGamePhase('playing');
    setTimeLeft(30);
    setHasAnsweredCorrectly(false);
    setChatMessages([]);

    fetchPhraseById(p.phraseId);
  }, [gameEvent, isHostInRoom, gameRoomCode, fetchPhraseById]);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 6 && prev > 1) {
          playSound('tick', 0.3);
        }
        if (prev <= 1) {
          playSound('roundEnd', 0.6);
          setGamePhase('reveal');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, timeLeft, playSound]);

  // Auto transition from reveal to ranking
  useEffect(() => {
    if (gamePhase !== 'reveal') return;

    const timer = setTimeout(() => {
      setGamePhase('ranking');
    }, 4000);

    return () => clearTimeout(timer);
  }, [gamePhase]);

  const nextRound = useCallback(async () => {
    if (round >= totalRounds) {
      toast.success(`¡Juego terminado! Puntuación final: ${score}`);
      playSound('roundEnd', 0.7);
      setGamePhase('waiting');
      setRound(1);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      setIsHostInRoom(false);
      return;
    }

    const nextRoundNumber = round + 1;

    setRound(nextRoundNumber);
    setTimeLeft(30);
    setHasAnsweredCorrectly(false);
    setChatMessages([]);
    setGamePhase('playing');
    playSound('gameStart', 0.5);

    // Host selects and broadcasts; joiners will receive via game_event
    if (gameRoomCode && isHostInRoom) {
      const phraseId = await pickRandomPhraseId(currentDifficulty);
      if (!phraseId) return;

      await fetchPhraseById(phraseId);
      await broadcastGameEvent('translator_phrase', { phraseId, round: nextRoundNumber });
      return;
    }

    await fetchRandomPhrase(currentDifficulty);
  }, [
    round,
    totalRounds,
    score,
    playSound,
    gameRoomCode,
    isHostInRoom,
    pickRandomPhraseId,
    currentDifficulty,
    fetchPhraseById,
    broadcastGameEvent,
    fetchRandomPhrase,
  ]);

  const handleLobbyStart = useCallback(
    async (payload: { difficulty: Difficulty; roomCode?: string; isHost: boolean; startPayload?: unknown; playerName: string }) => {
      const normalizedRoom = payload.roomCode?.toUpperCase();
      if (normalizedRoom) setGameRoomCode(normalizedRoom);

      setDisplayName(payload.playerName);
      setIsHostInRoom(payload.isHost);
      setCurrentDifficulty(payload.difficulty);

      playSound('gameStart', 0.6);
      setGamePhase('playing');
      setTimeLeft(30);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      setHasAnsweredCorrectly(false);
      setChatMessages([
        {
          id: 'start',
          username: 'Sistema',
          message: '¡La ronda ha comenzado! Traduce la frase al inglés.',
          type: 'system',
          timestamp: new Date(),
        },
      ]);
      setRound(1);

      const phraseId = (payload.startPayload as any)?.phraseId as string | undefined;
      if (phraseId) {
        await fetchPhraseById(phraseId);
        return;
      }

      // Fallback (solo play or if start payload wasn't provided)
      await fetchRandomPhrase(payload.difficulty);
    },
    [playSound, fetchPhraseById, fetchRandomPhrase]
  );

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?¿¡]/g, '')
      .replace(/\s+/g, ' ');
  };

  const checkAnswer = (answer: string): { isCorrect: boolean; similarity: number } => {
    if (!currentPhrase) return { isCorrect: false, similarity: 0 };

    const normalizedAnswer = normalizeText(answer);
    const normalizedCorrect = normalizeText(currentPhrase.english_translation);

    // Exact match
    if (normalizedAnswer === normalizedCorrect) {
      return { isCorrect: true, similarity: 1 };
    }

    // Calculate similarity (simple word matching)
    const answerWords = normalizedAnswer.split(' ');
    const correctWords = normalizedCorrect.split(' ');
    
    let matchCount = 0;
    answerWords.forEach(word => {
      if (correctWords.includes(word)) matchCount++;
    });
    
    const similarity = matchCount / Math.max(answerWords.length, correctWords.length);
    
    // Consider correct if similarity > 0.8
    const isCorrect = similarity >= 0.8;
    
    return { isCorrect, similarity };
  };

  const handleSendMessage = async (message: string) => {
    if (!currentPhrase || gamePhase !== 'playing') return;

    const { isCorrect, similarity } = checkAnswer(message);
    const now = new Date();

    // Add user's message locally
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      username,
      message,
      type: 'message',
      timestamp: now,
      isCurrentUser: true,
    };
    setChatMessages((prev) => [...prev, userMessage]);

    // Broadcast message to other players (only if not correct, correct ones are hidden)
    if (!isCorrect && gameRoomCode) {
      await broadcastChatMessage(message);
    }

    if (hasAnsweredCorrectly) {
      // Already answered correctly, ignore
      const feedbackMessage: ChatMessage = {
        id: `feedback-${Date.now()}`,
        username: 'Sistema',
        message: '¡Ya has acertado esta ronda!',
        type: 'system',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, feedbackMessage]);
      return;
    }

    if (isCorrect) {
      playSound('correct', 0.6);
      setHasAnsweredCorrectly(true);

      // Calculate points
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

      // Add correct message
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
      
      // Give feedback based on similarity
      let feedbackText = '';
      if (similarity >= 0.5) {
        feedbackText = '¡Casi! Revisa tu respuesta.';
      } else if (similarity >= 0.3) {
        feedbackText = 'Vas por buen camino, pero hay errores.';
      } else {
        feedbackText = 'Incorrecto. Intenta de nuevo.';
      }

      const feedbackMessage: ChatMessage = {
        id: `feedback-${Date.now()}`,
        username: 'Sistema',
        message: feedbackText,
        type: 'system',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, feedbackMessage]);

      // Reset streak on wrong answer
      setStreak(0);
      await updateScore(score, correctAnswers, 0);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'hard':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Medio';
      case 'hard':
        return 'Difícil';
      default:
        return difficulty;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show reveal phase
  if (gamePhase === 'reveal') {
    return (
      <>
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-2xl"
          >
            <Languages className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Traducción correcta
            </h2>
            <div className="bg-secondary/50 rounded-xl p-6 mb-4">
              <p className="text-muted-foreground mb-2">Español:</p>
              <p className="text-xl text-foreground mb-4">{currentPhrase?.spanish_text}</p>
              <p className="text-muted-foreground mb-2">Inglés:</p>
              <p className="text-2xl font-bold text-primary">{currentPhrase?.english_translation}</p>
            </div>
            <p className="text-muted-foreground">
              {hasAnsweredCorrectly ? '¡Acertaste!' : 'Sigue practicando'}
            </p>
          </motion.div>
        </div>
        <div className="w-80 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Resultado</h3>
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-2">Tu puntuación</p>
            <span className="text-4xl font-black text-primary">{score}</span>
            <p className="text-sm text-muted-foreground mt-4">
              Siguiente ronda en unos segundos...
            </p>
          </div>
        </div>
      </>
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
          onCountdownComplete={nextRound}
          isLastRound={isLastRound}
        />
        <div className="w-80 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Resumen de la ronda</h3>
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-2">
              {hasAnsweredCorrectly ? '¡Traducción correcta!' : 'No acertaste'}
            </p>
            <span className="text-4xl font-black text-primary">{score}</span>
            <p className="text-sm text-muted-foreground mt-4">
              {isLastRound ? 'Puntuación final' : 'Prepárate para la siguiente ronda'}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Lobby / waiting room (single entry point)
  if (gamePhase === 'waiting') {
    return (
      <GameLobby
        gameSlug="the-translator"
        initialRoomCode={roomCode}
        buildStartPayload={async ({ difficulty }) => {
          const phraseId = await pickRandomPhraseId(difficulty);
          return { phraseId };
        }}
        onStartGame={handleLobbyStart}
      />
    );
  }

  return (
    <>
      {/* Game Area */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        {/* Header Stats */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={20} />
              <span className="font-bold text-foreground">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="text-orange-400" size={20} />
              <span className="font-medium text-foreground">{streak}x</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground" size={18} />
              <span className="text-sm text-muted-foreground">{playerCount}</span>
            </div>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="text-green-400" size={16} />
              ) : (
                <WifiOff className="text-red-400" size={16} />
              )}
            </div>
          </div>
        </div>

        {/* Main Game Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-2xl w-full">
            {/* Round & Timer */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="text-sm text-muted-foreground">
                Ronda {round}/{totalRounds}
              </span>
              <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full">
                <Clock className={`${timeLeft <= 10 ? 'text-red-400' : 'text-primary'}`} size={18} />
                <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-foreground'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Phrase Card */}
            {currentPhrase && (
              <motion.div
                key={currentPhrase.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border border-primary/30"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Languages className="text-primary" size={24} />
                  <span className={`text-sm font-medium ${getDifficultyColor(currentPhrase.difficulty)}`}>
                    {getDifficultyLabel(currentPhrase.difficulty)}
                  </span>
                </div>

                {/* GIF Display */}
                {currentPhrase.gif && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <img
                      src={currentPhrase.gif}
                      alt="Phrase illustration"
                      className="w-full max-w-xs mx-auto rounded-xl shadow-lg border border-border"
                    />
                  </motion.div>
                )}
                
                <p className="text-sm text-muted-foreground mb-2">Traduce al inglés:</p>
                <h2 className="text-3xl font-bold text-foreground">
                  {currentPhrase.spanish_text}
                </h2>

                {hasAnsweredCorrectly && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-4 flex items-center justify-center gap-2 text-green-400"
                  >
                    <Check size={24} />
                    <span className="font-bold">¡Correcto!</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Participation Chat */}
      {gamePhase === 'playing' && (
        <ParticipationChat
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          disabled={gamePhase !== 'playing'}
          placeholder="Escribe tu traducción..."
          currentUsername={username}
        />
      )}
    </>
  );
}
