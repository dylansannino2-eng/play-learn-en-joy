import { motion } from 'framer-motion';
import { Star, Trophy, Target } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PlayerScore {
  rank: number;
  username: string;
  points: number;
  correctAnswers: number;
  streak?: number;
  isCurrentUser?: boolean;
}

interface RoundRankingProps {
  players: PlayerScore[];
  roundNumber: number;
  totalRounds: number;
  countdownSeconds?: number;
  onCountdownComplete?: () => void;
  isLastRound?: boolean;
}

export default function RoundRanking({ 
  players, 
  roundNumber, 
  totalRounds,
  countdownSeconds = 5,
  onCountdownComplete,
  isLastRound = false
}: RoundRankingProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);

  useEffect(() => {
    if (countdown <= 0) {
      onCountdownComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onCountdownComplete]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-primary/20 border-primary/50';
    switch (rank) {
      case 1: return 'bg-yellow-500/10 border-yellow-500/30';
      case 2: return 'bg-gray-400/10 border-gray-400/30';
      case 3: return 'bg-amber-600/10 border-amber-600/30';
      default: return 'bg-secondary/50 border-border';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl font-bold text-foreground">
          {isLastRound ? '¡Juego Terminado!' : `Ronda ${roundNumber} de ${totalRounds}`}
        </h2>
        <p className="text-muted-foreground">
          {isLastRound ? 'Ranking final' : 'Ranking de la ronda'}
        </p>
      </motion.div>

      <div className="w-full max-w-md space-y-2 mb-6">
        {players.map((player, index) => (
          <motion.div
            key={player.username}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBg(player.rank, player.isCurrentUser || false)}`}
          >
            {/* Rank */}
            <span className={`text-2xl font-black w-8 ${getRankColor(player.rank)}`}>
              {player.rank}
            </span>

            {/* Username */}
            <div className="flex-1 min-w-0">
              <span className={`font-bold truncate block ${player.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                {player.username}
              </span>
            </div>

            {/* Streak */}
            {player.streak && player.streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">{player.streak}</span>
              </div>
            )}

            {/* Points */}
            <div className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-full min-w-[70px] justify-center">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{player.points}</span>
            </div>

            {/* Correct answers */}
            <div className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-full min-w-[50px] justify-center">
              <Target className="w-4 h-4 text-green-400" />
              <span className="font-bold text-foreground">{player.correctAnswers}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Countdown */}
      {!isLastRound && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <p className="text-muted-foreground mb-2">Siguiente ronda en</p>
          <motion.div
            key={countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto"
          >
            <span className="text-3xl font-black text-primary-foreground">{countdown}</span>
          </motion.div>
        </motion.div>
      )}

      {isLastRound && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onCountdownComplete}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:bg-primary/90 transition-colors"
        >
          Jugar de Nuevo
        </motion.button>
      )}
    </div>
  );
}
