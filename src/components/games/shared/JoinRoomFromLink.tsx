import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowLeft, User, Loader2, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { RealtimeChannel } from "@supabase/supabase-js";

// ... (Tipos e Interfaces se mantienen igual)
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

  // 1. FORZAMOS ESTADO VACÍO (Nada de correos ni nombres automáticos)
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga de la sala
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
      setRoomData(data);
      setIsLoading(false);
    };
    fetchRoom();
  }, [roomCode, gameSlug]);

  // Presence y tiempo real
  useEffect(() => {
    if (!hasJoined || !roomData) return;

    const oderId = user?.id || `anon_${Math.random().toString(36).slice(2, 10)}`;
    const channelName = `game:${gameSlug}:${roomCode.toUpperCase()}`;
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: { presence: { key: oderId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const players: RoomPlayer[] = [];
      Object.entries(state).forEach(([id, presences]) => {
        const presence = presences[0] as any;
        if (presence) players.push({ oderId: id, username: presence.username, joinedAt: presence.joinedAt });
      });
      setRoomPlayers(players.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()));
    });

    channel.on("broadcast", { event: "game_start" }, ({ payload }) => {
      const diff = ((payload as any)?.difficulty as Difficulty) || "medium";
      onGameStart(diff);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ username: playerName.trim(), joinedAt: new Date().toISOString() });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [hasJoined, roomData, gameSlug, roomCode, user?.id, playerName, onGameStart]);

  // 2. LÓGICA DE UNIÓN ESTRICTA
  const handleJoin = () => {
    const nameToRegister = playerName.trim();

    if (nameToRegister.length < 2) {
      toast.error("Escribe un nombre real (mínimo 2 letras)");
      return;
    }

    setIsJoining(true);
    // IMPORTANTE: Primero notificamos al padre y luego cambiamos la vista local
    onJoined(nameToRegister);
    setHasJoined(true);
    setIsJoining(false);
  };

  if (isLoading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  if (error)
    return (
      <div className="text-center p-8">
        <h2>{error}</h2>
        <button onClick={onCancel}>Volver</button>
      </div>
    );

  // 3. VISTA DE ESPERA
  if (hasJoined) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-2xl border border-border w-full max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">¡Estás dentro, {playerName}!</h2>
          <div className="animate-pulse flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            Esperando a que el host inicie...
          </div>
          {/* Lista de jugadores simplificada */}
          <div className="mt-6 space-y-2">
            {roomPlayers.map((p) => (
              <div key={p.oderId} className="bg-secondary/30 p-2 rounded-lg text-sm flex justify-between">
                <span>{p.username}</span>
                {p.username === playerName && <span className="text-primary font-bold">Tú</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 4. VISTA DE FORMULARIO OBLIGATORIO
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-8 rounded-3xl border-2 border-primary/20 w-full max-w-md shadow-2xl"
      >
        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Edit3 className="text-primary" size={32} />
        </div>

        <h2 className="text-2xl font-black text-center mb-2">¿Cómo te llamas?</h2>
        <p className="text-muted-foreground text-center mb-8">
          Para entrar en la sala de <strong>{roomData?.host_name}</strong> necesitas un nombre.
        </p>

        <div className="space-y-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Tu apodo aquí..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="h-14 text-center text-xl font-bold rounded-2xl border-2 focus:border-primary transition-all"
              autoFocus
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={playerName.trim().length < 2 || isJoining}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {isJoining ? "ENTRANDO..." : "¡ENTRAR A JUGAR!"}
          </button>

          <button onClick={onCancel} className="w-full text-muted-foreground text-sm hover:underline">
            Elegir otro juego
          </button>
        </div>
      </motion.div>
    </div>
  );
}
