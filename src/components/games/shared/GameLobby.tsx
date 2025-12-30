import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Copy, Check, Users, Wifi, WifiOff, Pencil, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import JoinRoomFromLink from "./JoinRoomFromLink"; // Asegúrate de que la ruta sea correcta

/* =======================
    TYPES
======================= */

type View = "menu" | "room_created" | "waiting_room" | "join_step";
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
  gameTitle?: string;
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
  gameTitle = "Juego",
  initialRoomCode,
  existingRoomCode,
  isHostReturning,
  initialPlayerName,
  onStartGame,
  buildStartPayload,
}: GameLobbyProps) {
  const returningRoom = existingRoomCode?.toUpperCase();
  const joiningRoom = initialRoomCode?.toUpperCase();

  // MODIFICACIÓN: Si viene de un link, primero mostramos la vista de unión "join_step"
  const [view, setView] = useState<View>(
    returningRoom ? (isHostReturning ? "room_created" : "waiting_room") : joiningRoom ? "join_step" : "menu",
  );

  const [difficulties, setDifficulties] = useState<Difficulty[]>(["medium"]);
  const [roomCode, setRoomCode] = useState<string | null>(returningRoom || joiningRoom || null);
  const [isHost, setIsHost] = useState(isHostReturning ?? !initialRoomCode);
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // MODIFICACIÓN: No pre-asignamos un nombre aleatorio si el usuario debe elegirlo
  const [playerName, setPlayerName] = useState(initialPlayerName || "");
  const [hasConfirmedName, setHasConfirmedName] = useState(!!initialPlayerName);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [inputCode, setInputCode] = useState("");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const oderId = useRef(`player_${Math.random().toString(36).slice(2, 10)}`);

  /* ---------------- Realtime channel for lobby ---------------- */

  useEffect(() => {
    // MODIFICACIÓN: Solo conectamos si hay código Y el nombre ha sido confirmado
    if (!roomCode || !hasConfirmedName || !playerName) return;

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
  }, [roomCode, gameSlug, isHost, onStartGame, playerName, hasConfirmedName]);

  /* ---------------- handlers ---------------- */

  const handleJoinedFromLink = (confirmedName: string) => {
    setPlayerName(confirmedName);
    setHasConfirmedName(true);
    setView("waiting_room");
  };

  const handleQuickPlay = () => {
    // Si juega solo, le asignamos un nombre si no tiene
    const finalName = playerName || `Jugador_${Math.random().toString(36).slice(2, 6)}`;
    onStartGame({ difficulties, isHost: true, playerName: finalName });
  };

  const handleCreateRoom = () => {
    if (!playerName) {
      const autoName = `Anfitrión_${Math.random().toString(36).slice(2, 6)}`;
      setPlayerName(autoName);
    }
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setHasConfirmedName(true);
    setView("room_created");
  };

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
        RENDER LOGIC
  ========================= */

  // MODIFICACIÓN: Si el usuario entra por link, mostramos el componente de unión obligatorio
  if (view === "join_step" && joiningRoom) {
    return (
      <JoinRoomFromLink
        roomCode={joiningRoom}
        gameSlug={gameSlug}
        gameTitle={gameTitle}
        onJoined={handleJoinedFromLink}
        onGameStart={(diff) => {
          // Si el host ya inició mientras estábamos en la pantalla de carga
          onStartGame({ difficulties: [diff], roomCode: joiningRoom, isHost: false, playerName });
        }}
        onCancel={() => setView("menu")}
      />
    );
  }

  if (view === "menu") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#1c1f2e] to-[#141625] border border-white/10 shadow-2xl"
        >
          <h1 className="text-3xl font-black text-center text-white mb-2">Jugar</h1>
          <p className="text-center text-white/60 mb-6">Selecciona dificultad</p>

          <div className="mb-6">
            <label className="text-white/60 text-sm mb-2 block">Tu nombre</label>
            <div className="relative">
              {isEditingName || !playerName ? (
                <input
                  type="text"
                  placeholder="Tu nombre aquí..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                  onBlur={() => playerName && setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && playerName && setIsEditingName(false)}
                  autoFocus
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
            {["easy", "medium", "hard"].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficulties((prev) =>
                    prev.includes(d as Difficulty)
                      ? prev.length > 1
                        ? prev.filter((x) => x !== d)
                        : prev
                      : [...prev, d as Difficulty],
                  );
                }}
                className={`rounded-2xl p-4 text-center transition ${
                  difficulties.includes(d as Difficulty)
                    ? "bg-yellow-400/20 border border-yellow-400 text-yellow-300"
                    : "bg-white/5 border border-white/10 text-white"
                }`}
              >
                <div className="font-bold">{d.toUpperCase()}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3 mt-6">
            <button
              onClick={handleQuickPlay}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" /> Jugar Solo
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCreateRoom}
                className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold transition border border-white/10 flex items-center justify-center gap-2"
              >
                <Users size={18} /> Crear Sala
              </button>
              <button
                onClick={() => setIsJoining(!isJoining)}
                className={`py-4 rounded-2xl transition border border-white/10 font-semibold flex items-center justify-center gap-2 ${
                  isJoining ? "bg-purple-500/20 text-purple-300" : "bg-white/5"
                }`}
              >
                <LogIn size={18} /> Unirse
              </button>
            </div>

            <AnimatePresence>
              {isJoining && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
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
                      disabled={inputCode.length !== 4 || !playerName}
                      onClick={() => {
                        setRoomCode(inputCode);
                        setIsHost(false);
                        setHasConfirmedName(true);
                        setView("waiting_room");
                      }}
                      className="px-6 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-50"
                    >
                      Ir
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

  // Vistas de "ROOM_CREATED" y "WAITING_ROOM" (se mantienen igual que tu lógica original, pero ahora dependen de hasConfirmedName)
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl p-8 bg-gradient-to-br from-[#3a2a78] to-[#1b163a] border border-white/10 shadow-2xl"
      >
        <h2 className="text-3xl font-black text-white text-center mb-2">
          {view === "room_created" ? "¡Sala Creada!" : `Sala ${roomCode}`}
        </h2>
        <p className="text-center text-white/70 mb-4">
          {view === "room_created" ? "Comparte el código" : "Esperando al host..."}
        </p>

        {/* Lista de jugadores conectada a Presence */}
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
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {players.map((p) => (
              <div key={p.odId} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xs">
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white text-sm">{p.username}</span>
                {p.isHost && (
                  <span className="ml-auto text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {view === "room_created" ? (
          <>
            <button
              onClick={copyLink}
              className="w-full mb-3 py-4 rounded-2xl bg-[#24283b] text-white font-semibold flex items-center justify-center gap-2"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copiado" : "Copiar Enlace"}
            </button>
            <button
              onClick={handleStartRoomGame}
              className="w-full mb-4 py-4 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-center gap-2"
            >
              <Play size={18} /> Iniciar Partida
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 text-white/60">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-sm">El host iniciará pronto...</span>
          </div>
        )}

        <button
          onClick={() => setView("menu")}
          className="w-full mt-4 text-center text-white/40 text-sm hover:text-white"
        >
          Salir al menú
        </button>
      </motion.div>
    </div>
  );
}
