import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Users, Plus, Copy, Check, Globe, Lock, User } from "lucide-react";
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
}: GameLobbyProps) {
  const { user } = useAuth();
  const username = user?.email?.split("@")[0] || "Jugador";

  const [view, setView] = useState<LobbyView>("main");
  const [mainStep, setMainStep] = useState<MainStep>("select");

  const [roomCode, setRoomCode] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [joinedRoomCode, setJoinedRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName ?? username);
  const [roomType, setRoomType] = useState<RoomType>("private");
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [copied, setCopied] = useState(false);

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

    const channel = supabase.channel(`game:${gameSlug}:${activeRoomCode}`, { config: { presence: { key: oderId } } });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const players: RoomPlayer[] = [];

      Object.entries(state).forEach(([id, presences]) => {
        const p = presences[0] as any;
        players.push({
          oderId: id,
          username: p.username,
          joinedAt: p.joinedAt,
        });
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
      setJoinedRoomCode(roomCode);
      setView("waiting_room");
    }
  };

  const handleStartGame = async () => {
    const payload = { startedAt: new Date().toISOString() };

    await channelRef.current?.send({
      type: "broadcast",
      event: "game_start",
      payload,
    });

    onStartGame(createdRoomCode, payload);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/game/${gameSlug}?room=${createdRoomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ---------------- UI ---------------- */

  if (view === "main") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div className="bg-primary rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-3xl font-black text-white text-center mb-6">{gameTitle}</h2>

          <AnimatePresence mode="wait">
            {mainStep === "select" && (
              <motion.div key="select" className="space-y-4">
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-center font-bold"
                />

                <button onClick={handleCreateRoom} className="btn">
                  <Plus /> Crear sala
                </button>

                <button onClick={() => setMainStep("join")} className="btn">
                  <Users /> Unirse
                </button>
              </motion.div>
            )}

            {mainStep === "join" && (
              <motion.div key="join" className="space-y-4">
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="text-center font-bold"
                />
                <button onClick={handleJoinRoom} className="btn">
                  Unirse
                </button>
                <button onClick={() => setMainStep("select")} className="text-white/70">
                  Volver
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div className="bg-primary rounded-2xl p-8 w-full max-w-md text-white">
          <h3 className="text-2xl font-black text-center mb-4">Sala creada</h3>

          <div className="flex justify-center gap-2 mb-4">
            {createdRoomCode.split("").map((c) => (
              <div
                key={c}
                className="w-12 h-12 bg-white text-primary font-black flex items-center justify-center rounded-xl"
              >
                {c}
              </div>
            ))}
          </div>

          <button onClick={copyLink} className="btn">
            {copied ? <Check /> : <Copy />} Copiar link
          </button>

          <button onClick={handleStartGame} className="btn bg-green-500 mt-2">
            <Play /> Iniciar partida
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === "waiting_room") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div className="bg-primary rounded-2xl p-8 w-full max-w-md text-white">
          <h3 className="text-xl font-bold text-center mb-4">Esperando al host…</h3>

          {roomPlayers.map((p) => (
            <div key={p.oderId} className="flex gap-2 items-center">
              <User /> {p.username}
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  return null;
}
