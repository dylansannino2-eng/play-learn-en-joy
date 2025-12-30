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

  // Forzamos que empiece vacío para obligar a elegir nombre
  const [playerName, setPlayerName] = useState(user?.email?.split("@")[0] || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomCode || !gameSlug) return;

      setIsLoading(true);
      setError(null);

      try {
        // Usamos .ilike para evitar errores por minúsculas/mayúsculas en el código
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
        console.error("Error:", err);
        setError("Error al conectar con la sala.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomCode, gameSlug]);

  const handleJoin = () => {
    if (!playerName.trim() || playerName.length < 2) {
      toast.error("Por favor, ingresa un nombre válido");
      return;
    }
    setIsJoining(true);
    onJoined(playerName.trim());
  };

  if (isLoading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  if (error)
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">¡Ups!</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="w-full py-3 bg-secondary rounded-xl flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Volver al menú
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border p-8 rounded-3xl max-w-md w-full"
      >
        <div className="text-center mb-6">
          <Users className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-black">{gameTitle}</h2>
          <p className="text-muted-foreground">Sala de {roomData?.host_name}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Tu Nombre</label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Escribe tu nombre..."
            className="text-center text-lg h-12"
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={isJoining || !playerName.trim()}
          className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isJoining ? <Loader2 className="animate-spin" size={20} /> : "Confirmar y Unirse"}
        </button>
      </motion.div>
    </div>
  );
}
