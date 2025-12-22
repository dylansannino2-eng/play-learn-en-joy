import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import CorrectAnswerAnimation from './shared/CorrectAnswerAnimation';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';

interface WordBattleCard {
  id: string;
  prompt: string;
  category: string;
  letter: string;
  correct_answers: string[];
  difficulty: string;
}

type GamePhase = 'waiting' | 'playing' | 'ranking';

interface PlayerScore {
  rank: number;
  username: string;
  points: number;
  correctAnswers: number;
  streak: number;
  isCurrentUser: boolean;
}

export default function WordBattleGame() {
  const { user } = useAuth();
  const username = user?.email?.split('@')[0] || 'Jugador';
  
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

  // Mock players for ranking (in real app, this would come from Supabase Realtime)
  const [players, setPlayers] = useState<PlayerScore[]>([]);

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

  useEffect(() => {
    if (gamePhase !== 'playing' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, timeLeft]);

  const endRound = () => {
    setGamePhase('ranking');
    
    // Generate ranking with current user
    const mockPlayers: PlayerScore[] = [
      { rank: 1, username, points: score, correctAnswers, streak, isCurrentUser: true },
      { rank: 2, username: 'Player2', points: Math.floor(score * 0.8), correctAnswers: Math.floor(correctAnswers * 0.7), streak: 2, isCurrentUser: false },
      { rank: 3, username: 'Player3', points: Math.floor(score * 0.6), correctAnswers: Math.floor(correctAnswers * 0.5), streak: 1, isCurrentUser: false },
    ].sort((a, b) => b.points - a.points).map((p, i) => ({ ...p, rank: i + 1 }));
    
    setPlayers(mockPlayers);
  };

  const startGame = () => {
    setGamePhase('playing');
    setTimeLeft(30);
    setScore(0);
    setCorrectAnswers(0);
    setStreak(0);
    setUsedAnswers(new Set());
    setChatMessages([{
      id: 'start',
      username: 'Sistema',
      message: '¡La ronda ha comenzado!',
      type: 'system',
      timestamp: new Date()
    }]);
    setRound(1);
    fetchRandomCard();
  };

  const nextRound = () => {
    if (round >= totalRounds) {
      toast.success(`¡Juego terminado! Puntuación final: ${score}`);
      setGamePhase('waiting');
      return;
    }
    
    setRound((r) => r + 1);
    setTimeLeft(30);
    setUsedAnswers(new Set());
    setGamePhase('playing');
    fetchRandomCard();
    
    setChatMessages((prev) => [...prev, {
      id: `round-${round + 1}`,
      username: 'Sistema',
      message: `Ronda ${round + 1} de ${totalRounds}`,
      type: 'system',
      timestamp: new Date()
    }]);
  };

  const checkAnswer = (answer: string): boolean => {
    if (!currentCard) return false;
    
    const normalizedAnswer = answer.toLowerCase().trim();
    const isCorrect = currentCard.correct_answers.some(
      (correct) => correct.toLowerCase() === normalizedAnswer
    );
    
    return isCorrect && !usedAnswers.has(normalizedAnswer);
  };

  const handleSendMessage = (message: string) => {
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
      isCurrentUser: true
    };
    setChatMessages((prev) => [...prev, userMessage]);

    if (isCorrect) {
      const normalizedAnswer = message.toLowerCase().trim();
      setUsedAnswers((prev) => new Set(prev).add(normalizedAnswer));
      
      // Calculate points based on time and streak
      const basePoints = 10;
      const timeBonus = Math.floor(timeLeft / 5);
      const streakBonus = streak * 2;
      const pointsEarned = basePoints + timeBonus + streakBonus;
      
      setScore((prev) => prev + pointsEarned);
      setCorrectAnswers((prev) => prev + 1);
      setStreak((prev) => prev + 1);

      // Show animation
      setAnimationWord(message.toUpperCase());
      setAnimationPoints(pointsEarned);
      setShowAnimation(true);

      // Add "ha acertado" message for others to see
      setTimeout(() => {
        const correctMessage: ChatMessage = {
          id: `correct-${Date.now()}`,
          username,
          message: '',
          type: 'correct',
          timestamp: new Date()
        };
        setChatMessages((prev) => [...prev, correctMessage]);
      }, 100);
    } else {
      // Reset streak on wrong answer
      setStreak(0);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-muted-foreground';
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
    return (
      <>
        <RoundRanking
          players={players}
          roundNumber={round}
          totalRounds={totalRounds}
          onContinue={nextRound}
        />
        <ParticipationChat
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          disabled={true}
          currentUsername={username}
        />
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
              <Clock className={`${timeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} size={20} />
              <span className={`font-bold text-lg ${timeLeft <= 10 ? 'text-destructive' : ''}`}>{timeLeft}s</span>
            </div>
            {streak > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full">
                <span className="text-sm font-bold text-orange-400">🔥 x{streak}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Ronda {round}/{totalRounds}
            </span>
            <div className="flex items-center gap-2">
              <Zap className={getDifficultyColor(currentCard?.difficulty || 'medium')} size={18} />
              <span className={`text-sm font-medium ${getDifficultyColor(currentCard?.difficulty || 'medium')}`}>
                {currentCard?.difficulty === 'easy' ? 'Fácil' : currentCard?.difficulty === 'hard' ? 'Difícil' : 'Medio'}
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
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">Word Battle</h2>
              <p className="text-muted-foreground mb-8">
                ¡Adivina palabras en inglés antes de que se acabe el tiempo!
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors animate-pulse"
              >
                ▶ Comenzar Juego
              </button>
            </div>
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
