import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { RealtimeChannel } from "@supabase/supabase-js";

interface GameLobbyProps {
  gameSlug: string;
  gameTitle: string;
  initialRoomCode?: string;
  defaultPlayerName?: string;
  onPlayerNameChange?: (name: string) => void;
  onStartGame: (roomCode?: string, payload?: unknown) => void;
  onBack?: () => void;
}

type LobbyView = "main";

export default function GameLobby({
  gameSlug,
  gameTitle,
  initialRoomCode,
  defaultPlayerName,
  onPlayerNameChange,
  onStartGame,
}: GameLobbyProps) {
  const { user } = useAuth();
  const username = user?.email?.split("@")[0] || "Jugador";

  const [view] = useState<LobbyView>("main");
  const [mainStep, setMainStep] = useState<"select" | "join">("select");

  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName ?? username);

  /* ---------------- effects ---------------- */

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase().slice(0, 4));
      setMainStep("join");
    }
  }, [initialRoomCode]);

  useEffect(() => {
    onPlayerNameChange?.(playerName);
  }, [playerName, onPlayerNameChange]);

  /* ---------------- handlers ---------------- */

  const handleQuickPlay = () => onStartGame();

  const handleCreateRoom = () => {
    toast.info("Crear sala (base restaurada)");
  };

  const handleJoinRoom = async () => {
    if (roomCode.length !== 4) return;

    const { data } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("code", roomCode)
      .eq("game_slug", gameSlug)
      .maybeSingle();

    if (!data) {
      toast.error("Sala no encontrada");
    } else {
      toast.success("Sala encontrada");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 border-4 border-primary/50 shadow-xl max-w-md w-full"
      >
        <h2 className="text-3xl font-black text-primary-foreground text-center mb-6">{gameTitle}</h2>

        <AnimatePresence mode="wait">
          {mainStep === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                className="text-center font-bold"
              />

              <button
                onClick={handleQuickPlay}
                className="w-full py-3 bg-primary-foreground text-primary font-bold rounded-xl flex justify-center gap-2"
              >
                <Play /> Juego rápido
              </button>

              <button
                onClick={handleCreateRoom}
                className="w-full py-3 bg-primary-foreground/90 text-primary font-bold rounded-xl flex justify-center gap-2"
              >
                <Plus /> Crear sala
              </button>

              <button
                onClick={() => setMainStep("join")}
                className="w-full py-3 bg-primary-foreground/80 text-primary font-bold rounded-xl flex justify-center gap-2"
              >
                <Users /> Unirse a sala
              </button>
            </motion.div>
          )}

          {mainStep === "join" && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Input
                placeholder="Código"
                value={roomCode}
                maxLength={4}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="text-center text-xl font-bold"
              />

              <button
                onClick={handleJoinRoom}
                className="w-full py-3 bg-primary-foreground text-primary font-bold rounded-xl"
              >
                Unirse
              </button>

              <button onClick={() => setMainStep("select")} className="text-primary-foreground/80 text-sm">
                ← Volver
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
