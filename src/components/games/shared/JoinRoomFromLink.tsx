import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowLeft, User, Loader2 } from "lucide-react";
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

export default function JoinRoomFromLink({
  roomCode,
  gameSlug,
  gameTitle,
  onJoined,
  onGameStart,
  onCancel,
}: JoinRoomFromLinkProps) {
  const { user } = useAuth();
  const defaultUsername = user?.email?.split("@")[0] || "Jugador";

  const [playerName, setPlayerName] = useState(defaultUsername);
  const [confirmedName, setConfirmedName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<any | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch room data
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

  // Connect to room presence when joined AND username confirmado
  useEffect(() => {
    if (!hasJoined || !roomData || !confirmedName) return;

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
    channel.on("broadcast", { event: "game_start" }, ({ payload }) => {
      const diff = (payload as any)?.difficulty;
      toast.success("¡El host ha iniciado la partida!");
      onGameStart(diff === "easy" || diff === "medium" || diff === "hard" ? diff : "medium");
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          username: confirmedName,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [hasJoined, roomData, confirmedName, gameSlug, roomCode, user?.id, onGameStart]);

  const handleConfirmName = () => {
    const name = playerName.trim();
    if (name.length < 2) {
      toast.error("El username debe tener al menos 2 caracteres");
      return;
    }
    setConfirmedName(name);
    setHasJoined(true);
    onJoined(name);
    toast.success(`Te has unido a la sala de ${roomData?.host_name}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Buscando sala...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div className="bg-card rounded-2xl p-8 border border-border max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="w-full py-3 bg-secondary rounded-xl flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Volver
          </button>
        </motion.div>
      </div>
    );
  }

  // === BLOQUEO OBLIGATORIO: pedir username si entró por link y no está confirmado ===
  if (!confirmedName) {
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
            className="w-full py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2"
          >
            Confirmar
          </button>
        </motion.div>
      </div>
    );
  }

  // Waiting room view (después de confirmar nombre y conectar presence)
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border border-primary/30 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-2">{gameTitle}</h2>
        <p className="text-muted-foreground text-center mb-6">Sala de {roomData?.host_name}</p>

        {/* Room Code */}
        <div className="flex justify-center gap-2 mb-6">
          {roomCode
            .toUpperCase()
            .split("")
            .map((c, i) => (
              <motion.div key={i} className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <span className="text-2xl font-black">{c}</span>
              </motion.div>
            ))}
        </div>

        {/* Players */}
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
                  {p.username === confirmedName && (
                    <span className="text-xs bg-accent px-2 py-0.5 rounded-full font-bold">Tú</span>
                  )}
                  {i === 0 && (
                    <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-bold">Host</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <button onClick={onCancel} className="w-full py-2 text-muted-foreground hover:text-foreground text-sm">
          Salir de la sala
        </button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          El juego comenzará automáticamente cuando el host presione "Iniciar Partida"
        </p>
      </motion.div>
    </div>
  );
}
