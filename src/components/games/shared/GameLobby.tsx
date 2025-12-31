import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Copy, Check, Users, Wifi, WifiOff, Pencil, LogIn, ArrowLeft, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/* =======================
    TYPES
======================= */

type View = "menu" | "join_menu" | "room_created" | "waiting_room";
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

  // Estados para la lógica de "Join"
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
          <h1 className="text-4xl font-black text-center text-white mb-2 tracking-tight">Play</h1>
          <p className="text-center text-white/60 mb-8">Selecciona la dificultad</p>

          <div className="mb-6">
            <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2 block ml-1">
              Tu nombre
            </label>
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
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-500/50 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-left flex items-center justify-between hover:bg-white/10 transition group"
                >
                  <span className="font-medium">{playerName}</span>
                  <Pencil size={16} className="text-white/40 group-hover:text-purple-400 transition" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { id: "easy", label: "Easy", sub: "A1-A2" },
              { id: "medium", label: "Med", sub: "B1-B2" },
              { id: "hard", label: "Hard", sub: "C1-C2" },
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
                  className={`rounded-2xl p-3 text-center transition-all duration-300 border ${
                    active
                      ? "bg-purple-500/20 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  <div className="font-black text-sm">{d.label}</div>
                  <div className="text-[10px] font-bold opacity-50">{d.sub}</div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleQuickPlay}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
            >
              <Play size={20} fill="currentColor" /> SOLO PLAY
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCreateRoom}
                className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition border border-white/10 flex items-center justify-center gap-2"
              >
                <Users size={18} /> CREATE
              </button>

              <button
                onClick={() => setView("join_menu")}
                className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition border border-white/10 flex items-center justify-center gap-2"
              >
                <LogIn size={18} /> JOIN
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* =========================
        JOIN ROOM VIEW
  ========================= */

  if (view === "join_menu") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#1c1f2e] to-[#141625] border border-white/10 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setView("menu")}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-black text-white">Unirse a Sala</h2>
          </div>

          {/* Código de Sala */}
          <div className="space-y-4 mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="CÓDIGO"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 4))}
                className="w-full px-4 py-5 rounded-2xl bg-white/5 border-2 border-purple-500/20 text-white text-center text-3xl font-black tracking-[0.4em] placeholder:text-white/5 focus:outline-none focus:border-purple-500 focus:bg-purple-500/5 transition-all"
              />
            </div>
            <button
              disabled={inputCode.length !== 4}
              onClick={handleJoinRoom}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:grayscale"
            >
              <LogIn size={20} /> ENTRAR AHORA
            </button>
          </div>

          {/* Divisor */}
          <div className="relative mb-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <span className="relative px-4 bg-[#181a29] text-white/30 text-[10px] font-bold uppercase tracking-widest">
              Salas Públicas
            </span>
          </div>

          {/* Salas Públicas Listado */}
          <div className="space-y-3">
            <div className="bg-white/5 rounded-2xl p-2 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-black">
                      <Globe size={18} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Public_Lobby_{i * 7}</p>
                      <p className="text-white/30 text-[10px] uppercase font-bold tracking-tight">
                        3/8 Jugadores • Normal
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setInputCode(`PUB${i}`);
                    }}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-purple-600 text-white text-[10px] font-black transition-all"
                  >
                    UNIRSE
                  </button>
                </div>
              ))}
              <p className="text-center text-white/20 text-[10px] py-3 font-medium">Buscando más salas...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* =========================
        ROOM CREATED VIEW
  ========================= */

  if (view === "room_created") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#3a2a78] to-[#1b163a] border border-white/10 shadow-2xl text-center"
        >
          <h2 className="text-3xl font-black text-white mb-2">¡Sala Lista!</h2>
          <p className="text-white/60 mb-8">Comparte el código con tus amigos</p>

          <div className="flex justify-center gap-3 mb-8">
            {roomCode?.split("").map((c, i) => (
              <motion.div
                key={i}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg"
              >
                <span className="text-3xl font-black text-white">{c}</span>
              </motion.div>
            ))}
          </div>

          <div className="bg-white/5 rounded-2xl p-5 mb-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-purple-400" />
                <span className="text-white font-bold text-sm">Jugadores ({players.length})</span>
              </div>
              {isConnected ? (
                <Wifi size={16} className="text-green-400" />
              ) : (
                <WifiOff size={16} className="text-red-400" />
              )}
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {players.map((p) => (
                <div key={p.odId} className="flex items-center gap-3 bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-medium">{p.username}</span>
                  {p.isHost && (
                    <span className="ml-auto text-[9px] font-black bg-yellow-400 text-black px-2 py-0.5 rounded-full uppercase">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleStartRoomGame}
              disabled={players.length < 1}
              className="w-full py-4 rounded-2xl bg-white text-purple-900 font-black flex items-center justify-center gap-2 hover:bg-purple-100 transition shadow-xl disabled:opacity-50"
            >
              <Play size={20} fill="currentColor" /> INICIAR PARTIDA
            </button>

            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                {copied ? "COPIADO" : "COPIAR LINK"}
              </button>
              <button
                onClick={() => {
                  setRoomCode(null);
                  setView("menu");
                }}
                className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition"
              >
                SALIR
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* =========================
        WAITING ROOM VIEW (FOR GUESTS)
  ========================= */

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#1c1f2e] to-[#141625] border border-white/10 shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
          <Users size={40} className="text-purple-500 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Sala {roomCode}</h2>
        <p className="text-white/40 text-sm mb-8">Esperando que el host inicie la partida...</p>

        <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/5">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <div className="flex -space-x-2">
              {players.map((p, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-[#1c1f2e] bg-purple-500 flex items-center justify-center text-[10px] font-black text-white"
                >
                  {p.username[0].toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-white/60 text-xs font-bold ml-2">{players.length} jugadores unidos</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Preparando escenario...
          </div>
        </div>

        <button
          onClick={() => {
            setRoomCode(null);
            setView("menu");
          }}
          className="text-white/30 hover:text-white transition text-xs font-bold uppercase tracking-widest"
        >
          Abandonar Sala
        </button>
      </motion.div>
    </div>
  );
}
