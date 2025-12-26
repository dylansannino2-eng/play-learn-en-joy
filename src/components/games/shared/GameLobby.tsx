import { useState } from "react";
import { motion } from "framer-motion";

type View = "main" | "create" | "join";

export default function RoomSystem() {
  const [view, setView] = useState<View>("main");
  const [roomCode, setRoomCode] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState("");

  // Utils
  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  // Actions
  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setCreatedRoomCode(code);
    setView("create");
  };

  const handleJoinRoom = () => {
    if (roomCode.length !== 4) return;
    console.log("Joining room:", roomCode);
    // Acá después va Supabase
  };

  /* =========================
      MAIN VIEW
  ========================= */
  if (view === "main") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-background border rounded-2xl shadow-lg p-6"
        >
          <h1 className="text-2xl font-bold text-center mb-6">Salas</h1>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleCreateRoom}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Crear sala
            </button>

            <div className="flex flex-col gap-2">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="Código de sala"
                className="w-full text-center tracking-widest uppercase py-3 rounded-xl border bg-background"
              />

              <button
                onClick={handleJoinRoom}
                className="w-full py-3 rounded-xl border font-semibold hover:bg-muted transition"
              >
                Unirse a sala
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* =========================
      CREATE ROOM VIEW
  ========================= */
  if (view === "create") {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-background border rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-center mb-2">Sala creada</h2>

          <p className="text-sm text-muted-foreground text-center mb-6">Compartí este código con tus amigos</p>

          <div className="flex justify-center gap-2 mb-6">
            {createdRoomCode.split("").map((char, i) => (
              <div key={i} className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-black text-primary">{char}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Esperando jugadores…</span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(createdRoomCode)}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              Copiar código
            </button>

            <button
              onClick={() => setView("main")}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
