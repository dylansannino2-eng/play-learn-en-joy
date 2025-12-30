import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Copy, Check, Users, Wifi, WifiOff, Pencil, LogIn, ArrowRight, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/* =======================
    TYPES
======================= */

type View = "menu" | "name_selection" | "room_created" | "waiting_room";
type Difficulty = "easy" | "medium" | "hard";

type StartPayloadBuilder = (args: { difficulties: Difficulty[]; roomCode: string }) => Promise<unknown> | unknown;

interface Player {
  odId: string;
  username: string;
  isHost: boolean;
}

interface GameLobbyStartParams {
  difficulties: Difficulty[];
  roomCode?: string;
  isHost: boolean;
  startPayload?: unknown;
  playerName: string;
}

interface GameLobbyProps {
  gameSlug: string;
  initialRoomCode?: string;
  existingRoomCode?: string;
  isHostReturning?: boolean;
  initialPlayerName?: string;
  onStartGame: (payload: GameLobbyStartParams) => void;
  buildStartPayload?: StartPayloadBuilder;
}

export default function GameLobby({
  gameSlug,
  initialRoomCode,
  existingRoomCode,
  isHostReturning,
  initialPlayerName,
  onStartGame,
  buildStartPayload,
}: GameLobbyProps) {
  // 1. Estados de navegación y flujo
  const [view, setView] = useState<View>("menu");
  const [pendingAction, setPendingAction] = useState<{ type: "create" | "join"; code?: string } | null>(null);

  const [difficulties, setDifficulties] = useState<Difficulty[]>(["medium"]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(isHostReturning ?? !initialRoomCode);
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Nombre vacío por defecto para forzar la elección
  const [playerName, setPlayerName] = useState(initialPlayerName || "");

  const [isJoining, setIsJoining] = useState(false);
  const [inputCode, setInputCode] = useState("");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const oderId = useRef(`player_${Math.random().toString(36).slice(2, 10)}`);

  /* ---------------- Realtime Logic ---------------- */

  useEffect(() => {
    // IMPORTANTE: Solo nos conectamos si hay un roomCode y NO estamos en selección de nombre
    if (!roomCode || view === "name_selection") return;

    const channelName = `lobby:${gameSlug}:${roomCode}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: oderId.current } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const updatedPlayers: Player[] = [];
      Object.entries(state).forEach(([id, presences]) => {
        const p = (presences as any[])[(presences as any[]).length - 1] as any;
        if (p) {
          updatedPlayers.push({
            odId: id,
            username: p.username,
            isHost: p.isHost ?? false,
          });
        }
      });
      setPlayers(updatedPlayers);
    });

    channel.on("broadcast", { event: "game_start" }, ({ payload }) => {
      const p = payload as any;
      onStartGame({
        difficulties: p.difficulties as Difficulty[],
        roomCode: p.roomCode as string,
        isHost: false,
        startPayload: p.startPayload,
        playerName,
      });
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          username: playerName,
          isHost,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomCode, view, gameSlug, isHost, onStartGame, playerName]);

  /* ---------------- Handlers ---------------- */

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  // Preparamos la acción pero no la ejecutamos hasta tener el nombre
  const prepareCreateRoom = () => {
    setPendingAction({ type: "create" });
    setView("name_selection");
  };

  const prepareJoinRoom = () => {
    if (inputCode.length !== 4) return;
    setPendingAction({ type: "join", code: inputCode.toUpperCase() });
    setView("name_selection");
  };

  const handleConfirmName = () => {
    if (!playerName.trim()) return;

    if (pendingAction?.type === "create") {
      const code = generateRoomCode();
      setRoomCode(code);
      setIsHost(true);
      setView("room_created");
    } else if (pendingAction?.type === "join") {
      setRoomCode(pendingAction.code!);
      setIsHost(false);
      setView("waiting_room");
    }
  };

  const handleQuickPlay = () => {
    onStartGame({ difficulties, isHost: true, playerName: playerName || "Jugador" });
  };

  const handleStartRoomGame = async () => {
    if (!roomCode) return;
    const startPayload = buildStartPayload ? await buildStartPayload({ difficulties, roomCode }) : undefined;
    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "game_start",
        payload: { difficulties, roomCode, startPayload },
      });
    }
    onStartGame({ difficulties, roomCode, isHost: true, startPayload, playerName });
  };

  const copyLink = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}/game/${gameSlug}?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* =========================
        VISTAS
  ========================= */

  // PASO PREVIO: Selección de Username
  if (view === "name_selection") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#1c1f2e] to-[#141625] border border-white/10 shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
            <UserIcon size={32} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">¿Cuál es tu nombre?</h2>
          <p className="text-white/60 mb-8">Este nombre aparecerá en la sala para los demás.</p>

          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
            placeholder="Escribe tu nombre..."
            autoFocus
            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-center text-xl font-bold focus:outline-none focus:border-purple-500 transition mb-6"
          />

          <div className="space-y-3">
            <button
              onClick={handleConfirmName}
              disabled={!playerName.trim()}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Confirmar e Entrar <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setView("menu")}
              className="w-full py-2 text-white/40 hover:text-white transition text-sm underline"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // MENÚ PRINCIPAL
  if (view === "menu") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#1c1f2e] to-[#141625] border border-white/10 shadow-2xl"
        >
          <h1 className="text-3xl font-black text-center text-white mb-6 underline decoration-purple-500">Lobby</h1>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {["easy", "medium", "hard"].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulties([level as Difficulty])}
                className={`rounded-2xl p-4 text-center transition border ${
                  difficulties.includes(level as Difficulty)
                    ? "bg-yellow-400/20 border-yellow-400 text-yellow-300"
                    : "bg-white/5 border-white/10 text-white"
                }`}
              >
                <div className="font-bold capitalize">{level}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleQuickPlay}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" /> Play (Solo)
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={prepareCreateRoom}
                className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold transition border border-white/10 flex items-center justify-center gap-2"
              >
                <Users size={18} /> Create Room
              </button>

              <button
                onClick={() => setIsJoining(!isJoining)}
                className={`py-4 rounded-2xl transition border border-white/10 font-semibold flex items-center justify-center gap-2 ${
                  isJoining ? "bg-purple-500/20 text-purple-300 border-purple-500/50" : "bg-white/5 text-white"
                }`}
              >
                <LogIn size={18} /> Join
              </button>
            </div>

            <AnimatePresence>
              {isJoining && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="CÓDIGO"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center font-bold tracking-widest focus:outline-none"
                    />
                    <button
                      disabled={inputCode.length !== 4}
                      onClick={prepareJoinRoom}
                      className="px-6 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-50"
                    >
                      Go
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  // VISTAS DE SALA ACTIVA (Host o Invitado)
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#3a2a78] to-[#1b163a] border border-white/10 shadow-2xl"
      >
        <h2 className="text-3xl font-black text-white text-center mb-2">
          {view === "room_created" ? "¡Sala Creada!" : `Sala ${roomCode}`}
        </h2>
        <p className="text-center text-white/70 mb-6">
          {view === "room_created" ? "Comparte el código con tus amigos" : "Esperando al host..."}
        </p>

        {view === "room_created" && (
          <div className="flex justify-center gap-3 mb-6">
            {roomCode?.split("").map((c, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20"
              >
                <span className="text-2xl font-black text-white">{c}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
            <Users size={18} className="text-white/70" />
            <span className="text-white/70 text-sm">Jugadores ({players.length})</span>
            {isConnected ? (
              <Wifi size={14} className="text-green-400 ml-auto" />
            ) : (
              <WifiOff size={14} className="text-red-400 ml-auto" />
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {players.map((p) => (
              <div
                key={p.odId}
                className={`flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 ${p.username === playerName ? "border border-purple-500/30" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white text-sm font-medium">
                  {p.username} {p.username === playerName ? "(Tú)" : ""}
                </span>
                {p.isHost && (
                  <span className="ml-auto text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full font-bold uppercase">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <div className="space-y-3">
            <button
              onClick={copyLink}
              className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold flex items-center justify-center gap-2 transition"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copiado" : "Copiar Enlace"}
            </button>
            <button
              onClick={handleStartRoomGame}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-2 transition"
            >
              <Play size={18} /> Iniciar Partida
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-white/60 py-4">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-sm">Esperando inicio...</span>
          </div>
        )}

        <button
          onClick={() => {
            setRoomCode(null);
            setView("menu");
          }}
          className="w-full mt-4 text-center text-white/40 hover:text-white transition text-xs"
        >
          Salir de la sala
        </button>
      </motion.div>
    </div>
  );
}
