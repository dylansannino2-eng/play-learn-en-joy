import { motion } from 'framer-motion';
import { Star, Trophy, Target, Crown, Medal } from 'lucide-react';
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
  allPlayersCorrect?: boolean;
}

export default function RoundRanking({ 
  players, 
  roundNumber, 
  totalRounds,
  countdownSeconds = 5,
  onCountdownComplete,
  isLastRound = false,
  allPlayersCorrect = false
}: RoundRankingProps) {
  // Faster countdown if all players got it right
  const effectiveCountdown = allPlayersCorrect ? Math.min(countdownSeconds, 2) : countdownSeconds;
  const [countdown, setCountdown] = useState(effectiveCountdown);

  useEffect(() => {
    if (isLastRound) return; // No countdown on last round
    
    if (countdown <= 0) {
      onCountdownComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onCountdownComplete, isLastRound]);

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

  // Final podium for last round
  if (isLastRound) {
    const top3 = players.slice(0, 3);
    const rest = players.slice(3);
    
    // Reorder for podium display: 2nd, 1st, 3rd
    const podiumOrder = [
      top3.find(p => p.rank === 2),
      top3.find(p => p.rank === 1),
      top3.find(p => p.rank === 3)
    ].filter(Boolean) as PlayerScore[];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border overflow-auto">
        {/* Confetti effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
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

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 z-10"
        >
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
          </motion.div>
          <h2 className="text-3xl font-black text-foreground">¡Juego Terminado!</h2>
          <p className="text-muted-foreground">Ranking final</p>
        </motion.div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-2 mb-6 z-10">
          {podiumOrder.map((player, index) => {
            const podiumHeights = ['h-28', 'h-36', 'h-20'];
            const podiumColors = [
              'bg-gradient-to-t from-gray-400 to-gray-300',
              'bg-gradient-to-t from-yellow-500 to-yellow-400',
              'bg-gradient-to-t from-amber-700 to-amber-600'
            ];
            const delays = [0.3, 0.1, 0.5];
            
            return (
              <motion.div
                key={player.username}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delays[index], duration: 0.5 }}
                className="flex flex-col items-center"
              >
                {/* Player info */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: delays[index] + 0.3, type: 'spring' }}
                  className="mb-2 text-center"
                >
                  {player.rank === 1 && (
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-1" />
                    </motion.div>
                  )}
                  {player.rank === 2 && <Medal className="w-6 h-6 text-gray-300 mx-auto mb-1" />}
                  {player.rank === 3 && <Medal className="w-6 h-6 text-amber-600 mx-auto mb-1" />}
                  
                  <p className={`font-bold text-sm truncate max-w-20 ${player.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                    {player.username}
                  </p>
                  <p className="text-lg font-black text-foreground">{player.points} pts</p>
                </motion.div>
                
                {/* Podium block */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  transition={{ delay: delays[index], duration: 0.5 }}
                  className={`w-24 ${podiumHeights[index]} ${podiumColors[index]} rounded-t-lg flex items-start justify-center pt-2 shadow-lg`}
                >
                  <span className="text-2xl font-black text-white/90">{player.rank}</span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Rest of players */}
        {rest.length > 0 && (
          <div className="w-full max-w-md space-y-2 mb-6 z-10">
            {rest.map((player, index) => (
              <motion.div
                key={player.username}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBg(player.rank, player.isCurrentUser || false)}`}
              >
                <span className={`text-xl font-black w-8 ${getRankColor(player.rank)}`}>
                  {player.rank}
                </span>
                <span className={`flex-1 font-bold truncate ${player.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                  {player.username}
                </span>
                <div className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-full">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="font-bold text-foreground">{player.points}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          onClick={onCountdownComplete}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:bg-primary/90 transition-colors z-10"
        >
          Jugar de Nuevo
        </motion.button>
      </div>
    );
  }

  // Regular round ranking (not last round)
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl font-bold text-foreground">
          Ronda {roundNumber} de {totalRounds}
        </h2>
        <p className="text-muted-foreground">Ranking de la ronda</p>
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
            <span className={`text-2xl font-black w-8 ${getRankColor(player.rank)}`}>
              {player.rank}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`font-bold truncate block ${player.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                {player.username}
              </span>
            </div>
            {player.streak && player.streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">{player.streak}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-full min-w-[70px] justify-center">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{player.points}</span>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-full min-w-[50px] justify-center">
              <Target className="w-4 h-4 text-green-400" />
              <span className="font-bold text-foreground">{player.correctAnswers}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        {allPlayersCorrect && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-400 font-bold mb-1"
          >
            ¡Todos acertaron! 🎉
          </motion.p>
        )}
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
    </div>
  );
}
