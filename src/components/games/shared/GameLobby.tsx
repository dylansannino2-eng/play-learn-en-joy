import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Users, Plus, Copy, Check, ArrowLeft, Globe, Lock, User } from "lucide-react";
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

interface RoomPlayer {
  oderId: string;
  username: string;
  joinedAt: string;
}

type LobbyView = "main" | "create" | "waiting_room";
type RoomType = "public" | "private";
type MainStep = "select" | "join";

export default function GameLobby({
  gameSlug,
  gameTitle,
  initialRoomCode,
  defaultPlayerName,
  onPlayerNameChange,
  onStartGame,
  onBack,
}: GameLobbyProps) {
  const { user } = useAuth();
  const username = user?.email?.split("@")[0] || "Jugador";

  const [view, setView] = useState<LobbyView>("main");
  const [mainStep, setMainStep] = useState<MainStep>("select");

  const [roomCode, setRoomCode] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [joinedRoomCode, setJoinedRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState(defaultPlayerName ?? username);
  const [roomType, setRoomType] = useState<RoomType>("private");
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  useEffect(() => {
    const activeRoomCode = view === "create" ? createdRoomCode : view === "waiting_room" ? joinedRoomCode : "";

    if (!activeRoomCode) return;

    const oderId = user?.id || `anon_${Math.random().toString(36).slice(2, 10)}`;
    const channelName = `game:${gameSlug}:${activeRoomCode}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: oderId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const players: RoomPlayer[] = [];

      Object.entries(state).forEach(([id, presences]) => {
        const p = presences[0] as any;
        if (p) {
          players.push({
            oderId: id,
            username: p.username,
            joinedAt: p.joinedAt,
          });
        }
      });

      players.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

      setRoomPlayers(players);
    });

    if (view === "waiting_room") {
      channel.on("broadcast", { event: "game_start" }, ({ payload }) => {
        toast.success("¡El host inició la partida!");
        onStartGame(activeRoomCode, payload);
      });
    }

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          username: playerName,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;
    return () => channel.unsubscribe();
  }, [view, createdRoomCode, joinedRoomCode, gameSlug, playerName, onStartGame, user?.id]);

  /* ---------------- helpers ---------------- */

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  };

  /* ---------------- handlers ---------------- */

  const handleCreateRoom = async () => {
    setIsLoading(true);
    const code = generateCode();

    const { error } = await supabase.from("game_rooms").insert({
      code,
      game_slug: gameSlug,
      host_id: user?.id ?? null,
      host_name: playerName,
      status: "waiting",
      settings: { isPublic: roomType === "public" },
    });

    if (error) {
      toast.error("Error al crear la sala");
    } else {
      setCreatedRoomCode(code);
      setView("create");
    }
    setIsLoading(false);
  };

  const handleJoinRoom = async () => {
    if (roomCode.length !== 4) return;

    setIsLoading(true);

    const { data } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("code", roomCode)
      .eq("game_slug", gameSlug)
      .maybeSingle();

    if (!data) {
      toast.error("Sala no encontrada");
    } else {
      setJoinedRoomCode(roomCode);
      setView("waiting_room");
    }

    setIsLoading(false);
  };

  const handleQuickPlay = () => onStartGame();

  /* ---------------- UI ---------------- */

  if (view === "main") {
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

  return null;
}
