import { useState, useEffect, useCallback } from 'react';
import { Trophy, Clock, Eye, Zap, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Asegúrate de tener configurado tu cliente
import { motion } from 'framer-motion';
import { useGameSounds } from '@/hooks/useGameSounds';

interface MemoryItem {
  id: string;
  content: string; // URL de imagen o Texto
  type: 'image' | 'text';
  matchValue: string; // El identificador para unir (la palabra)
}

export default function MemoryGame() {
  const { playSound } = useGameSounds();
  
  // Estados del juego
  const [cards, setCards] = useState<MemoryItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedValues, setMatchedValues] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false); // Estado para el Power-up inicial
  const [loading, setLoading] = useState(true);

  // --- CARGA DE DATOS DESDE SUPABASE ---
  const fetchCards = useCallback(async (limit = 6) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('memory_cards')
      .select('image_url, word')
      .limit(limit);

    if (error) {
      console.error("Error cargando cartas:", error);
      return;
    }

    // Crear parejas: una carta con imagen y otra con texto
    let deck: MemoryItem[] = [];
    data.forEach((item, index) => {
      deck.push({ 
        id: `img-${index}`, 
        content: item.image_url, 
        type: 'image', 
        matchValue: item.word 
      });
      deck.push({ 
        id: `txt-${index}`, 
        content: item.word, 
        type: 'text', 
        matchValue: item.word 
      });
    });

    // Barajar y activar visualización inicial
    const shuffledDeck = deck.sort(() => Math.random() - 0.5);
    setCards(shuffledDeck);
    startInitialPreview();
    setLoading(false);
  }, []);

  // --- LÓGICA DEL POWER-UP INICIAL ---
  const startInitialPreview = () => {
    setIsPreviewing(true);
    playSound('powerup', 0.5); // Sonido de inicio
    
    // Después de 5 segundos, ocultar todas las cartas
    setTimeout(() => {
      setIsPreviewing(false);
      playSound('clock', 0.3);
    }, 5000);
  };

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // --- HANDLER DE CLIC ---
  const handleCardClick = (index: number) => {
    if (isPreviewing || flippedIndices.length === 2 || flippedIndices.includes(index)) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const first = cards[newFlipped[0]];
      const second = cards[newFlipped[1]];

      if (first.matchValue === second.matchValue) {
        setMatchedValues(prev => [...prev, first.matchValue]);
        setFlippedIndices([]);
        playSound('correct', 0.6);
      } else {
        setTimeout(() => setFlippedIndices([]), 1000);
        playSound('error', 0.3);
      }
    }
  };

  if (loading) return <div className="text-center p-10">Cargando desafío...</div>;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      
      {/* Barra de Estado y Power-up */}
      <div className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border border-primary/10">
        <div className="flex items-center gap-4">
          <Trophy className="text-yellow-500" />
          <span className="text-xl font-bold">{matchedValues.length * 100} pts</span>
        </div>

        {isPreviewing && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 bg-yellow-500/20 text-yellow-600 px-4 py-1 rounded-full border border-yellow-500/30"
          >
            <Zap size={16} className="animate-pulse" />
            <span className="font-bold text-sm">MEMORIZA AHORA (5s)</span>
          </motion.div>
        )}
      </div>

      {/* Grid del Memorama */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          // Una carta está "visible" si está volteada, si ya fue emparejada o si el power-up está activo
          const isVisible = flippedIndices.includes(index) || 
                            matchedValues.includes(card.matchValue) || 
                            isPreviewing;

          return (
            <div 
              key={card.id}
              onClick={() => handleCardClick(index)}
              className="relative h-40 cursor-pointer perspective-1000"
            >
              <motion.div
                animate={{ rotateY: isVisible ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full relative preserve-3d"
              >
                {/* Cara de atrás (Oculta) */}
                <div className="absolute inset-0 bg-slate-800 rounded-xl flex items-center justify-center backface-hidden border-4 border-slate-700 shadow-xl">
                   <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                      <ImageIcon className="text-slate-500" />
                   </div>
                </div>

                {/* Cara de adelante (Contenido) */}
                <div className="absolute inset-0 bg-white rounded-xl flex items-center justify-center backface-hidden rotate-y-180 border-4 border-primary shadow-2xl overflow-hidden">
                  {card.type === 'image' ? (
                    <img 
                      src={card.content} 
                      alt="target" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-900 font-black text-xl px-2 text-center">
                      {card.content.toUpperCase()}
                    </span>
                  )}
                  
                  {matchedValues.includes(card.matchValue) && (
                    <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center">
                       <div className="bg-white rounded-full p-1 shadow-lg">✅</div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
