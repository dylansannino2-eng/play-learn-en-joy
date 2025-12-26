import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, Plus, Copy, Check, ArrowLeft, Globe, Lock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameLobbyProps {
  gameSlug: string;
  gameTitle: string;
  /** If present, pre-fills the join code (invitation link flow) */
  initialRoomCode?: string;
  /** Optional default player name */
  defaultPlayerName?: string;
  /** Emits whenever the player name changes */
  onPlayerNameChange?: (name: string) => void;
  /** Called when the game should actually start (host pressed start or host broadcast received) */
  onStartGame: (roomCode?: string, payload?: unknown) => void;
  onBack?: () => void;
}

interface RoomPlayer {
  oderId: string;
  username: string;
  joinedAt: string;
}

type LobbyView = 'main' | 'create' | 'waiting_room';
type RoomType = 'public' | 'private';

export default function GameLobby({
  gameSlug,
  gameTitle,
  initialRoomCode,
  defaultPlayerName,
  onPlayerNameChange,
  onStartGame,
  onBack,
}: GameLobbyProps) {
  const { user } = useAuth();
  const username = user?.email?.split('@')[0] || 'Jugador';
  
  const [view, setView] = useState<LobbyView>('main');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [joinedRoomCode, setJoinedRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState(defaultPlayerName ?? username);
  const [roomType, setRoomType] = useState<RoomType>('private');
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Prefill invite code (invitation link flow)
  useEffect(() => {
    if (!initialRoomCode) return;
    setRoomCode(initialRoomCode.toUpperCase().slice(0, 4));
  }, [initialRoomCode]);

  // Bubble player name up to parent (so games can reuse it)
  useEffect(() => {
    onPlayerNameChange?.(playerName);
  }, [playerName, onPlayerNameChange]);

  // Track players joining a room via Supabase Realtime (host create view + join waiting room)
  useEffect(() => {
    const activeRoomCode =
      view === 'create' ? createdRoomCode :
      view === 'waiting_room' ? joinedRoomCode :
      '';

    if (!activeRoomCode) return;

    const oderId = user?.id || `anon_${Math.random().toString(36).slice(2, 10)}`;
    const channelName = `game:${gameSlug}:${activeRoomCode}`;

    // Add self immediately (host or joiner)
    const selfPlayer: RoomPlayer = {
      oderId,
      username: playerName,
      joinedAt: new Date().toISOString(),
    };
    setRoomPlayers([selfPlayer]);

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

      Object.entries(state).forEach(([presenceId, presences]) => {
        const presence = presences[0] as any;
        if (presence) {
          players.push({
            oderId: presenceId,
            username: presence.username,
            joinedAt: presence.joinedAt,
          });
        }
      });

      players.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      setRoomPlayers(players);
    });

    // If the user is waiting in a joined room, listen for host start
    if (view === 'waiting_room') {
      channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
        console.log('[GameLobby] game_start received', payload);
        toast.success('¡El host ha iniciado la partida!');
        onStartGame(activeRoomCode, payload);
      });
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          username: playerName,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [view, createdRoomCode, joinedRoomCode, gameSlug, user?.id, playerName, onStartGame]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    
    const code = generateCode();
    
    const { error } = await supabase
      .from('game_rooms')
      .insert({
        code,
        game_slug: gameSlug,
        host_id: user?.id || null,
        host_name: playerName,
        status: 'waiting',
        settings: { isPublic: roomType === 'public' },
      });

    if (error) {
      toast.error('Error al crear la sala');
      console.error(error);
    } else {
      setCreatedRoomCode(code);
      setView('create');
    }
    
    setIsLoading(false);
  };

  const handleJoinRoom = async () => {
    if (roomCode.length !== 4) {
      toast.error('El código debe tener 4 caracteres');
      return;
    }

    setIsLoading(true);

    const code = roomCode.toUpperCase();

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', code)
      .eq('game_slug', gameSlug)
      .maybeSingle();

    if (error || !data) {
      toast.error('Sala no encontrada');
    } else if (data.status !== 'waiting') {
      toast.error('La partida ya comenzó');
    } else {
      setJoinedRoomCode(code);
      setView('waiting_room');
    }

    setIsLoading(false);
  };

  const handleQuickPlay = () => {
    onStartGame(); // No room code = public game
  };

  const handleStartPrivateGame = async () => {
    const payload = {
      roomCode: createdRoomCode,
      startedAt: new Date().toISOString(),
    };

    // Broadcast game start event to all players
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'game_start',
        payload,
      });
    }

    // Update room status to playing
    await supabase
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('code', createdRoomCode);

    onStartGame(createdRoomCode, payload);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/game/${gameSlug}?room=${createdRoomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Enlace copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1 }
    })
  };

  // Main view with 3 cards
  if (view === 'main') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-foreground mb-8"
        >
          {gameTitle}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {/* Play Card */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 border-4 border-primary/50 shadow-xl"
          >
            <h3 className="text-2xl font-black text-primary-foreground text-center mb-4">
              Jugar
            </h3>
            
            {/* Room Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setRoomType('public')}
                className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                  roomType === 'public'
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
                }`}
              >
                <Globe size={16} />
                Pública
              </button>
              <button
                onClick={() => setRoomType('private')}
                className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                  roomType === 'private'
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
                }`}
              >
                <Lock size={16} />
                Privada
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleQuickPlay}
                className="w-full py-3 bg-primary-foreground/90 hover:bg-primary-foreground text-primary font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Play size={20} />
                Juego Rápido
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="w-full py-3 bg-primary-foreground/90 hover:bg-primary-foreground text-primary font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={20} />
                Crear Sala
              </button>
            </div>
          </motion.div>

          {/* Join Room Card */}
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-gradient-to-br from-accent to-accent/80 rounded-2xl p-6 border-4 border-accent/50 shadow-xl"
          >
            <h3 className="text-2xl font-black text-accent-foreground text-center mb-6">
              Unirse a Sala
            </h3>
            <div className="space-y-3">
              <Input
                placeholder="Código de sala"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                maxLength={4}
                className="text-center text-xl font-bold tracking-widest bg-white/90 border-0 text-gray-800 placeholder:text-gray-400"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isLoading || roomCode.length !== 4}
                className="w-full py-3 bg-accent-foreground/90 hover:bg-accent-foreground text-accent font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Users size={20} />
                Unirse
              </button>
            </div>
          </motion.div>

          {/* Player Name Card */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl p-6 border-4 border-border shadow-xl"
          >
            <h3 className="text-2xl font-black text-foreground text-center mb-6">
              Tu Nombre
            </h3>
            <div className="space-y-3">
              <Input
                placeholder="Tu nombre"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                maxLength={15}
                className="text-center text-lg font-bold bg-background border-border"
              />
              <p className="text-center text-sm text-muted-foreground">
                Este nombre verán los demás jugadores
              </p>
            </div>
          </motion.div>
        </div>

        {onBack && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={onBack}
            className="mt-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </motion.button>
        )}
      </div>
    );
  }

  // Update room type in database
  const updateRoomType = async (newType: RoomType) => {
    setRoomType(newType);
    await supabase
      .from('game_rooms')
      .update({ settings: { isPublic: newType === 'public' } })
      .eq('code', createdRoomCode);
  };

  // Waiting room view (after joining by code/link)
  if (view === 'waiting_room') {
    const code = joinedRoomCode || roomCode;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-accent to-accent/80 rounded-2xl p-8 border-4 border-accent/50 shadow-xl max-w-md w-full"
        >
          <h3 className="text-2xl font-black text-accent-foreground text-center mb-2">
            Sala
          </h3>

          {/* Room Code Display */}
          <div className="flex justify-center gap-2 mb-4">
            {code.split('').map((char, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-14 h-14 bg-accent-foreground rounded-xl flex items-center justify-center"
              >
                <span className="text-3xl font-black text-accent">{char}</span>
              </motion.div>
            ))}
          </div>

          {/* Players List */}
          <div className="bg-accent-foreground/10 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-accent-foreground" />
              <span className="text-accent-foreground font-semibold">
                Jugadores ({roomPlayers.length})
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {roomPlayers.length === 0 ? (
                  <p className="text-accent-foreground/70 text-sm text-center py-2">
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
                      className="flex items-center gap-2 bg-accent-foreground/15 rounded-lg px-3 py-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center">
                        <User size={16} className="text-accent-foreground" />
                      </div>
                      <span className="text-accent-foreground font-medium flex-1">
                        {player.username}
                      </span>
                      {index === 0 && (
                        <span className="text-xs bg-accent-foreground text-accent px-2 py-0.5 rounded-full font-bold">
                          Host
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-3">
            <div className="w-full py-3 bg-accent-foreground/15 text-accent-foreground font-semibold rounded-xl flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
              Esperando al host...
            </div>
            <button
              onClick={() => {
                setJoinedRoomCode('');
                setRoomPlayers([]);
                setView('main');
              }}
              className="w-full py-2 text-accent-foreground/80 hover:text-accent-foreground text-sm transition-colors"
            >
              Salir
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Create Room view (after room is created)
  if (view === 'create') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 border-4 border-primary/50 shadow-xl max-w-md w-full"
        >
          {/* Room Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => updateRoomType('public')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                roomType === 'public'
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
              }`}
            >
              <Globe size={16} />
              Pública
            </button>
            <button
              onClick={() => updateRoomType('private')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                roomType === 'private'
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
              }`}
            >
              <Lock size={16} />
              Privada
            </button>
          </div>

          <h3 className="text-2xl font-black text-primary-foreground text-center mb-2">
            Código de Sala
          </h3>

          {/* Room Code Display */}
          <div className="flex justify-center gap-2 mb-4">
            {createdRoomCode.split('').map((char, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-14 h-14 bg-primary-foreground rounded-xl flex items-center justify-center"
              >
                <span className="text-3xl font-black text-primary">{char}</span>
              </motion.div>
            ))}
          </div>

          {/* Players List */}
          <div className="bg-primary-foreground/10 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-primary-foreground" />
              <span className="text-primary-foreground font-semibold">
                Jugadores ({roomPlayers.length})
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {roomPlayers.length === 0 ? (
                  <p className="text-primary-foreground/60 text-sm text-center py-2">
                    Esperando jugadores...
                  </p>
                ) : (
                  roomPlayers.map((player, index) => (
                    <motion.div
                      key={player.oderId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 bg-primary-foreground/20 rounded-lg px-3 py-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-foreground/30 flex items-center justify-center">
                        <User size={16} className="text-primary-foreground" />
                      </div>
                      <span className="text-primary-foreground font-medium flex-1">
                        {player.username}
                      </span>
                      {index === 0 && (
                        <span className="text-xs bg-primary-foreground text-primary px-2 py-0.5 rounded-full font-bold">
                          Host
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={copyRoomLink}
              className="w-full py-3 bg-primary-foreground/90 hover:bg-primary-foreground text-primary font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? 'Copiado' : 'Copiar Enlace'}
            </button>
            <button
              onClick={handleStartPrivateGame}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Play size={20} />
              Iniciar Partida
            </button>
            <button
              onClick={() => setView('main')}
              className="w-full py-2 text-primary-foreground/80 hover:text-primary-foreground font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
