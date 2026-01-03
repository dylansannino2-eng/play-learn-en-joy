import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Lightbulb, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MicroLessonProps {
  word: string;
  context?: string; // The subtitle/sentence where the word appears
  duration?: number;
  onComplete: () => void;
  // Pre-generated microlesson data (if available from subtitle_configs)
  pregeneratedMeaning?: string | null;
  pregeneratedExamples?: string[] | null;
}

interface MicroLessonData {
  meaning: string;
  examples: string[];
}

const fallbackDefinitions: Record<string, MicroLessonData> = {
  over: {
    meaning: "Preposición que indica que algo está por encima de otra cosa, o que una acción ha finalizado.",
    examples: [
      "The bird flew over the bridge. (El pájaro voló sobre el puente)",
      "The meeting is finally over. (La reunión finalmente terminó)",
    ],
  },
  "can't": {
    meaning: "Contracción de 'cannot'. Expresa incapacidad o prohibición.",
    examples: ["I can't swim. (No puedo nadar)", "You can't park here. (No puedes estacionar aquí)"],
  },
  "don't": {
    meaning: "Contracción de 'do not'. Se usa para negar acciones.",
    examples: ["I don't like coffee. (No me gusta el café)", "Don't worry! (¡No te preocupes!)"],
  },
};

function getGenericDefinition(word: string): MicroLessonData {
  const vowels = ["a", "e", "i", "o", "u"];
  const startsWithVowel = vowels.includes(word.charAt(0).toLowerCase());
  const article = startsWithVowel ? "an" : "a";

  return {
    meaning: `Palabra en inglés. Practica usarla en diferentes contextos para recordarla mejor.`,
    examples: [
      `This is ${article} "${word}". (Esto es "${word}")`,
      `Can you use "${word}" in a sentence? (¿Puedes usar "${word}" en una oración?)`,
    ],
  };
}

export default function MicroLesson({ 
  word, 
  context, 
  duration = 10, 
  onComplete,
  pregeneratedMeaning,
  pregeneratedExamples
}: MicroLessonProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isVisible, setIsVisible] = useState(true);
  const [definition, setDefinition] = useState<MicroLessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  const normalizedWord = word.toLowerCase().trim();

  useEffect(() => {
    const fetchDefinition = async () => {
      setIsLoading(true);
      setIsAIGenerated(false);
      
      try {
        // First, check if we have pregenerated data from subtitle_configs
        if (pregeneratedMeaning) {
          setDefinition({ 
            meaning: pregeneratedMeaning, 
            examples: pregeneratedExamples || [] 
          });
          setIsLoading(false);
          return;
        }

        // Then, try to get from microlessons database
        const { data, error } = await supabase
          .from("microlessons")
          .select("meaning, examples")
          .eq("word", normalizedWord)
          .eq("is_active", true)
          .single();

        if (data && !error) {
          setDefinition({ meaning: data.meaning, examples: data.examples || [] });
          setIsLoading(false);
          return;
        }

        // If context is provided, generate with AI
        if (context) {
          try {
            const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-microlesson', {
              body: { word: normalizedWord, context }
            });

            if (aiData && !aiError && aiData.meaning) {
              setDefinition({ meaning: aiData.meaning, examples: aiData.examples || [] });
              setIsAIGenerated(true);
              setIsLoading(false);
              return;
            }
          } catch (aiErr) {
            console.error("AI generation failed:", aiErr);
          }
        }

        // Fallback to local definitions
        const fallback = fallbackDefinitions[normalizedWord] || getGenericDefinition(word);
        setDefinition(fallback);
      } catch (err) {
        const fallback = fallbackDefinitions[normalizedWord] || getGenericDefinition(word);
        setDefinition(fallback);
      }
      setIsLoading(false);
    };
    fetchDefinition();
  }, [normalizedWord, word, context, pregeneratedMeaning, pregeneratedExamples]);

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
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Repaso Rápido</h2>
                  {isAIGenerated && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-accent/20 rounded-full text-xs text-accent">
                      <Sparkles className="w-3 h-3" />
                      Contextual
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{timeLeft}s</span>
              </div>
            </div>

            {/* FEEDBACK TEXT & WORD */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-6"
            >
              <p className="text-sm font-medium text-muted-foreground mb-2 italic">La palabra correcta era:</p>
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
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
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

            {/* Timer Progress Bar */}
            <motion.div className="mt-6 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration, ease: "linear" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
