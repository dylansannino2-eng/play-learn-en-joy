import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowLeft, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { RealtimeChannel } from '@supabase/supabase-js';

type Difficulty = 'easy' | 'medium' | 'hard';

interface JoinRoomFromLinkProps {
  roomCode: string;
  gameSlug: string;
  gameTitle: string;
  onJoined: (playerName: string) => void;
  onGameStart: (difficulty: Difficulty) => void;
  onCancel: () => void;
}

interface RoomPlayer {
  oderId: string;
  username: string;
  joinedAt: string;
}

interface RoomData {
  id: string;
  code: string;
  host_name: string;
  status: string;
  settings: unknown;
}

export default function JoinRoomFromLink({ 
  roomCode, 
  gameSlug, 
  gameTitle,
  onJoined,
  onGameStart,
  onCancel 
}: JoinRoomFromLinkProps) {
  const { user } = useAuth();
  const defaultUsername = user?.email?.split('@')[0] || 'Jugador';
  
  const [playerName, setPlayerName] = useState(defaultUsername);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('id, code, host_name, status, settings')
        .eq('code', roomCode.toUpperCase())
        .eq('game_slug', gameSlug)
        .maybeSingle();

      if (error || !data) {
        setError('Sala no encontrada');
        setIsLoading(false);
        return;
      }

      if (data.status !== 'waiting') {
        setError('La partida ya ha comenzado');
        setIsLoading(false);
        return;
      }

      setRoomData(data);
      setIsLoading(false);
    };

    fetchRoom();
  }, [roomCode, gameSlug]);

  // Connect to room presence when joined and listen for game start
  useEffect(() => {
    if (!hasJoined || !roomData) return;

    const oderId = user?.id || `anon_${Math.random().toString(36).slice(2, 10)}`;
    const channelName = `game:${gameSlug}:${roomCode.toUpperCase()}`;
    
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: oderId,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const players: RoomPlayer[] = [];
      
      Object.entries(state).forEach(([oderId, presences]) => {
        const presence = presences[0] as any;
        if (presence) {
          players.push({
            oderId,
            username: presence.username,
            joinedAt: presence.joinedAt,
          });
        }
      });
      
      players.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      setRoomPlayers(players);
    });

    // Listen for game start broadcast from host
    channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
      console.log('Game start received:', payload);
      const maybeDifficulty = (payload as any)?.difficulty as Difficulty | undefined;
      const difficulty: Difficulty = (maybeDifficulty === 'easy' || maybeDifficulty === 'medium' || maybeDifficulty === 'hard')
        ? maybeDifficulty
        : 'medium';

      toast.success('¡El host ha iniciado la partida!');
      onGameStart(difficulty);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          username: playerName,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [hasJoined, roomData, gameSlug, roomCode, user?.id, playerName, onGameStart]);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      toast.error('Ingresa tu nombre');
      return;
    }

    setIsJoining(true);
    setHasJoined(true);
    onJoined(playerName.trim());

    // Wait a moment for presence to sync
    await new Promise(resolve => setTimeout(resolve, 500));

    toast.success(`Te has unido a la sala de ${roomData?.host_name}`);
    setIsJoining(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Buscando sala...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-2xl p-8 border border-border max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Error
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="w-full py-3 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
        </motion.div>
      </div>
    );
  }

  // Waiting room view (after joining)
  if (hasJoined) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border border-primary/30 max-w-md w-full"
        >
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            {gameTitle}
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            Sala de {roomData?.host_name}
          </p>

          {/* Room Code Display */}
          <div className="flex justify-center gap-2 mb-6">
            {roomCode.toUpperCase().split('').map((char, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center"
              >
                <span className="text-2xl font-black text-primary-foreground">{char}</span>
              </motion.div>
            ))}
          </div>

          {/* Players List */}
          <div className="bg-background/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-foreground" />
              <span className="text-foreground font-semibold">
                Jugadores ({roomPlayers.length})
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {roomPlayers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-2">
                    Conectando...
                  </p>
                ) : (
                  roomPlayers.map((player, index) => (
                    <motion.div
                      key={player.oderId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <span className="text-foreground font-medium flex-1">
                        {player.username}
                      </span>
                      {index === 0 && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                          Host
                        </span>
                      )}
                      {player.username === playerName && (
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
                          Tú
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-3">
            <div className="w-full py-3 bg-secondary/50 text-muted-foreground font-medium rounded-xl flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              Esperando al host...
            </div>
            <button
              onClick={onCancel}
              className="w-full py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Salir de la sala
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            El juego comenzará automáticamente cuando el host presione "Iniciar Partida"
          </p>
        </motion.div>
      </div>
    );
  }

  // Initial join view
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl p-8 border border-border max-w-md w-full"
      >
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground text-center mb-2">
          Unirse a partida
        </h2>
        <p className="text-muted-foreground text-center mb-6">
          {roomData?.host_name} te ha invitado a jugar {gameTitle}
        </p>

        {/* Room Code Display */}
        <div className="flex justify-center gap-2 mb-6">
          {roomCode.toUpperCase().split('').map((char, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.1 }}
              className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center"
            >
              <span className="text-2xl font-black text-foreground">{char}</span>
            </motion.div>
          ))}
        </div>

        {/* Player Name Input */}
        <div className="mb-6">
          <label className="block text-sm text-muted-foreground mb-2">
            Tu nombre
          </label>
          <Input
            placeholder="Ingresa tu nombre"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
            maxLength={15}
            className="text-center text-lg font-bold bg-background border-border"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={isJoining || !playerName.trim()}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Uniéndose...
              </>
            ) : (
              <>
                <Users size={20} />
                Unirse a la sala
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}