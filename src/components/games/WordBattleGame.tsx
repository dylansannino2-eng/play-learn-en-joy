import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Zap, Users, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import CorrectAnswerAnimation from './shared/CorrectAnswerAnimation';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';
import GameLobby from './shared/GameLobby';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';

const ROUND_SECONDS = 30;

type Difficulty = 'easy' | 'medium' | 'hard';

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

  const [displayName, setDisplayName] = useState('');
  // Don't connect to game channel until game starts (displayName is set)
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
  } = useMultiplayerGame('word-battle', gameRoomCode, displayName || undefined);

  const [currentCard, setCurrentCard] = useState<WordBattleCard | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [usedCardIds, setUsedCardIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const lastTimerSecondRef = useRef<number>(ROUND_SECONDS);

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

  const fetchRandomCard = useCallback(async (excludeIds: Set<string>) => {
    const { data, error } = await supabase
      .from('word_battle_cards')
      .select('*')
      .eq('is_active', true);

    if (error || !data || data.length === 0) {
      toast.error('No hay cartas disponibles');
      return;
    }

    // Filter out already used cards
    const availableCards = data.filter(card => !excludeIds.has(card.id));
    
    // If all cards used, reset and use full pool
    const finalPool = availableCards.length > 0 ? availableCards : data;

    const randomCard = finalPool[Math.floor(Math.random() * finalPool.length)] as WordBattleCard;
    setCurrentCard(randomCard);
    setUsedCardIds(prev => new Set(prev).add(randomCard.id));
    setUsedAnswers(new Set());
    setIsLoading(false);
  }, []);

  // Removed auto-fetch on mount - now starts from lobby

  const endRound = useCallback(() => {
    setGamePhase('ranking');
  }, []);

  // Timer (uses an absolute end timestamp so it doesn't "pause" when the tab is inactive)
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

  // Check if all players answered correctly - auto advance
  const hasAdvancedRef = useRef(false);
  
  useEffect(() => {
    hasAdvancedRef.current = false;
  }, [round]);
  
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (correctAnswers < round) return;
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
    
    // Multiplayer: only host broadcasts
    if (!isHostInRoom) return;
    
    const allAnswered = players.length > 0 && players.every(p => p.correctAnswers >= round);
    
    if (allAnswered) {
      hasAdvancedRef.current = true;
      setTimeout(async () => {
        playSound('roundEnd', 0.6);
        endRound();
        await broadcastGameEvent('round_advance', { round });
      }, 800);
    }
  }, [gamePhase, players, playerCount, round, correctAnswers, playSound, isHostInRoom, broadcastGameEvent, endRound]);

  // Listen for round advance from host (non-hosts)
  useEffect(() => {
    if (isHostInRoom) return;
    if (!gameRoomCode) return;
    if (!gameEvent || gameEvent.type !== 'round_advance') return;
    
    playSound('roundEnd', 0.6);
    endRound();
  }, [gameEvent, isHostInRoom, gameRoomCode, playSound, endRound]);

  // Handle return to lobby event from host
  useEffect(() => {
    if (!gameEvent) return;
    if (gameEvent.type === 'return_to_lobby') {
      console.log('Received return_to_lobby event');
      playSound('gameStart', 0.5);
      setGamePhase('waiting');
      setRound(1);
      setScore(0);
      setCorrectAnswers(0);
      setStreak(0);
      setUsedCardIds(new Set());
      // Don't reset gameRoomCode or isHostInRoom - keep players in the same room
    }
  }, [gameEvent, playSound]);

  const handlePlayAgain = useCallback(async () => {
    // If in a room, broadcast return to lobby
    if (gameRoomCode && isHostInRoom) {
      await broadcastGameEvent('return_to_lobby', { roomCode: gameRoomCode });
    }
    
    playSound('gameStart', 0.5);
    setGamePhase('waiting');
    setRound(1);
    setScore(0);
    setCorrectAnswers(0);
    setStreak(0);
    setUsedCardIds(new Set());
    // Don't reset gameRoomCode or isHostInRoom - keep players in the same room
  }, [gameRoomCode, isHostInRoom, broadcastGameEvent, playSound]);

  const nextRound = useCallback(() => {
    if (round >= totalRounds) {
      // Don't auto-reset here - let the "Jugar de Nuevo" button handle it
      return;
    }

    setRound((r) => r + 1);
    startRoundTimer();
    setUsedAnswers(new Set());
    setChatMessages([]);
    setGamePhase('playing');
    playSound('gameStart', 0.5);
    fetchRandomCard(usedCardIds);
  }, [round, totalRounds, fetchRandomCard, playSound, usedCardIds]);

  const handleLobbyStart = useCallback(
    async (payload: { difficulty: Difficulty; roomCode?: string; isHost: boolean; startPayload?: unknown; playerName: string }) => {
      const normalizedRoom = payload.roomCode?.toUpperCase();
      if (normalizedRoom) setGameRoomCode(normalizedRoom);

      setDisplayName(payload.playerName);
      setIsHostInRoom(payload.isHost);
      setCurrentDifficulty(payload.difficulty);
      setUsedCardIds(new Set());

      playSound('gameStart', 0.6);
      setGamePhase('playing');
      startRoundTimer((payload.startPayload as any)?.roundEndsAt);
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
      await fetchRandomCard(new Set());
    },
    [playSound, fetchRandomCard]
  );

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
    
    // Check if all players answered correctly this round
    const allPlayersCorrect = rankingPlayers.length > 0 && 
      rankingPlayers.every(p => p.correctAnswers > 0);
    
    return (
      <>
        <RoundRanking
          players={rankingPlayers}
          roundNumber={round}
          totalRounds={totalRounds}
          countdownSeconds={5}
          onCountdownComplete={isLastRound ? handlePlayAgain : nextRound}
          isLastRound={isLastRound}
          allPlayersCorrect={allPlayersCorrect}
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
            <GameLobby
              gameSlug="word-battle"
              initialRoomCode={roomCode}
              existingRoomCode={gameRoomCode}
              isHostReturning={isHostInRoom}
              initialPlayerName={displayName || undefined}
              onStartGame={handleLobbyStart}
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
