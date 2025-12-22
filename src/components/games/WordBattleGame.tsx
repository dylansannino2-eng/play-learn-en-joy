import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, Play, Plus, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import CorrectAnswerAnimation from './shared/CorrectAnswerAnimation';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

interface GameLobbyInlineProps {
  isConnected: boolean;
  playerCount: number;
  onStartGame: () => void;
}

function GameLobbyInline({ isConnected, playerCount, onStartGame }: GameLobbyInlineProps) {
  const { user } = useAuth();
  const username = user?.email?.split('@')[0] || 'Jugador';
  
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
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
        game_slug: 'word-battle',
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

  const handleJoinRoom = async () => {
    if (joinCode.length !== 4) {
      toast.error('El código debe tener 4 caracteres');
      return;
    }
    setIsJoining(true);
    
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', joinCode.toUpperCase())
      .eq('game_slug', 'word-battle')
      .maybeSingle();

    if (error || !data) {
      toast.error('Sala no encontrada');
    } else if (data.status !== 'waiting') {
      toast.error('La partida ya comenzó');
    } else {
      window.location.href = `/game/word-battle?room=${joinCode.toUpperCase()}`;
    }
    setIsJoining(false);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/game/word-battle?room=${createdRoomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Enlace copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1 }
    })
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
                window.location.href = `/game/word-battle?room=${createdRoomCode}`;
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
    <div className="w-full max-w-4xl">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-2">Word Battle</h2>
        <p className="text-muted-foreground mb-4">
          ¡Adivina palabras en inglés antes de que se acabe el tiempo!
        </p>
        <div className="flex items-center justify-center gap-2 text-sm">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-400">
              <Wifi size={16} /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <WifiOff size={16} /> Conectando...
            </span>
          )}
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users size={16} /> {playerCount} jugador{playerCount !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Play Card */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl p-5 border border-primary/30"
        >
          <h3 className="text-lg font-bold text-foreground text-center mb-4">
            Jugar
          </h3>
          <button
            onClick={onStartGame}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Play size={20} />
            Juego Rápido
          </button>
        </motion.div>

        {/* Create Room Card */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl p-5 border border-accent/30"
        >
          <h3 className="text-lg font-bold text-foreground text-center mb-4">
            Crear Sala
          </h3>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full py-3 bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={20} />
            {isCreating ? 'Creando...' : 'Nueva Sala'}
          </button>
        </motion.div>

        {/* Join Room Card */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl p-5 border border-border"
        >
          <h3 className="text-lg font-bold text-foreground text-center mb-4">
            Unirse a Sala
          </h3>
          <div className="space-y-2">
            <Input
              placeholder="Código"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              className="text-center text-lg font-bold tracking-widest bg-background border-border"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isJoining || joinCode.length !== 4}
              className="w-full py-3 bg-foreground hover:bg-foreground/90 text-background font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Users size={20} />
              {isJoining ? 'Buscando...' : 'Unirse'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface WordBattleCard {
  id: string;
  prompt: string;
  category: string;
  letter: string;
  correct_answers: string[];
  difficulty: string;
}

type GamePhase = 'waiting' | 'playing' | 'ranking';

interface WordBattleGameProps {
  roomCode?: string;
  onBack?: () => void;
}

export default function WordBattleGame({ roomCode, onBack }: WordBattleGameProps) {
  const { playSound, preloadSounds } = useGameSounds();
  const {
    players,
    playerCount,
    isConnected,
    username,
    updateScore,
    broadcastCorrectAnswer,
    correctAnswerEvents,
  } = useMultiplayerGame('word-battle', roomCode);

  const [currentCard, setCurrentCard] = useState<WordBattleCard | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(30);
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [isLoading, setIsLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);

  // Animation state
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationWord, setAnimationWord] = useState('');
  const [animationPoints, setAnimationPoints] = useState(0);

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
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }
    });
  }, [correctAnswerEvents, username]);

  const fetchRandomCard = useCallback(async () => {
    const { data, error } = await supabase
      .from('word_battle_cards')
      .select('*')
      .eq('is_active', true);

    if (error || !data || data.length === 0) {
      toast.error('No hay cartas disponibles');
      return;
    }

    const randomCard = data[Math.floor(Math.random() * data.length)] as WordBattleCard;
    setCurrentCard(randomCard);
    setUsedAnswers(new Set());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRandomCard();
  }, [fetchRandomCard]);

  // Timer with sound effects
  useEffect(() => {
    if (gamePhase !== 'playing' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 6 && prev > 1) {
          playSound('tick', 0.3);
        }
        if (prev <= 1) {
          playSound('roundEnd', 0.6);
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, timeLeft, playSound]);

  const endRound = useCallback(() => {
    setGamePhase('ranking');
  }, []);

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
    setUsedAnswers(new Set());
    setChatMessages([]);
    setGamePhase('playing');
    playSound('gameStart', 0.5);
    fetchRandomCard();
  }, [round, totalRounds, score, fetchRandomCard, playSound]);

  const startGame = () => {
    playSound('gameStart', 0.6);
    setGamePhase('playing');
    setTimeLeft(30);
    setScore(0);
    setCorrectAnswers(0);
    setStreak(0);
    setUsedAnswers(new Set());
    setChatMessages([
      {
        id: 'start',
        username: 'Sistema',
        message: '¡La ronda ha comenzado!',
        type: 'system',
        timestamp: new Date(),
      },
    ]);
    setRound(1);
    fetchRandomCard();
  };

  const checkAnswer = (answer: string): boolean => {
    if (!currentCard) return false;

    const normalizedAnswer = answer.toLowerCase().trim();
    const isCorrect = currentCard.correct_answers.some(
      (correct) => correct.toLowerCase() === normalizedAnswer
    );

    return isCorrect && !usedAnswers.has(normalizedAnswer);
  };

  const handleSendMessage = async (message: string) => {
    if (!currentCard || gamePhase !== 'playing') return;

    const isCorrect = checkAnswer(message);
    const now = new Date();

    // Add user's message (only visible to them)
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      username,
      message,
      type: 'message',
      timestamp: now,
      isCurrentUser: true,
    };
    setChatMessages((prev) => [...prev, userMessage]);

    if (isCorrect) {
      playSound('correct', 0.6);

      const normalizedAnswer = message.toLowerCase().trim();
      setUsedAnswers((prev) => new Set(prev).add(normalizedAnswer));

      // Calculate points based on time and streak
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

      // Update multiplayer score
      await updateScore(newScore, newCorrectAnswers, newStreak);

      // Broadcast to other players
      await broadcastCorrectAnswer(message, pointsEarned);

      // Show animation
      setAnimationWord(message.toUpperCase());
      setAnimationPoints(pointsEarned);
      setShowAnimation(true);

      // Add "ha acertado" message for self
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
          onCountdownComplete={nextRound}
          isLastRound={isLastRound}
        />
        <div className="w-80 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Resumen de la ronda</h3>
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-2">Tus aciertos esta ronda</p>
            <span className="text-4xl font-black text-primary">{correctAnswers}</span>
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
            {/* Player count and connection status */}
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
            <div className="flex items-center gap-2">
              <Zap
                className={getDifficultyColor(currentCard?.difficulty || 'medium')}
                size={18}
              />
              <span
                className={`text-sm font-medium ${getDifficultyColor(currentCard?.difficulty || 'medium')}`}
              >
                {currentCard?.difficulty === 'easy'
                  ? 'Fácil'
                  : currentCard?.difficulty === 'hard'
                  ? 'Difícil'
                  : 'Medio'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {currentCard && gamePhase === 'playing' && (
            <div className="w-full max-w-lg">
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border border-primary/30 shadow-lg">
                <div className="text-center mb-4">
                  <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium mb-4">
                    {currentCard.category.charAt(0).toUpperCase() + currentCard.category.slice(1)}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center leading-relaxed">
                  {currentCard.prompt}
                </h2>
                <div className="mt-6 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-3xl font-black text-primary-foreground">
                      {currentCard.letter}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {usedAnswers.size} / {currentCard.correct_answers.length} respuestas encontradas
                </div>
              </div>
            </div>
          )}

          {gamePhase === 'waiting' && (
            <GameLobbyInline
              isConnected={isConnected}
              playerCount={playerCount}
              onStartGame={startGame}
            />
          )}
        </div>
      </div>

      {/* Chat */}
      <ParticipationChat
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        disabled={gamePhase !== 'playing'}
        currentUsername={username}
      />
    </>
  );
}
