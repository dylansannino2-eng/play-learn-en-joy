import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lightbulb, Clock } from 'lucide-react';

interface MicroLessonProps {
  word: string;
  duration?: number; // in seconds
  onComplete: () => void;
}

// Diccionario de definiciones y usos comunes
const wordDefinitions: Record<string, { meaning: string; examples: string[] }> = {
  // Common words - expandable
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
  "i'm": {
    meaning: "Contracción de 'I am'. Primera persona del verbo 'to be'.",
    examples: ["I'm happy. (Estoy feliz)", "I'm learning English. (Estoy aprendiendo inglés)"]
  },
  "you're": {
    meaning: "Contracción de 'you are'. Segunda persona del verbo 'to be'.",
    examples: ["You're amazing! (¡Eres increíble!)", "You're welcome. (De nada)"]
  },
  "it's": {
    meaning: "Contracción de 'it is'. Tercera persona para cosas/situaciones.",
    examples: ["It's raining. (Está lloviendo)", "It's a great idea! (¡Es una gran idea!)"]
  },
  "they're": {
    meaning: "Contracción de 'they are'. Tercera persona plural del verbo 'to be'.",
    examples: ["They're coming. (Están viniendo)", "They're my friends. (Son mis amigos)"]
  },
  "we're": {
    meaning: "Contracción de 'we are'. Primera persona plural del verbo 'to be'.",
    examples: ["We're ready! (¡Estamos listos!)", "We're going home. (Vamos a casa)"]
  },
  "that's": {
    meaning: "Contracción de 'that is'. Se usa para señalar o explicar.",
    examples: ["That's correct. (Eso es correcto)", "That's my car. (Ese es mi carro)"]
  },
  "what's": {
    meaning: "Contracción de 'what is'. Se usa para preguntar.",
    examples: ["What's your name? (¿Cuál es tu nombre?)", "What's happening? (¿Qué está pasando?)"]
  },
  "there's": {
    meaning: "Contracción de 'there is'. Indica existencia de algo.",
    examples: ["There's a problem. (Hay un problema)", "There's hope. (Hay esperanza)"]
  },
  "here's": {
    meaning: "Contracción de 'here is'. Se usa para presentar algo.",
    examples: ["Here's your coffee. (Aquí está tu café)", "Here's the plan. (Aquí está el plan)"]
  },
  "let's": {
    meaning: "Contracción de 'let us'. Se usa para hacer sugerencias.",
    examples: ["Let's go! (¡Vamos!)", "Let's try again. (Intentemos de nuevo)"]
  },
  "couldn't": {
    meaning: "Contracción de 'could not'. Expresa incapacidad en pasado.",
    examples: ["I couldn't sleep. (No pude dormir)", "She couldn't find it. (No pudo encontrarlo)"]
  },
  "wouldn't": {
    meaning: "Contracción de 'would not'. Expresa negación condicional.",
    examples: ["He wouldn't listen. (Él no escucharía)", "I wouldn't do that. (Yo no haría eso)"]
  },
  "shouldn't": {
    meaning: "Contracción de 'should not'. Expresa consejo negativo.",
    examples: ["You shouldn't worry. (No deberías preocuparte)", "We shouldn't be late. (No deberíamos llegar tarde)"]
  },
  "haven't": {
    meaning: "Contracción de 'have not'. Se usa en tiempos perfectos.",
    examples: ["I haven't finished. (No he terminado)", "They haven't arrived. (No han llegado)"]
  },
  "hasn't": {
    meaning: "Contracción de 'has not'. Tercera persona en tiempo perfecto.",
    examples: ["She hasn't called. (Ella no ha llamado)", "It hasn't stopped. (No ha parado)"]
  },
  "didn't": {
    meaning: "Contracción de 'did not'. Negación en pasado simple.",
    examples: ["I didn't know. (No sabía)", "They didn't come. (No vinieron)"]
  },
  "isn't": {
    meaning: "Contracción de 'is not'. Negación del verbo 'to be'.",
    examples: ["It isn't true. (No es verdad)", "She isn't here. (Ella no está aquí)"]
  },
  "aren't": {
    meaning: "Contracción de 'are not'. Plural de 'is not'.",
    examples: ["They aren't ready. (No están listos)", "We aren't sure. (No estamos seguros)"]
  },
  "wasn't": {
    meaning: "Contracción de 'was not'. Negación en pasado.",
    examples: ["It wasn't me. (No fui yo)", "She wasn't there. (Ella no estaba ahí)"]
  },
  "weren't": {
    meaning: "Contracción de 'were not'. Plural de 'was not'.",
    examples: ["They weren't happy. (No estaban felices)", "We weren't invited. (No fuimos invitados)"]
  },
};

// Genera una definición genérica para palabras no en el diccionario
function getGenericDefinition(word: string): { meaning: string; examples: string[] } {
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

  const normalizedWord = word.toLowerCase().trim();
  const definition = wordDefinitions[normalizedWord] || getGenericDefinition(word);

  useEffect(() => {
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
  }, [onComplete]);

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
