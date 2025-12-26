import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Copy } from "lucide-react";

type View = "play" | "room_created";
type Difficulty = "easy" | "medium" | "hard";

export default function GameLobby() {
  const [view, setView] = useState<View>("play");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [roomCode, setRoomCode] = useState("");

  /* ---------------- utils ---------------- */

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  /* ---------------- handlers ---------------- */

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setView("room_created");
  };

  const handleStartGame = () => {
    console.log("START GAME", { difficulty, roomCode });
    // acá después conectamos el juego real
  };

  /* =========================
        PLAY VIEW
  ========================= */

  if (view === "play") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl p-8
            bg-gradient-to-br from-[#1c1f2e] to-[#141625]
            border border-white/10 shadow-2xl"
        >
          <h1 className="text-3xl font-black text-center text-white mb-2">Play</h1>
          <p className="text-center text-white/60 mb-8">Select difficulty</p>

          {/* Difficulty */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { id: "easy", label: "Easy", sub: "A1, A2" },
              { id: "medium", label: "Medium", sub: "B1, B2" },
              { id: "hard", label: "Hard", sub: "C1, C2" },
            ].map((d) => {
              const active = difficulty === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id as Difficulty)}
                  className={`
                    rounded-2xl p-4 text-center transition
                    ${
                      active
                        ? "bg-yellow-400/20 border border-yellow-400 text-yellow-300"
                        : "bg-white/5 border border-white/10 text-white"
                    }
                  `}
                >
                  <div className="font-bold">{d.label}</div>
                  <div className="text-xs opacity-70">{d.sub}</div>
                </button>
              );
            })}
          </div>

          {/* Play */}
          <button
            onClick={handleStartGame}
            className="w-full mb-3 py-4 rounded-2xl
              bg-purple-600 hover:bg-purple-700
              text-white font-bold transition"
          >
            Play
          </button>

          {/* Create room */}
          <button
            onClick={handleCreateRoom}
            className="w-full py-4 rounded-2xl
              bg-white/5 hover:bg-white/10
              text-white font-semibold transition"
          >
            Create room
          </button>
        </motion.div>
      </div>
    );
  }

  /* =========================
      ROOM CREATED VIEW
  ========================= */

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl p-8
          bg-gradient-to-br from-[#3a2a78] to-[#1b163a]
          border border-white/10 shadow-2xl"
      >
        <h2 className="text-3xl font-black text-white text-center mb-2">¡Sala Creada!</h2>
        <p className="text-center text-white/70 mb-6">Comparte el código con tus amigos</p>

        {/* Code */}
        <div className="flex justify-center gap-3 mb-6">
          {roomCode.split("").map((c, i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-2xl
                bg-purple-500 flex items-center justify-center"
            >
              <span className="text-2xl font-black text-white">{c}</span>
            </div>
          ))}
        </div>

        {/* Copy */}
        <button
          onClick={() => navigator.clipboard.writeText(roomCode)}
          className="w-full mb-3 py-4 rounded-2xl
            bg-[#24283b] hover:bg-[#2c3150]
            text-white font-semibold flex items-center justify-center gap-2 transition"
        >
          <Copy size={18} /> Copiar Enlace
        </button>

        {/* Start */}
        <button
          onClick={handleStartGame}
          className="w-full mb-4 py-4 rounded-2xl
            bg-purple-600 hover:bg-purple-700
            text-white font-bold flex items-center justify-center gap-2 transition"
        >
          <Play size={18} /> Iniciar Partida
        </button>

        {/* Cancel */}
        <button
          onClick={() => setView("play")}
          className="w-full text-center text-white/60 hover:text-white transition"
        >
          Cancelar
        </button>
      </motion.div>
    </div>
  );
}
