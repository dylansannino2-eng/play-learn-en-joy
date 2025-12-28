import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Clock, Users, Wifi, WifiOff, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import RoundRanking from './shared/RoundRanking';
import GameLobby from './shared/GameLobby';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';

// --- CONFIGURACIÓN Y DATOS ---

const ROUND_SECONDS = 60;

interface MemoryItem {
  id: string; // ID común para la pareja
  content: string | JSX.Element;
  type: 'image' | 'text';
  value: string; // Para comparar si coinciden
}

// Banco de datos: Icono/Imagen vs Texto
const MEMORY_DATABASE = [
  { value: "React", label: "React", icon: "⚛️" },
  { value: "Node", label: "Node.js", icon: "🟢" },
  { value: "Database", label: "Postgres", icon: "🗄️" },
  { value: "Styling", label: "Tailwind", icon: "🎨" },
  { value: "Types", label: "TypeScript", icon: "📘" },
  { value: "Cloud", label: "Vercel", icon: "☁️" },
  { value: "Version", label: "Git", icon: "🌿" },
  { value: "Package", label: "NPM", icon: "📦" },
  { value: "API", label: "GraphQL", icon: "🕸️" },
  { value: "Mobile", label: "Native", icon: "📱" },
];

type GamePhase = 'waiting' | 'playing' | 'ranking';

// --- COMPONENTE DE CARTA ---

function MemoryCard({ 
  item, 
  isFlipped, 
  isMatched, 
  onClick 
}: { 
  item: MemoryItem; 
  isFlipped: boolean; 
  isMatched: boolean; 
  onClick: () => void 
}) {
  return (
    <div 
      className="relative h-24 sm:h-32 w-full perspective-1000 cursor-pointer"
      onClick={!isFlipped && !isMatched ? onClick : undefined}
    >
      <motion.div
        className="w-full h-full transition-all duration-500 preserve-3d"
        initial={false}
        animate={{ rotateY: isFlipped || isMatched ? 180 : 0 }}
      >
        {/* Lado Frontal (Oculto) */}
        <div className="absolute inset-0 bg-secondary/50 border-2 border-primary/20 rounded-xl flex items-center justify-center backface-hidden">
          <HelpCircle className="text-primary/30 w-8 h-8" />
        </div>

        {/* Lado Trasero (Revelado) */}
        <div 
          className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center backface-hidden rotate-y-180 border-2 shadow-inner
            ${isMatched ? 'bg-green-500/20 border-green-500/50' : 'bg-card border-primary'}
          `}
        >
          {item.type === 'image' ? (
            <span className="text-4xl">{item.content}</span>
          ) : (
            <span className="font-bold text-sm sm:text-base text-center px-2">{item.content}</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---

export default function MemoryGame({ roomCode }: { roomCode?: string }) {
  const { playSound } = useGameSounds();
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [cards, setCards] = useState<MemoryItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedValues, setMatchedValues] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);

  const {
    players,
    isConnected,
    username,
    updateScore,
    broadcastGameEvent,
    gameEvent,
  } = useMultiplayerGame('memorama', roomCode);

  // --- LÓGICA DE GENERACIÓN ---

  const setupGame = useCallback((difficulty: string) => {
    const pairCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
    const selected = [...MEMORY_DATABASE].sort(() => 0.5 - Math.random()).slice(0, pairCount);
    
    let deck: MemoryItem[] = [];
    selected.forEach((item, index) => {
      // Carta de Imagen
      deck.push({ id: `img-${index}`, value: item.value, content: item.icon, type: 'image' });
      // Carta de Texto
      deck.push({ id: `txt-${index}`, value: item.value, content: item.label, type: 'text' });
    });

    setCards(deck.sort(() => 0.5 - Math.random()));
    setMatchedValues([]);
    setFlippedIndices([]);
    setScore(0);
    setGamePhase('playing');
    setTimeLeft(ROUND_SECONDS);
  }, []);

  // --- MANEJO DE SELECCIÓN ---

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2 || flippedIndices.includes(index)) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    playSound('click', 0.2);

    if (newFlipped.length === 2) {
      const firstCard = cards[newFlipped[0]];
      const secondCard = cards[newFlipped[1]];

      if (firstCard.value === secondCard.value) {
        // ¡COINCIDENCIA!
        setTimeout(() => {
          setMatchedValues(prev => [...prev, firstCard.value]);
          setFlippedIndices([]);
          setScore(s => s + 50);
          playSound('correct', 0.5);
          toast.success(`¡Pareja encontrada: ${firstCard.value}!`);
          
          // Sincronizar con otros si es necesario
          updateScore(score + 50, matchedValues.length + 1, 0);
        }, 600);
      } else {
        // ERROR
        setTimeout(() => {
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // --- RENDER ---

  if (gamePhase === 'waiting') {
    return (
      <GameLobby
        gameSlug="memorama"
        onStartGame={(payload) => setupGame(payload.difficulties[0])}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p-4 gap-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            <span className="text-2xl font-black">{score}</span>
          </div>
          <div className="text-muted-foreground text-sm font-medium">
            Parejas: {matchedValues.length} / {cards.length / 2}
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full font-mono font-bold text-xl">
          <Clock className={timeLeft < 10 ? "text-red-500 animate-pulse" : ""} />
          {timeLeft}s
        </div>
      </div>

      {/* Grid de Cartas */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`grid gap-3 w-full max-w-4xl 
          ${cards.length <= 8 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-4'}`}
        >
          {cards.map((card, index) => (
            <MemoryCard
              key={index}
              item={card}
              isFlipped={flippedIndices.includes(index)}
              isMatched={matchedValues.includes(card.value)}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
