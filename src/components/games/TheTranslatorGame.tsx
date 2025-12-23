import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, Play, Plus, Copy, Check, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { useAuth } from '@/contexts/AuthContext';

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

interface GameLobbyInlineProps {
  isConnected: boolean;
  playerCount: number;
  onStartGame: (difficulty: Difficulty) => void;
}

function GameLobbyInline({ isConnected, playerCount, onStartGame }: GameLobbyInlineProps) {
  const { user } = useAuth();
  const username = user?.email?.split('@')[0] || 'Jugador';
  
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRoomCreated, setShowRoomCreated] = useState(false);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    const code = generateCode();
    
    const { error } = await supabase
      .from('game_rooms')
      .insert({
        code,
        game_slug: 'the-translator',
        host_id: user?.id || null,
        host_name: username,
        status: 'waiting',
      });

    if (error) {
      toast.error('Error al crear la sala');
    } else {
      setCreatedRoomCode(code);
      setShowRoomCreated(true);
    }
    setIsCreating(false);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/game/the-translator?room=${createdRoomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Enlace copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  if (showRoomCreated) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl p-6 border border-primary/30">
          <h3 className="text-xl font-bold text-foreground text-center mb-2">
            ¡Sala Creada!
          </h3>
          <p className="text-muted-foreground text-center text-sm mb-4">
            Comparte el código con tus amigos
          </p>

          <div className="flex justify-center gap-2 mb-4">
            {createdRoomCode.split('').map((char, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center"
              >
                <span className="text-2xl font-black text-primary-foreground">{char}</span>
              </motion.div>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={copyRoomLink}
              className="w-full py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiado' : 'Copiar Enlace'}
            </button>
            <button
              onClick={() => {
                window.location.href = `/game/the-translator?room=${createdRoomCode}`;
              }}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Iniciar Partida
            </button>
            <button
              onClick={() => setShowRoomCreated(false)}
              className="w-full py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-md"
    >
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-2xl font-bold text-foreground text-center mb-4">
          Play
        </h2>
        
        {/* Difficulty Selection */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground text-center mb-3">Select difficulty</p>
          <div className="flex gap-2">
            {difficultyOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedDifficulty(option.value)}
                className={`flex-1 py-3 px-2 rounded-xl border transition-all ${
                  selectedDifficulty === option.value
                    ? `${option.bgColor} border-2`
                    : 'bg-secondary/50 border-border hover:bg-secondary'
                }`}
              >
                <span className={`block font-bold ${selectedDifficulty === option.value ? option.color : 'text-foreground'}`}>
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">{option.levels}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => onStartGame(selectedDifficulty)}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors"
          >
            Play
          </button>
          
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full py-3 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creando...' : 'Create room'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface TranslatorPhrase {
  id: string;
  spanish_text: string;
  english_translation: string;
  difficulty: string;
  category: string | null;
}

type GamePhase = 'waiting' | 'playing' | 'reveal' | 'ranking';

interface TheTranslatorGameProps {
  roomCode?: string;
  onBack?: () => void;
}

export default function TheTranslatorGame({ roomCode, onBack }: TheTranslatorGameProps) {
  const { playSound, preloadSounds } = useGameSounds();
  const {
    players,
    playerCount,
    isConnected,
    username,
    updateScore,
    broadcastCorrectAnswer,
    correctAnswerEvents,
  } = useMultiplayerGame('the-translator', roomCode);

  const [currentPhrase, setCurrentPhrase] = useState<TranslatorPhrase | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchRandomPhrase = useCallback(async (difficulty: Difficulty) => {
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

  useEffect(() => {
    fetchRandomPhrase(currentDifficulty);
  }, []);

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

  const nextRound = useCallback(() => {
    if (round >= totalRounds) {
      toast.success(`¡Juego terminado! Puntuación final: ${score}`);
      playSound('roundEnd', 0.7);
      setGamePhase('waiting');
      setRound(1);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      return;
    }

    setRound((r) => r + 1);
    setTimeLeft(30);
    setHasAnsweredCorrectly(false);
    setChatMessages([]);
    setGamePhase('playing');
    playSound('gameStart', 0.5);
    fetchRandomPhrase(currentDifficulty);
  }, [round, totalRounds, score, currentDifficulty, fetchRandomPhrase, playSound]);

  const startGame = (difficulty: Difficulty) => {
    setCurrentDifficulty(difficulty);
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
    fetchRandomPhrase(difficulty);
  };

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
          {gamePhase === 'waiting' ? (
            <GameLobbyInline
              isConnected={isConnected}
              playerCount={playerCount}
              onStartGame={startGame}
            />
          ) : (
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
          )}
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
