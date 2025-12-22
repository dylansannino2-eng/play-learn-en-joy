import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Zap, Users, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import CorrectAnswerAnimation from "./shared/CorrectAnswerAnimation";
import ParticipationChat, { ChatMessage } from "./shared/ParticipationChat";
import RoundRanking from "./shared/RoundRanking";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useAuth } from "@/contexts/AuthContext";

/* ─────────────────────────────── */
/* Lobby inline */
/* ─────────────────────────────── */

interface GameLobbyInlineProps {
  isConnected: boolean;
  playerCount: number;
  onStartGame: () => void;
}

function GameLobbyInline({ isConnected, playerCount, onStartGame }: GameLobbyInlineProps) {
  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
      <div className="bg-primary rounded-2xl p-8 border-4 border-foreground/20 shadow-xl">
        <h2 className="text-3xl font-black text-primary-foreground text-center mb-6">Play</h2>

        <button
          onClick={onStartGame}
          className="w-full py-3 bg-amber-100 hover:bg-amber-200 text-foreground font-bold text-lg rounded-xl border-2 border-foreground/20 transition-colors"
        >
          Play
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary-foreground">
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <Users size={16} />
          {playerCount}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────── */
/* Types */
/* ─────────────────────────────── */

interface WordBattleCard {
  id: string;
  prompt: string;
  category: string;
  letter: string;
  correct_answers: string[];
  difficulty: "easy" | "medium" | "hard";
}

type GamePhase = "waiting" | "playing" | "ranking";

interface WordBattleGameProps {
  roomCode?: string;
}

/* ─────────────────────────────── */
/* Main Game */
/* ─────────────────────────────── */

export default function WordBattleGame({ roomCode }: WordBattleGameProps) {
  const { user } = useAuth();
  const username = user?.email?.split("@")[0] || "Jugador";

  const { playSound, preloadSounds } = useGameSounds();

  const { players, playerCount, isConnected, updateScore, broadcastCorrectAnswer } = useMultiplayerGame(
    "word-battle",
    roomCode,
  );

  const [currentCard, setCurrentCard] = useState<WordBattleCard | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [usedAnswers, setUsedAnswers] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(30);
  const [gamePhase, setGamePhase] = useState<GamePhase>("waiting");
  const [round, setRound] = useState(1);
  const totalRounds = 5;

  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);

  const [showAnimation, setShowAnimation] = useState(false);
  const [animationWord, setAnimationWord] = useState("");
  const [animationPoints, setAnimationPoints] = useState(0);

  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  const fetchRandomCard = useCallback(async () => {
    const { data, error } = await supabase.from("word_battle_cards").select("*").eq("is_active", true);

    if (error || !data?.length) {
      toast.error("No hay cartas disponibles");
      return;
    }

    const random = data[Math.floor(Math.random() * data.length)];
    setCurrentCard(random);
    setUsedAnswers(new Set());
    setHasAnsweredCorrectly(false);
  }, []);

  useEffect(() => {
    fetchRandomCard();
  }, [fetchRandomCard]);

  useEffect(() => {
    if (gamePhase !== "playing" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 6 && t > 1) playSound("tick", 0.3);
        if (t <= 1) {
          playSound("roundEnd", 0.6);
          setGamePhase("ranking");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, timeLeft, playSound]);

  const startGame = () => {
    playSound("gameStart", 0.6);
    setGamePhase("playing");
    setScore(0);
    setCorrectAnswers(0);
    setStreak(0);
    setTimeLeft(30);
    setRound(1);
    setHasAnsweredCorrectly(false);
    fetchRandomCard();
  };

  const checkAnswer = (answer: string) => {
    if (!currentCard) return false;
    const normalized = answer.toLowerCase().trim();
    return currentCard.correct_answers.some((a) => a.toLowerCase() === normalized) && !usedAnswers.has(normalized);
  };

  const handleSendMessage = async (message: string) => {
    if (!currentCard || gamePhase !== "playing") return;

    const isCorrect = checkAnswer(message);

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        username,
        message,
        type: "message",
        timestamp: new Date(),
        isCurrentUser: true,
      },
    ]);

    if (isCorrect && hasAnsweredCorrectly) return;

    if (isCorrect) {
      playSound("correct", 0.6);

      const normalized = message.toLowerCase().trim();
      setUsedAnswers((s) => new Set(s).add(normalized));

      const points = 10 + Math.floor(timeLeft / 5) + streak * 2;

      setScore((s) => s + points);
      setCorrectAnswers((c) => c + 1);
      setStreak((s) => s + 1);
      setHasAnsweredCorrectly(true);

      await updateScore(score + points, correctAnswers + 1, streak + 1);
      await broadcastCorrectAnswer(message, points);

      /* ✅ MENSAJE DE SISTEMA AL CHAT */
      setChatMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          username: "Sistema",
          message: `${username} ha acertado`,
          type: "system",
          timestamp: new Date(),
          isCurrentUser: false,
        },
      ]);

      setAnimationWord(message.toUpperCase());
      setAnimationPoints(points);
      setShowAnimation(true);
    } else {
      playSound("wrong", 0.4);
      setStreak(0);
      await updateScore(score, correctAnswers, 0);
    }
  };

  if (gamePhase === "ranking") {
    return (
      <RoundRanking
        players={players}
        roundNumber={round}
        totalRounds={totalRounds}
        countdownSeconds={5}
        onCountdownComplete={() => {
          setRound((r) => r + 1);
          setTimeLeft(30);
          setGamePhase("playing");
          fetchRandomCard();
        }}
      />
    );
  }

  return (
    <>
      <CorrectAnswerAnimation
        word={animationWord}
        points={animationPoints}
        isVisible={showAnimation}
        onComplete={() => setShowAnimation(false)}
      />

      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" />
              <span className="font-bold">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={timeLeft <= 10 ? "text-destructive animate-pulse" : ""} />
              <span>{timeLeft}s</span>
            </div>
            {streak > 1 && (
              <span className="px-2 py-1 bg-orange-500/20 rounded-full text-orange-400 text-sm font-bold">
                🔥 x{streak}
              </span>
            )}
          </div>

          <div className="flex gap-4 items-center text-sm">
            <div className="flex gap-1 items-center">
              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              <Users size={16} />
              {playerCount}
            </div>
            <span>
              Ronda {round}/{totalRounds}
            </span>
            <Zap size={16} />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          {gamePhase === "waiting" && (
            <GameLobbyInline isConnected={isConnected} playerCount={playerCount} onStartGame={startGame} />
          )}
        </div>
      </div>

      <ParticipationChat
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        disabled={gamePhase !== "playing" || hasAnsweredCorrectly}
        currentUsername={username}
      />
    </>
  );
}
