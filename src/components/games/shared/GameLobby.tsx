import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface JoinRoomFromLinkProps {
  roomCode: string;
  gameSlug: string;
  gameTitle: string;
  onJoined: (playerName: string) => void;
  onGameStart: (difficulty: any) => void;
  onCancel: () => void;
}

export default function JoinRoomFromLink({ roomCode, gameSlug, gameTitle, onJoined, onCancel }: JoinRoomFromLinkProps) {
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState(user?.email?.split("@")[0] || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomCode) return;
      setIsLoading(true);
      setError(null);

      try {
        // CORRECCIÓN: Usar .ilike para que 'sbtp' encuentre 'SBTP'
        const { data, error: supabaseError } = await supabase
          .from("game_rooms")
          .select("id, code, host_name, status")
          .ilike("code", roomCode.trim())
          .eq("game_slug", gameSlug)
          .maybeSingle();

        if (supabaseError) throw supabaseError;

        if (!data) {
          setError("La sala no existe o el código ha expirado.");
        } else if (data.status !== "waiting") {
          setError("Esta partida ya está en curso.");
        } else {
          setRoomData(data);
        }
      } catch (err) {
        setError("Error al conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomCode, gameSlug]);

  const handleJoin = () => {
    if (!playerName.trim() || playerName.length < 2) {
      toast.error("Por favor, ingresa un nombre de al menos 2 letras");
      return;
    }
    setIsJoining(true);
    onJoined(playerName.trim());
  };

  if (isLoading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );

  if (error)
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#1c1f2e] border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No se pudo entrar</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="w-full py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1c1f2e] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">{gameTitle}</h2>
          <p className="text-white/60">
            Invitación de <span className="text-purple-400 font-bold">{roomData?.host_name}</span>
          </p>
        </div>

        <div className="mb-8 text-center">
          <div className="flex justify-center gap-2 mb-6">
            {roomCode
              .toUpperCase()
              .split("")
              .map((c, i) => (
                <div
                  key={i}
                  className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white font-bold"
                >
                  {c}
                </div>
              ))}
          </div>

          <label className="block text-xs font-bold uppercase text-white/40 mb-3">¿Cómo quieres que te llamen?</label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Escribe tu nombre..."
            className="bg-white/5 border-white/10 text-white text-center h-14 text-xl font-bold focus:border-purple-500 transition-all"
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={isJoining || !playerName.trim()}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
        >
          {isJoining ? <Loader2 className="animate-spin" size={20} /> : "¡Unirse a la partida!"}
        </button>
      </motion.div>
    </div>
  );
}
