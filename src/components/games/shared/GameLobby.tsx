import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Plus, Copy, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface GameLobbyProps {
  gameSlug: string;
  gameTitle: string;
  onStartGame: (roomCode?: string) => void;
  onBack?: () => void;
}

type LobbyView = 'main' | 'join' | 'create';

export default function GameLobby({ gameSlug, gameTitle, onStartGame, onBack }: GameLobbyProps) {
  const { user } = useAuth();
  const username = user?.email?.split('@')[0] || 'Jugador';
  
  const [view, setView] = useState<LobbyView>('main');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState(username);

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
    
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .eq('game_slug', gameSlug)
      .maybeSingle();

    if (error || !data) {
      toast.error('Sala no encontrada');
    } else if (data.status !== 'waiting') {
      toast.error('La partida ya comenzó');
    } else {
      onStartGame(roomCode.toUpperCase());
    }
    
    setIsLoading(false);
  };

  const handleQuickPlay = () => {
    onStartGame(); // No room code = public game
  };

  const handleStartPrivateGame = () => {
    onStartGame(createdRoomCode);
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
            <h3 className="text-2xl font-black text-primary-foreground text-center mb-6">
              Jugar
            </h3>
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

  // Create Room view (after room is created)
  if (view === 'create') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 border-4 border-primary/50 shadow-xl max-w-md w-full"
        >
          <h3 className="text-2xl font-black text-primary-foreground text-center mb-2">
            ¡Sala Creada!
          </h3>
          <p className="text-primary-foreground/80 text-center mb-6">
            Comparte el código con tus amigos
          </p>

          {/* Room Code Display */}
          <div className="flex justify-center gap-2 mb-6">
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
