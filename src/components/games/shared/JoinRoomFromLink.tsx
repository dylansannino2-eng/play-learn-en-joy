import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowLeft, User, Loader2, AlertCircle } from "lucide-react";
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

interface RoomData {
  id: string;
  code: string;
  host_name: string;
  status: string;
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

  // Nombre vacío para obligar al usuario a escribir
  const [playerName, setPlayerName] = useState(user?.email?.split("@")[0] || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomCode) return;

      setIsLoading(true);
      setError(null);

      try {
        // Usamos .ilike para evitar errores por mayúsculas/minúsculas
        const { data, error: supabaseError } = await supabase
          .from("game_rooms")
          .select("id, code, host_name, status")
          .ilike("code", roomCode.trim())
          .eq("game_slug", gameSlug)
          .maybeSingle();

        if (supabaseError) throw supabaseError;

        if (!data) {
          setError("La sala no existe o el código es inválido.");
        } else if (data.status !== "waiting") {
          setError("La partida ya ha comenzado.");
        } else {
          setRoomData(data);
        }
      } catch (err) {
        console.error("Error fetching room:", err);
        setError("Error al conectar con la sala.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomCode, gameSlug]);

  const handleJoin = () => {
    if (!playerName.trim() || playerName.length < 2) {
      toast.error("Ingresa un nombre válido (mín. 2 caracteres)");
      return;
    }
    setIsJoining(true);
    // IMPORTANTE: Esto le dice a GameLobby que ya puede proceder
    onJoined(playerName.trim());
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#1c1f2e] border border-white/10 p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">¡Ups!</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Volver al menú
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1c1f2e] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">{gameTitle}</h2>
          <p className="text-white/60 text-sm">Invitación de {roomData?.host_name}</p>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2 ml-1">
            Tu Nombre de Jugador
          </label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Escribe tu nombre..."
            className="bg-white/5 border-white/10 text-white text-center h-12 text-lg focus:border-purple-500"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={isJoining || !playerName.trim()}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2"
          >
            {isJoining ? <Loader2 className="animate-spin" size={20} /> : "Confirmar y Unirse"}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-white/40 hover:text-white text-sm underline transition"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
