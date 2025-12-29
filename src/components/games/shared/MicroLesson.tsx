import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lightbulb, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MicroLessonProps {
  word: string;
  duration?: number; // in seconds
  onComplete: () => void;
}

interface MicroLessonData {
  meaning: string;
  examples: string[];
}

// Fallback definitions for common words (used when DB has no match)
const fallbackDefinitions: Record<string, MicroLessonData> = {
  "can't": {
    meaning: "Contracción de 'cannot'. Expresa incapacidad o prohibición.",
    examples: ["I can't swim. (No puedo nadar)", "You can't park here. (No puedes estacionar aquí)"]
  },
  "don't": {
    meaning: "Contracción de 'do not'. Se usa para negar acciones.",
    examples: ["I don't like coffee. (No me gusta el café)", "Don't worry! (¡No te preocupes!)"]
  },
  "won't": {
    meaning: "Contracción de 'will not'. Expresa negación en futuro.",
    examples: ["It won't rain today. (No lloverá hoy)", "I won't forget. (No olvidaré)"]
  },
};

// Genera una definición genérica para palabras no en el diccionario
function getGenericDefinition(word: string): MicroLessonData {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const startsWithVowel = vowels.includes(word.charAt(0).toLowerCase());
  const article = startsWithVowel ? 'an' : 'a';
  
  return {
    meaning: `Palabra en inglés. Practica usarla en diferentes contextos para recordarla mejor.`,
    examples: [
      `This is ${article} "${word}". (Esto es "${word}")`,
      `Can you use "${word}" in a sentence? (¿Puedes usar "${word}" en una oración?)`
    ]
  };
}

export default function MicroLesson({ word, duration = 10, onComplete }: MicroLessonProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isVisible, setIsVisible] = useState(true);
  const [definition, setDefinition] = useState<MicroLessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedWord = word.toLowerCase().trim();

  // Fetch definition from database
  useEffect(() => {
    const fetchDefinition = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('microlessons')
          .select('meaning, examples')
          .eq('word', normalizedWord)
          .eq('is_active', true)
          .single();

        if (data && !error) {
          setDefinition({
            meaning: data.meaning,
            examples: data.examples || []
          });
        } else {
          // Fallback to local dictionary
          const fallback = fallbackDefinitions[normalizedWord] || getGenericDefinition(word);
          setDefinition(fallback);
        }
      } catch (err) {
        // On error, use fallback
        const fallback = fallbackDefinitions[normalizedWord] || getGenericDefinition(word);
        setDefinition(fallback);
      }
      
      setIsLoading(false);
    };

    fetchDefinition();
  }, [normalizedWord, word]);

  useEffect(() => {
    if (isLoading) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsVisible(false);
          setTimeout(onComplete, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete, isLoading]);

  if (isLoading || !definition) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Microlección</h2>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{timeLeft}s</span>
              </div>
            </div>

            {/* Word */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="text-center mb-6"
            >
              <span className="inline-block px-6 py-3 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl border border-primary/30">
                <span className="text-3xl md:text-4xl font-bold text-primary">
                  {word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()}
                </span>
              </span>
            </motion.div>

            {/* Meaning */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-xl">
                <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-foreground">{definition.meaning}</p>
              </div>
            </motion.div>

            {/* Examples */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Ejemplos de uso
              </h3>
              <div className="space-y-2">
                {definition.examples.map((example, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="p-3 bg-muted/50 rounded-lg border border-border/50"
                  >
                    <p className="text-sm text-foreground">{example}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              className="mt-6 h-1.5 bg-secondary rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration, ease: 'linear' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
