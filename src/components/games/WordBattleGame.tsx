import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Check, X, Trophy, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface WordBattleCard {
  id: string;
  prompt: string;
  category: string;
  letter: string;
  correct_answers: string[];
  difficulty: string;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  isCorrect?: boolean;
  time: string;
}

export default function WordBattleGame() {
  const { user } = useAuth();
  const [currentCard, setCurrentCard] = useState<WordBattleCard | null>(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState(0);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          toast.info(`¡Tiempo! Tu puntuación: ${score} puntos`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, score, timeLeft]);

  const startGame = () => {
    setIsPlaying(true);
    setTimeLeft(60);
    setScore(0);
    setUsedAnswers(new Set());
    setChatMessages([]);
    fetchRandomCard();
  };

  const nextCard = () => {
    fetchRandomCard();
    setUsedAnswers(new Set());
  };

  const checkAnswer = (answer: string): boolean => {
    if (!currentCard) return false;
    
    const normalizedAnswer = answer.toLowerCase().trim();
    const isCorrect = currentCard.correct_answers.some(
      (correct) => correct.toLowerCase() === normalizedAnswer
    );
    
    return isCorrect && !usedAnswers.has(normalizedAnswer);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !currentCard) return;

    const answer = message.trim();
    const isCorrect = checkAnswer(answer);
    const userName = user?.email?.split('@')[0] || 'Jugador';

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: userName,
      message: answer,
      isCorrect,
      time: 'ahora',
    };

    setChatMessages((prev) => [newMessage, ...prev]);
    setMessage('');

    if (isCorrect) {
      const normalizedAnswer = answer.toLowerCase().trim();
      setUsedAnswers((prev) => new Set(prev).add(normalizedAnswer));
      setScore((prev) => prev + 10);
      toast.success(`+10 puntos! "${answer}" es correcto`);
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

  return (
    <div className="flex gap-4 flex-1 min-h-0">
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
          </div>
          <div className="flex items-center gap-2">
            <Zap className={getDifficultyColor(currentCard?.difficulty || 'medium')} size={18} />
            <span className={`text-sm font-medium ${getDifficultyColor(currentCard?.difficulty || 'medium')}`}>
              {currentCard?.difficulty === 'easy' ? 'Fácil' : currentCard?.difficulty === 'hard' ? 'Difícil' : 'Medio'}
            </span>
          </div>
        </div>

        {/* Card Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {currentCard && (
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

          {!isPlaying && (
            <div className="mt-8 flex gap-4">
              <button
                onClick={startGame}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors"
              >
                {score > 0 ? 'Jugar de Nuevo' : '▶ Comenzar'}
              </button>
            </div>
          )}

          {isPlaying && (
            <button
              onClick={nextCard}
              className="mt-6 px-6 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
            >
              Siguiente Carta →
            </button>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="w-80 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
        <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-foreground">Chat de participación</h3>
          <p className="text-xs text-muted-foreground mt-1">Escribe tus respuestas aquí</p>
        </div>

        {/* Messages */}
        <div className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-hide">
          {chatMessages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {isPlaying ? 'Escribe una palabra para comenzar' : 'Presiona "Comenzar" para jugar'}
            </div>
          ) : (
            chatMessages.map((chat) => (
              <div key={chat.id} className="flex gap-2 items-start">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  chat.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive'
                }`}>
                  {chat.isCorrect ? <Check size={14} /> : <X size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">{chat.user}</span>
                    <span className="text-xs text-muted-foreground">{chat.time}</span>
                  </div>
                  <p className={`text-sm ${chat.isCorrect ? 'text-green-400' : 'text-muted-foreground line-through'}`}>
                    {chat.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && isPlaying && handleSendMessage()}
              placeholder={isPlaying ? 'Escribe una palabra...' : 'Inicia el juego primero'}
              disabled={!isPlaying}
              className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!isPlaying || !message.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
