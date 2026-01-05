import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import CorrectAnswerAnimation from './shared/CorrectAnswerAnimation';
import MicroLesson from './shared/MicroLesson';
import ParticipationChat, { ChatMessage } from './shared/ParticipationChat';
import RoundRanking from './shared/RoundRanking';
import GameLobby from './shared/GameLobby';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';

const ROUND_SECONDS = 40; // Un poco más de tiempo para anagramas

interface AnagramCard {
  id: string;
  word: string;
  hint: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

type GamePhase = 'waiting' | 'playing' | 'microlesson' | 'ranking';

export default function AnagramGame({ roomCode, onBack }: { roomCode?: string, onBack?: () => void }) {
  const { playSound, preloadSounds } = useGameSounds();
  
  // --- Estados de Juego ---
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [currentCard, setCurrentCard] = useState<AnagramCard | null>(null);
  const [scrambledWord, setScrambledWord] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>(undefined);
  const [isHostInRoom, setIsHostInRoom] = useState(false);
  
  // --- Lógica de Puntuación ---
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);

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
  } = useMultiplayerGame('anagram-battle', gameRoomCode, displayName || undefined);

  // --- Utilidad para desordenar letras ---
  const scramble = (word: string) => {
    return word.split('').sort(() => Math.random() - 0.5).join('').toUpperCase();
  };

  const fetchCard = useCallback(async (difficulty: string) => {
    // Note: anagram_cards table doesn't exist yet - placeholder for future implementation
    console.log('Fetching anagram card for difficulty:', difficulty);
    // TODO: Create anagram_cards table and populate with data
  }, []);

  // --- Manejo de Respuesta ---
  const handleSendMessage = async (message: string) => {
    if (gamePhase !== 'playing' || hasAnswered || !currentCard) return;

    const isCorrect = message.trim().toLowerCase() === currentCard.word.toLowerCase();
    
    // UI Local: Agregar mensaje al chat
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      username,
      message,
      type: 'message',
      timestamp: new Date(),
      isCurrentUser: true
    }]);

    if (isCorrect) {
      playSound('correct', 0.6);
      setHasAnswered(true);
      
      const points = Math.max(10, timeLeft); // Puntos basados en tiempo
      const newScore = score + points;
      
      setScore(newScore);
      await updateScore(newScore, round, 1);
      await broadcastCorrectAnswer(message, points);
      
      toast.success("¡Palabra correcta!");
    } else {
      playSound('wrong', 0.4);
    }
  };

  // --- Renderizado del Area de Juego ---
  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 gap-4">
      {gamePhase === 'waiting' ? (
        <GameLobby 
          gameSlug="anagram-battle"
          onStartGame={async (payload) => {
            setDisplayName(payload.playerName);
            setGameRoomCode(payload.roomCode);
            setIsHostInRoom(payload.isHost);
            await fetchCard(payload.difficulties[0]);
            setGamePhase('playing');
            playSound('gameStart', 0.5);
          }}
        />
      ) : (
        <>
          {/* Header con Stats */}
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-bold">Puntos</p>
                <p className="text-xl font-black text-primary">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-bold">Tiempo</p>
                <p className={`text-xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : ''}`}>
                  {timeLeft}s
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <Users size={16} />
               <span className="font-bold">{playerCount}</span>
            </div>
          </div>

          {/* Tablero Principal */}
          <div className="flex-1 flex flex-col items-center justify-center bg-secondary/20 rounded-3xl border-2 border-dashed border-border p-8 relative overflow-hidden">
            
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={scrambledWord}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center"
              >
                <span className="px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold mb-6 inline-block">
                  {currentCard?.category}
                </span>
                
                {/* Letras desordenadas estilo "Tiles" */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {scrambledWord.split('').map((letter, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.1 }}
                      className="w-12 h-14 md:w-16 md:h-20 bg-card border-b-4 border-primary/50 rounded-xl flex items-center justify-center shadow-xl"
                    >
                      <span className="text-3xl md:text-5xl font-black text-foreground">{letter}</span>
                    </motion.div>
                  ))}
                </div>

                <p className="text-muted-foreground italic text-lg">
                  " {currentCard?.hint} "
                </p>
              </motion.div>
            </AnimatePresence>

            {hasAnswered && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                  <Trophy className="mx-auto text-yellow-500 mb-2" size={48} />
                  <h3 className="text-2xl font-bold">¡Esperando a los demás!</h3>
                </motion.div>
              </div>
            )}
          </div>

          {/* Chat de entrada */}
          <ParticipationChat
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            disabled={hasAnswered}
            placeholder="Escribe la palabra correcta..."
            currentUsername={username}
          />
        </>
      )}
    </div>
  );
}
