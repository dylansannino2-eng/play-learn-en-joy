import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowLeft, User, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { RealtimeChannel } from "@supabase/supabase-js";

type Difficulty = "easy" | "medium" | "hard";

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
  onCancel,
}: JoinRoomFromLinkProps) {
  const { user } = useAuth();

  // ESTADO MODIFICADO: Empezamos vacío para obligar al usuario a elegir
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar datos de la sala
  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("game_rooms")
        .select("id, code, host_name, status, settings")
        .eq("code", roomCode.toUpperCase())
        .eq("game_slug", gameSlug)
        .maybeSingle();

      if (error || !data) {
        setError("Sala no encontrada");
        setIsLoading(false);
        return;
      }

      if (data.status !== "waiting") {
        setError("La partida ya ha comenzado");
        setIsLoading(false);
        return;
      }

      setRoomData(data);
      setIsLoading(false);
    };

    fetchRoom();
  }, [roomCode, gameSlug]);

  // Gestión de Presence y Broadcast
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

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const players: RoomPlayer[] = [];

      Object.entries(state).forEach(([id, presences]) => {
        const presence = presences[0] as any;
        if (presence) {
          players.push({
            oderId: id,
            username: presence.username,
            joinedAt: presence.joinedAt,
          });
        }
      });

      players.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      setRoomPlayers(players);
    });

    channel.on("broadcast", { event: "game_start" }, ({ payload }) => {
      const maybeDifficulty = (payload as any)?.difficulty as Difficulty | undefined;
      const difficulty: Difficulty =
        maybeDifficulty === "easy" || maybeDifficulty === "medium" || maybeDifficulty === "hard"
          ? maybeDifficulty
          : "medium";

      toast.success("¡El host ha iniciado la partida!");
      onGameStart(difficulty);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          username: playerName.trim(),
          joinedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [hasJoined, roomData, gameSlug, roomCode, user?.id, playerName, onGameStart]);

  const handleJoin = async () => {
    // VALIDACIÓN: Obligatorio tener nombre
    if (!playerName.trim()) {
      toast.error("Debes ingresar un nombre para jugar");
      return;
    }

    if (playerName.trim().length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    setIsJoining(true);
    setHasJoined(true);
    onJoined(playerName.trim());

    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success(`¡Bienvenido/a a la sala, ${playerName.trim()}!`);
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
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

  // VISTA: Sala de espera (ya unido)
  if (hasJoined) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border border-primary/30 max-w-md w-full"
        >
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">{gameTitle}</h2>
          <p className="text-muted-foreground text-center mb-6">Sala de {roomData?.host_name}</p>

          <div className="flex justify-center gap-2 mb-6">
            {roomCode
              .toUpperCase()
              .split("")
              .map((char, i) => (
                <div key={i} className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-black text-primary-foreground">{char}</span>
                </div>
              ))}
          </div>

          <div className="bg-background/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-foreground" />
              <span className="text-foreground font-semibold">Jugadores ({roomPlayers.length})</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {roomPlayers.map((player, index) => (
                  <motion.div
                    key={player.oderId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={16} className="text-primary" />
                    </div>
                    <span className="text-foreground font-medium flex-1">{player.username}</span>
                    {index === 0 && (
                      <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase">
                        Host
                      </span>
                    )}
                    {player.username === playerName.trim() && (
                      <span className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold uppercase">
                        Tú
                      </span>
                    )}
                  </motion.div>
                ))}
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
        </motion.div>
      </div>
    );
  }

  // VISTA: Formulario inicial (Aquí se elige el nombre)
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl p-8 border border-border max-w-md w-full shadow-xl"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-foreground text-center mb-1">Unirse a partida</h2>
        <p className="text-muted-foreground text-center mb-8">
          Ingresa el nombre que usarás en <strong>{gameTitle}</strong>
        </p>

        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
            Tu nombre de jugador
          </label>
          <div className="relative">
            <Input
              placeholder="Ej. SpeedyGomez"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
              maxLength={15}
              className="text-center text-xl font-bold bg-background border-2 border-primary/20 focus:border-primary h-14 rounded-xl transition-all"
              autoFocus
            />
            {playerName.trim().length >= 2 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              >
                <CheckCircle2 size={20} />
              </motion.div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">Mínimo 2 caracteres, máximo 15.</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={isJoining || playerName.trim().length < 2}
            className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            {isJoining ? <Loader2 size={20} className="animate-spin" /> : "Entrar a la sala"}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
