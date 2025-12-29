import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Copy, Check, Users, Wifi, WifiOff, Pencil, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/* =======================
    TYPES
======================= */

type View = "menu" | "room_created" | "waiting_room";
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

/* =======================
    COMPONENT
======================= */

export default function GameLobby({
  gameSlug,
  initialRoomCode,
  existingRoomCode,
  isHostReturning,
  initialPlayerName,
  onStartGame,
  buildStartPayload,
}: GameLobbyProps) {
  const returningRoom = existingRoomCode?.toUpperCase();
  const joiningRoom = initialRoomCode?.toUpperCase();

  const [view, setView] = useState<View>(
    returningRoom ? (isHostReturning ? "room_created" : "waiting_room") : joiningRoom ? "waiting_room" : "menu",
  );
  const [difficulties, setDifficulties] = useState<Difficulty[]>(["medium"]);
  const [roomCode, setRoomCode] = useState<string | null>(returningRoom || joiningRoom || null);
  const [isHost, setIsHost] = useState(isHostReturning ?? !initialRoomCode);
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [playerName, setPlayerName] = useState(
    initialPlayerName || `Jugador_${Math.random().toString(36).slice(2, 6)}`,
  );
  const [isEditingName, setIsEditingName] = useState(false);

  const [isJoining, setIsJoining] = useState(false);
  const [inputCode, setInputCode] = useState("");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const oderId = useRef(`player_${Math.random().toString(36).slice(2, 10)}`);

  /* ---------------- Realtime channel for lobby ---------------- */

  useEffect(() => {
    if (!roomCode) return;

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
  }, [roomCode, gameSlug, isHost, onStartGame, playerName]);

  useEffect(() => {
    if (channelRef.current && isConnected) {
      channelRef.current.track({
        username: playerName,
        isHost,
        joinedAt: new Date().toISOString(),
      });
    }
  }, [playerName, isHost, isConnected]);

  /* ---------------- utils ---------------- */

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  const copyLink = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}/game/${gameSlug}?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ---------------- handlers ---------------- */

  const handleQuickPlay = () => {
    onStartGame({ difficulties, isHost: true, playerName });
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setView("room_created");
  };

  const handleJoinRoom = () => {
    if (inputCode.length === 4) {
      setRoomCode(inputCode.toUpperCase());
      setIsHost(false);
      setView("waiting_room");
    }
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

  /* =========================
        MENU VIEW
  ========================= */

  if (view === "menu") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#1c1f2e] to-[#141625] border border-white/10 shadow-2xl"
        >
          <h1 className="text-3xl font-black text-center text-white mb-2">Play</h1>
          <p className="text-center text-white/60 mb-6">Select difficulty</p>

          <div className="mb-6">
            <label className="text-white/60 text-sm mb-2 block">Tu nombre</label>
            <div className="relative">
              {isEditingName ? (
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  autoFocus
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-left flex items-center justify-between hover:bg-white/15 transition"
                >
                  <span>{playerName}</span>
                  <Pencil size={16} className="text-white/60" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { id: "easy", label: "Easy", sub: "A1, A2" },
              { id: "medium", label: "Medium", sub: "B1, B2" },
              { id: "hard", label: "Hard", sub: "C1, C2" },
            ].map((d) => {
              const active = difficulties.includes(d.id as Difficulty);
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setDifficulties((prev) => {
                      if (prev.includes(d.id as Difficulty)) {
                        if (prev.length === 1) return prev;
                        return prev.filter((diff) => diff !== d.id);
                      }
                      return [...prev, d.id as Difficulty];
                    });
                  }}
                  className={`rounded-2xl p-4 text-center transition ${
                    active
                      ? "bg-yellow-400/20 border border-yellow-400 text-yellow-300"
                      : "bg-white/5 border border-white/10 text-white"
                  }`}
                >
                  <div className="font-bold">{d.label}</div>
                  <div className="text-xs opacity-70">{d.sub}</div>
                </button>
              );
            })}
          </div>
          <p className="text-center text-white/50 text-xs mb-6">Selecciona una o más dificultades</p>

          <div className="space-y-3">
            {/* Play Solo */}
            <button
              onClick={handleQuickPlay}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" /> Play (Solo)
            </button>

            <div className="grid grid-cols-1 gap-3">
              {/* Join Button */}
              <button
                onClick={() => setIsJoining(!isJoining)}
                className={`py-4 rounded-2xl transition border border-white/10 font-semibold flex items-center justify-center gap-2 ${
                  isJoining
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                    : "bg-white/5 hover:bg-white/10 text-white"
                }`}
              >
                <LogIn size={18} /> Join (Multijugador)
              </button>

              {/* Create room */}
              <button
                onClick={handleCreateRoom}
                className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold transition border border-white/10 flex items-center justify-center gap-2"
              >
                <Users size={18} /> Create Room
              </button>
            </div>

            {/* Join Room Input Area */}
            <AnimatePresence>
              {isJoining && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="CÓDIGO"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center font-bold tracking-widest placeholder:text-white/20 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      disabled={inputCode.length !== 4}
                      onClick={handleJoinRoom}
                      className="px-6 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

  /* =========================
        ROOM CREATED VIEW (Host)
  ========================= */

  if (view === "room_created") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#3a2a78] to-[#1b163a] border border-white/10 shadow-2xl"
        >
          <h2 className="text-3xl font-black text-white text-center mb-2">¡Sala Creada!</h2>
          <p className="text-center text-white/70 mb-4">Comparte el código con tus amigos</p>

          <div className="mb-4">
            <div className="relative">
              {isEditingName ? (
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  autoFocus
                  maxLength={20}
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center gap-2 hover:bg-white/15 transition"
                >
                  <span>{playerName}</span>
                  <Pencil size={14} className="text-white/60" />
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {roomCode?.split("").map((c, i) => (
              <div key={i} className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center">
                <span className="text-2xl font-black text-white">{c}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-white/70" />
              <span className="text-white/70 text-sm">Jugadores ({players.length})</span>
              {isConnected ? (
                <Wifi size={14} className="text-green-400 ml-auto" />
              ) : (
                <WifiOff size={14} className="text-red-400 ml-auto" />
              )}
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {players.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-2">Esperando jugadores...</p>
              ) : (
                players.map((p) => (
                  <div key={p.odId} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm">{p.username}</span>
                    {p.isHost && (
                      <span className="ml-auto text-xs bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={copyLink}
            className="w-full mb-3 py-4 rounded-2xl bg-[#24283b] hover:bg-[#2c3150] text-white font-semibold flex items-center justify-center gap-2 transition"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copiado" : "Copiar Enlace"}
          </button>

          <button
            onClick={handleStartRoomGame}
            className="w-full mb-4 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-2 transition"
          >
            <Play size={18} /> Iniciar Partida
          </button>

          <button
            onClick={() => {
              setRoomCode(null);
              setView("menu");
            }}
            className="w-full text-center text-white/60 hover:text-white transition"
          >
            Cancelar
          </button>
        </motion.div>
      </div>
    );
  }

  /* =========================
        WAITING ROOM VIEW (Joiner)
  ========================= */

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#3a2a78] to-[#1b163a] border border-white/10 shadow-2xl"
      >
        <h2 className="text-3xl font-black text-white text-center mb-2">Sala {roomCode}</h2>
        <p className="text-center text-white/70 mb-4">Esperando al host...</p>

        <div className="mb-4">
          <div className="relative">
            {isEditingName ? (
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                autoFocus
                maxLength={20}
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center placeholder:text-white/40 focus:outline-none focus:border-purple-400"
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center gap-2 hover:bg-white/15 transition"
              >
                <span>{playerName}</span>
                <Pencil size={14} className="text-white/60" />
              </button>
            )}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-white/70" />
            <span className="text-white/70 text-sm">Jugadores ({players.length})</span>
            {isConnected ? (
              <Wifi size={14} className="text-green-400 ml-auto" />
            ) : (
              <WifiOff size={14} className="text-red-400 ml-auto" />
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {players.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-2">Conectando...</p>
            ) : (
              players.map((p) => (
                <div key={p.odId} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{p.username}</span>
                  {p.isHost && (
                    <span className="ml-auto text-xs bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">
                      Host
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-white/60">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-sm">Esperando que el host inicie la partida...</span>
        </div>
      </motion.div>
    </div>
  );
}
