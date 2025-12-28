import { useState, useEffect, useCallback } from "react";
import { Trophy, Zap, Image as ImageIcon, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // RUTA CORREGIDA
import { motion } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";

interface MemoryItem {
  id: string;
  content: string;
  type: "image" | "text";
  matchValue: string;
}

export default function MemoryGame() {
  const { playSound } = useGameSounds();
  const [cards, setCards] = useState<MemoryItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedValues, setMatchedValues] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(
    async (limit = 6) => {
      setLoading(true);
      const { data, error } = await supabase.from("memory_cards").select("image_url, word").limit(limit);

      if (error) return;

      let deck: MemoryItem[] = [];
      data.forEach((item, index) => {
        deck.push({ id: `img-${index}`, content: item.image_url, type: "image", matchValue: item.word });
        deck.push({ id: `txt-${index}`, content: item.word, type: "text", matchValue: item.word });
      });

      setCards(deck.sort(() => Math.random() - 0.5));
      setIsPreviewing(true);
      playSound("gameStart"); // Nombre de sonido corregido

      setTimeout(() => {
        setIsPreviewing(false);
        playSound("tick"); // Nombre de sonido corregido
      }, 5000);

      setLoading(false);
    },
    [playSound],
  );

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCardClick = (index: number) => {
    if (isPreviewing || flippedIndices.length === 2 || flippedIndices.includes(index)) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const first = cards[newFlipped[0]];
      const second = cards[newFlipped[1]];

      if (first.matchValue === second.matchValue) {
        setMatchedValues((prev) => [...prev, first.matchValue]);
        setFlippedIndices([]);
        playSound("correct");
      } else {
        playSound("wrong"); // Nombre de sonido corregido
        setTimeout(() => setFlippedIndices([]), 1000);
      }
    }
  };

  if (loading) return <div className="text-center p-10">Cargando desafío...</div>;

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-4">
          <Trophy className="text-yellow-500" />
          <span className="text-xl font-bold">{matchedValues.length * 100} pts</span>
        </div>
        {isPreviewing && (
          <motion.div className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-1 rounded-full border border-primary/30">
            <Zap size={16} className="animate-pulse" />
            <span className="font-bold text-sm uppercase">Memoriza</span>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const isVisible = flippedIndices.includes(index) || matchedValues.includes(card.matchValue) || isPreviewing;
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
                <div className="absolute inset-0 bg-slate-800 rounded-xl flex items-center justify-center backface-hidden border-2 border-slate-700 shadow-lg">
                  <HelpCircle className="text-slate-600 w-8 h-8" />
                </div>
                <div className="absolute inset-0 bg-white rounded-xl flex items-center justify-center backface-hidden rotate-y-180 border-4 border-primary shadow-xl overflow-hidden">
                  {card.type === "image" ? (
                    <img src={card.content} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-slate-900 font-black text-lg p-2 text-center leading-tight uppercase">
                      {card.content}
                    </span>
                  )}
                  {matchedValues.includes(card.matchValue) && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">✅</div>
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
