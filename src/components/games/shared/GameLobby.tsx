import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, ArrowLeft, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { RealtimeChannel } from '@supabase/supabase-js';

type Difficulty = 'easy' | 'medium' | 'hard';

interface GameLobbyProps {
  roomCode: string;
  gameSlug: string;
  gameTitle: string;
  onGameStart: (difficulty: Difficulty) => void;
  onCancel: () => void;
  joinFromLink?: boolean;
}

interface RoomPlayer {
  oderId: string;
  username: string;
  joinedAt: string;
  isHost?: boolean;
}

export default function GameLobby({
  roomCode,
  gameSlug,
  gameTitle,
  onGameStart,
  onCancel,
  joinFromLink = false,
}: GameLobbyProps) {
  const [hasJoined, setHasJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const oderId = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Generar un oderId si no existe
  useEffect(() => {
    if (!oderId.current) {
      oderId.current = `user_${Math.random().toString(36).slice(2, 10)}`;
    }
  }, []);

  // Conectar a Supabase Presence solo cuando el usuario confirmó nombre
  useEffect(() => {
    if (!hasJoined || !confirmedName) return;

    const code = roomCode.toUpperCase();
    const channelName = `game:${gameSlug}:${code}`;

    // Si ya hay un channel activo, limpiarlo antes
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: oderId.current!,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const players: RoomPlayer[] = [];

      Object.entries(state).forEach(([id, presences]) => {
        const presence = presences[0] as any;
        if (presence) {
          players.push({
            oderId: id,
            username: presence.username,
            joinedAt: presence.joinedAt,
            isHost: presence.isHost,
          });
        }
      });

      players.sort((a, b) => new Date(a.joinedAt).getTime() - Date.parse(b.joinedAt));
      setRoomPlayers(players);
    });

    channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
      const diff = (payload as any)?.difficulty;
      toast.success('¡El host ha iniciado la partida!');
      onGameStart(diff === 'easy' || diff === 'medium' || diff === 'hard' ? diff : 'medium');
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          username: confirmedName,
          joinedAt: new Date().toISOString(),
          isHost: false,
          oderId: oderId.current,
        });
        toast.success(`Te uniste a la sala`);
      }
    });

    channelRef.current = channel;

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [hasJoined, confirmedName, roomCode, gameSlug, onGameStart]);

  const handleConfirmName = () => {
    const name = playerName.trim();
    if (name.length < 2) {
      toast.error("El username debe tener al menos 2 caracteres");
      return;
    }
    setConfirmedName(name);
    setHasJoined(true);
  };

  // Modal obligatorio si entró por link y no confirmó username
  if (joinFromLink && !confirmedName) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-2xl p-6 border border-border max-w-sm w-full"
        >
          <h3 className="text-xl font-bold text-center mb-4">Elige tu username</h3>
          <Input
            placeholder="Tu nombre en la sala"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
            maxLength={15}
            className="text-center text-lg font-bold mb-4"
          />
          <button
            onClick={handleConfirmName}
            disabled={playerName.trim().length < 2}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <User size={18} /> Confirmar
          </button>
        </motion.div>
      </div>
    );
  }

  // Loader si está cargando
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando sala...</p>
      </div>
    );
  }

  // Vista de ingreso manual (si no entró por link)
  if (!hasJoined) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-2xl p-6 border border-border max-w-sm w-full"
        >
          <h2 className="text-2xl font-bold text-center mb-2">{gameTitle}</h2>
          <p className="text-muted-foreground text-center mb-6">Sala {roomCode.toUpperCase()}</p>

          <div className="flex justify-center gap-2 mb-4">
            {roomCode.toUpperCase().split('').map((c, i) => (
              <motion.div key={i} className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <span className="text-2xl font-black">{c}</span>
              </motion.div>
            ))}
          </div>

          <Input
            placeholder="Elige tu username"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
            maxLength={15}
            className="text-center font-bold text-lg mb-4"
          />

          <button
            disabled={roomCode.length !== 4 || playerName.trim().length < 2}
            onClick={handleConfirmName}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Trophy size={18} /> Unirse a la sala
          </button>

          <button onClick={onCancel} className="mt-4 text-muted-foreground hover:text-foreground text-sm w-full flex items-center justify-center gap-1">
            <ArrowLeft size={16} /> Volver
          </button>
        </motion.div>
      </div>
    );
  }

  // Vista de sala conectada
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border border-primary/30 max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-center mb-2">{gameTitle}</h2>
        <p className="text-muted-foreground text-center mb-6">Sala {roomCode.toUpperCase()}</p>

        <div className="bg-background/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} /> <span className="font-semibold">Jugadores ({roomPlayers.length})</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <AnimatePresence>
              {roomPlayers.map((p, i) => (
                <motion.div key={p.oderId} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                  <User size={16} />
                  <span className="flex-1 font-medium">{p.username}</span>
                  {p.username === confirmedName && <span className="text-xs bg-accent px-2 py-0.5 rounded-full font-bold">Tú</span>}
                  {i === 0 && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-bold">Host</span>}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        <button onClick={onCancel} className="w-full py-2 text-muted-foreground hover:text-foreground text-sm">
          Salir de la sala
        </button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          El juego iniciará cuando el host presione <strong>"Iniciar Partida"</strong>
        </p>
      </motion.div>
    </div>
  );
}
