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

  // Estado inicial vacío para forzar la elección
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Validar la existencia de la sala al cargar
  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("game_rooms")
        .select("id, code, host_name, status, settings")
        .eq("code", roomCode.toUpperCase())
        .eq("game_slug", gameSlug)
        .maybeSingle();

      if (error || !data) {
        setError("La sala que buscas no existe o ha sido cerrada.");
        setIsLoading(false);
        return;
      }

      if (data.status !== "waiting") {
        setError("Lo sentimos, la partida ya ha comenzado.");
        setIsLoading(false);
        return;
      }

      setRoomData(data);
      setIsLoading(false);
    };

    fetchRoom();
  }, [roomCode, gameSlug]);

  // 2. Conexión a Realtime (Presence) - SOLO se ejecuta cuando hasJoined es true
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

  const handleJoinAction = async () => {
    if (!playerName.trim() || playerName.trim().length < 2) {
      toast.error("Por favor, ingresa un nombre válido (mínimo 2 caracteres)");
      return;
    }

    setIsJoining(true);

    // Simular una pequeña carga para mejorar la UX
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Activar la unión: Esto disparará el useEffect de Presence
    setHasJoined(true);
    onJoined(playerName.trim());
    setIsJoining(false);
    toast.success(`¡Bienvenido/a, ${playerName}!`);
  };

  // --- VISTAS DE ESTADO ---

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground animate-pulse">Verificando sala...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card p-8 rounded-2xl border text-center max-w-sm w-full shadow-xl"
        >
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Error de acceso</h2>
          <p className="text-muted-foreground mb-6 text-sm">{error}</p>
          <button
            onClick={onCancel}
            className="w-full py-3 bg-secondary rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft size={18} /> Volver al inicio
          </button>
        </motion.div>
      </div>
    );
  }

  // VISTA 2: Sala de espera (Cuando ya eligió nombre y está conectado)
  if (hasJoined) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-3xl p-8 border-2 border-primary/20 max-w-md w-full shadow-2xl"
        >
          <header className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 inline-block">
              Esperando inicio
            </span>
            <h2 className="text-3xl font-black text-foreground">{gameTitle}</h2>
            <p className="text-muted-foreground text-sm mt-1">Sala de {roomData?.host_name}</p>
          </header>

          <div className="bg-secondary/30 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4 border-b border-primary/10 pb-3">
              <Users size={20} className="text-primary" />
              <span className="font-bold">Jugadores en línea ({roomPlayers.length})</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {roomPlayers.map((player, index) => (
                  <motion.div
                    key={player.oderId}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${player.username === playerName ? "bg-primary/20 border border-primary/30" : "bg-background/50"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {player.username.charAt(0)}
                    </div>
                    <span className="font-medium flex-1 truncate">{player.username}</span>
                    {index === 0 && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-md font-bold uppercase">
                        Host
                      </span>
                    )}
                    {player.username === playerName && <CheckCircle2 size={16} className="text-primary" />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-4 bg-primary/5 rounded-2xl border border-dashed border-primary/30">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-sm font-medium text-primary">El host iniciará pronto...</p>
            </div>
            <button
              onClick={onCancel}
              className="w-full py-2 text-muted-foreground hover:text-destructive text-xs transition-colors font-medium"
            >
              Abandonar sala
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // VISTA 1: Paso previo (Elegir Username)
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card rounded-3xl p-8 border shadow-2xl max-w-md w-full relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-primary/20" />

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <User size={40} className="text-primary -rotate-3" />
          </div>
          <h2 className="text-2xl font-black mb-2">¡Casi listo!</h2>
          <p className="text-muted-foreground">
            Estás por unirte a la partida de <strong>{roomData?.host_name}</strong>. ¿Cómo quieres que te llamen?
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Tu nombre de jugador</label>
            <Input
              autoFocus
              placeholder="Ej. SpeedyGomez"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
              onKeyDown={(e) => e.key === "Enter" && handleJoinAction()}
              className="h-14 text-center text-xl font-bold rounded-2xl border-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          <div className="pt-2 space-y-3">
            <button
              onClick={handleJoinAction}
              disabled={isJoining || playerName.trim().length < 2}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {isJoining ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" /> Entrando...
                </div>
              ) : (
                "¡Entrar a la sala!"
              )}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
