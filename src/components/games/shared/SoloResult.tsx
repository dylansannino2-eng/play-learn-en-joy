import { motion } from 'framer-motion';
import { Trophy, Target, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SoloResultProps {
  correctAnswers: number;
  totalRounds: number;
  points: number;
  onPlayAgain: () => void;
}

export default function SoloResult({ 
  correctAnswers, 
  totalRounds, 
  points,
  onPlayAgain 
}: SoloResultProps) {
  const percentage = Math.round((correctAnswers / totalRounds) * 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getPerformanceMessage = () => {
    if (percentage === 100) return { text: '¡Perfecto!', emoji: '🏆', color: 'text-yellow-400' };
    if (percentage >= 80) return { text: '¡Excelente!', emoji: '🌟', color: 'text-green-400' };
    if (percentage >= 60) return { text: '¡Muy bien!', emoji: '👏', color: 'text-blue-400' };
    if (percentage >= 40) return { text: '¡Buen intento!', emoji: '💪', color: 'text-orange-400' };
    return { text: 'Sigue practicando', emoji: '📚', color: 'text-muted-foreground' };
  };

  const performance = getPerformanceMessage();

  const getCircleColor = () => {
    if (percentage === 100) return 'stroke-yellow-400';
    if (percentage >= 80) return 'stroke-green-400';
    if (percentage >= 60) return 'stroke-blue-400';
    if (percentage >= 40) return 'stroke-orange-400';
    return 'stroke-red-400';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-card rounded-xl border border-border">
      {/* Confetti for perfect score */}
      {percentage === 100 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                y: -20, 
                x: Math.random() * 100 + '%',
                rotate: 0,
                opacity: 1
              }}
              animate={{ 
                y: '100vh',
                rotate: 360,
                opacity: 0
              }}
              transition={{ 
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'linear'
              }}
              className={`absolute w-3 h-3 ${
                ['bg-yellow-400', 'bg-primary', 'bg-green-400', 'bg-pink-400', 'bg-blue-400'][i % 5]
              }`}
              style={{ 
                left: `${Math.random() * 100}%`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0'
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6 z-10"
      >
        <h2 className="text-2xl font-black text-foreground">¡Juego Terminado!</h2>
        <p className="text-muted-foreground">Tu resultado</p>
      </motion.div>

      {/* Circular Progress Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
        className="relative w-48 h-48 mb-6 z-10"
      >
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-secondary"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={getCircleColor()}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        {/* Percentage in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-4xl font-black text-foreground"
          >
            {percentage}%
          </motion.span>
          <span className="text-sm text-muted-foreground">precisión</span>
        </div>
      </motion.div>

      {/* Performance Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center mb-6 z-10"
      >
        <span className="text-4xl mb-2 block">{performance.emoji}</span>
        <p className={`text-xl font-bold ${performance.color}`}>{performance.text}</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex gap-4 mb-8 z-10"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Correctas</p>
            <p className="font-bold text-foreground">{correctAnswers}/{totalRounds}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl">
          <Trophy className="w-5 h-5 text-primary" />
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Puntos</p>
            <p className="font-bold text-foreground">{points}</p>
          </div>
        </div>
      </motion.div>

      {/* Play Again Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="z-10"
      >
        <Button
          onClick={onPlayAgain}
          size="lg"
          className="px-8 py-6 text-lg font-bold gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Jugar de Nuevo
        </Button>
      </motion.div>
    </div>
  );
}