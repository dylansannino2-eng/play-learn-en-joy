import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Trophy, User, MessageSquare, Star, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* =======================
      TYPES & CONFIG
======================= */

interface Player {
  username: string;
  score: number;
  odId: string;
}

const LECTURE_TEXTS = [
  "The quick brown fox jumps over the lazy dog.",
  "Learning a new language opens up a world of opportunities.",
  "Practice makes perfect when it comes to speaking English.",
  "Artificial intelligence is changing the way we interact with technology."
];

/* =======================
      HELPER FUNCTIONS
======================= */

// IA de calificación simple: Compara similitud de palabras
const calculateScore = (original: string, spoken: string): number => {
  const origWords = original.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(" ");
  const spokWords = spoken.toLowerCase().split(" ");
  let matches = 0;
  origWords.forEach(word => {
    if (spokWords.includes(word)) matches++;
  });
  return Math.round((matches / origWords.length) * 100);
};

/* =======================
      COMPONENT
======================= */

export default function LectureRoom({ roomCode, players: initialPlayers, isHost, playerName }: any) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers.map((p: any) => ({ ...p, score: 0 })));
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [currentText, setCurrentText] = useState(LECTURE_TEXTS[0]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastScore, setLastScore] = useState<number | null>(null);
  
  const channelRef = useRef<any>(null);

  // Determinar si es mi turno
  const isMyTurn = players[currentTurnIndex]?.username === playerName;

  useEffect(() => {
    const channel = supabase.channel(`game:${roomCode}`);

    channel.on("broadcast", { event: "turn_result" }, ({ payload }) => {
      setPlayers(payload.updatedPlayers);
      setCurrentTurnIndex(payload.nextTurn);
      setLastScore(payload.score);
      setTranscript(payload.spokenText);
      // Cambiar texto aleatoriamente para el siguiente
      setCurrentText(LECTURE_TEXTS[Math.floor(Math.random() * LECTURE_TEXTS.length)]);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => { channel.unsubscribe(); };
  }, [roomCode]);

  /* ---------------- Speech Recognition ---------------- */

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      handleTurnEnd(spokenText);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleTurnEnd = async (spokenText: string) => {
    const score = calculateScore(currentText, spokenText);
    
    const updatedPlayers = [...players];
    updatedPlayers[currentTurnIndex].score += score;

    const nextTurn = (currentTurnIndex + 1) % players.length;

    // Sincronizar con los demás
    await channelRef.current.send({
      type: "broadcast",
      event: "turn_result",
      payload: { updatedPlayers, nextTurn, score, spokenText }
    });

    setPlayers(updatedPlayers);
    setCurrentTurnIndex(nextTurn);
    setLastScore(score);
    // Cambiar texto
    setCurrentText(LECTURE_TEXTS[Math.floor(Math.random() * LECTURE_TEXTS.length)]);
  };

  const textToSpeech = () => {
    const utterance = new SpeechSynthesisUtterance(currentText);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 p-4">
      
      {/* HEADER: PUNTUACIONES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {players.map((p, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-2xl border-2 transition-all ${
              i === currentTurnIndex ? "bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold">
                {p.username.charAt(0)}
              </div>
              <span className="text-sm font-bold truncate text-white">{p.username}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-white/50 uppercase">Score</span>
              <span className="text-lg font-black text-yellow-400">{p.score}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ÁREA DE LECTURA PRINCIPAL */}
      <motion.div 
        layout
        className="bg-gradient-to-br from-[#1c1f2e] to-[#141625] rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-6">
          <span className="bg-purple-600/30 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30 uppercase tracking-widest">
            {isMyTurn ? "Your Turn" : `Waiting for ${players[currentTurnIndex]?.username}`}
          </span>
          <button onClick={textToSpeech} className="p-2 hover:bg-white/5 rounded-full text-white/60 transition">
            <Volume2 size={20} />
          </button>
        </div>

        <h2 className="text-2xl md:text-4xl font-bold text-white text-center leading-relaxed mb-8">
          "{currentText}"
        </h2>

        {/* FEEDBACK DE IA */}
        <AnimatePresence>
          {transcript && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5"
            >
              <p className="text-xs text-white/40 uppercase mb-2">IA Transcription:</p>
              <p className="text-white italic text-lg">"{transcript}"</p>
              {lastScore !== null && (
                <div className="mt-3 flex items-center gap-2">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-yellow-400">Accuracy: {lastScore}%</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTÓN DE ACCIÓN */}
        <div className="flex justify-center">
          {isMyTurn ? (
            <button
              onClick={startListening}
              disabled={isListening}
              className={`group relative flex flex-col items-center gap-4 transition-all ${isListening ? "scale-95 opacity-50" : "hover:scale-105"}`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isListening ? "bg-red-500 animate-pulse" : "bg-purple-600 group-hover:bg-purple-500"
              }`}>
                <Mic size={32} className="text-white" />
              </div>
              <span className="text-white font-bold uppercase tracking-widest text-sm">
                {isListening ? "Listening..." : "Hold to Speak"}
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 text-white/20">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center">
                <Mic size={32} />
              </div>
              <span className="font-bold uppercase tracking-widest text-sm">Waiting turn</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* FOOTER: ÚLTIMO RESULTADO */}
      <div className="text-center">
        <p className="text-white/40 text-xs">
          Tip: Pronounce clearly and at a moderate pace for better AI recognition.
        </p>
      </div>
    </div>
  );
}
