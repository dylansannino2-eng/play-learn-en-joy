import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import CorrectAnswerAnimation from "./shared/CorrectAnswerAnimation";
import ParticipationChat, { ChatMessage } from "./shared/ParticipationChat";
import RoundRanking from "./shared/RoundRanking";
import GameLobby from "./shared/GameLobby";
import MicroLesson from "./shared/MicroLesson";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROUND_SECONDS = 45;
type Difficulty = "easy" | "medium" | "hard";

interface SubtitleItem {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleConfig {
  id: string;
  name: string | null;
  video_id: string | null;
  start_time: number | null;
  end_time: number | null;
  subtitles: SubtitleItem[] | null;
  translations: SubtitleItem[] | null;
  target_subtitle_index: number | null;
  hidden_word: string | null;
  hidden_word_index: number | null;
}

interface BlankSubtitle {
  originalText: string;
  displayText: string;
  hiddenWord: string;
  wordIndex: number;
}

function createBlankSubtitle(
  text: string,
  predefinedWord?: string | null,
  predefinedWordIndex?: number | null,
): BlankSubtitle | null {
  const words = text
    .replace(/\n/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return null;

  if (predefinedWord && predefinedWordIndex !== null && predefinedWordIndex !== undefined) {
    const displayWords = [...words];
    if (predefinedWordIndex >= 0 && predefinedWordIndex < words.length) {
      displayWords[predefinedWordIndex] = "____";
      return {
        originalText: text,
        displayText: displayWords.join(" "),
        hiddenWord: predefinedWord.toLowerCase(),
        wordIndex: predefinedWordIndex,
      };
    }
  }

  if (predefinedWord) {
    const lowerPredefined = predefinedWord.toLowerCase();
    for (let i = 0; i < words.length; i++) {
      const cleanWord = words[i].replace(/[.,!?'"()]/g, "").toLowerCase();
      if (cleanWord === lowerPredefined) {
        const displayWords = [...words];
        displayWords[i] = "____";
        return {
          originalText: text,
          displayText: displayWords.join(" "),
          hiddenWord: lowerPredefined,
          wordIndex: i,
        };
      }
    }
  }

  const validIndices = words
    .map((w, i) => ({ word: w.replace(/[.,!?'"()]/g, ""), index: i }))
    .filter((item) => item.word.length >= 3);

  const randomIndex = validIndices.length
    ? validIndices[Math.floor(Math.random() * validIndices.length)].index
    : Math.floor(Math.random() * words.length);

  const hiddenWord = words[randomIndex].replace(/[.,!?'"()]/g, "");

  const displayWords = [...words];
  displayWords[randomIndex] = "____";

  return {
    originalText: text,
    displayText: displayWords.join(" "),
    hiddenWord: hiddenWord.toLowerCase(),
    wordIndex: randomIndex,
  };
}

type GamePhase = "waiting" | "ready" | "playing" | "microlesson" | "ranking";

interface TheMovieInterpreterGameProps {
  roomCode?: string;
  onBack?: () => void;
  microlessonsEnabled?: boolean;
}

export default function TheMovieInterpreterGame({
  roomCode,
  onBack,
  microlessonsEnabled = true,
}: TheMovieInterpreterGameProps) {
  const { playSound, preloadSounds } = useGameSounds();

  const [displayName, setDisplayName] = useState("");
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>(roomCode);
  const [isHostInRoom, setIsHostInRoom] = useState(false);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(["medium"]);

  const { players, isConnected, gameEvent, broadcastGameEvent, broadcastCorrectAnswer } = useMultiplayerGame(
    "the-movie-interpreter",
    gameRoomCode,
    displayName || undefined,
  );

  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig | null>(null);
  const [blankSubtitle, setBlankSubtitle] = useState<BlankSubtitle | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hasAnsweredThisRound, setHasAnsweredThisRound] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [usedConfigIds, setUsedConfigIds] = useState<Set<string>>(new Set());

  // Preload sonidos
  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  // Determinar si es host
  useEffect(() => {
    if (!isConnected || !players.length) return;
    const me = players.find((p) => p.username === displayName);
    setIsHostInRoom(!!me?.isHost);
  }, [players, isConnected, displayName]);

  // Escuchar evento de next_round (host y joiners)
  useEffect(() => {
    if (!gameEvent || gameEvent.type !== "next_round") return;
    const payload = gameEvent.payload as { round: number; roundEndsAt: number };
    setRound(payload.round);
    setRoundEndsAt(payload.roundEndsAt);
    setTimeLeft(Math.max(0, Math.ceil((payload.roundEndsAt - Date.now()) / 1000)));
    setHasAnsweredThisRound(false);
    setStreak(0);
    playSound("gameStart", 0.5);
  }, [gameEvent]);

  // Host pide config al iniciar cada ronda
  const fetchRandomConfig = useCallback(async () => {
    let { data } = await supabase.from("subtitle_configs").select("*");
    if (!data?.length) {
      toast.error("No hay configuraciones");
      return;
    }
    const pool = data.filter((c) => c.id && !usedConfigIds.has(c.id));
    const chosen = (pool.length ? pool : data)[Math.floor(Math.random() * (pool.length || data.length))];
    const config: SubtitleConfig = { ...chosen };
    setSubtitleConfig(config);
    setUsedConfigIds((prev) => new Set(prev).add(config.id));
    setBlankSubtitle(null);

    // Broadcast con fase forzada playing
    if (isHostInRoom && gameRoomCode) {
      await broadcastGameEvent("sync_config", {
        config,
        round,
        roundEndsAt: Date.now() + ROUND_SECONDS * 1000,
        phase: "playing",
      });
    }
  }, [usedConfigIds, isHostInRoom, gameRoomCode, round, roundEndsAt]);

  // Host emite next_round y pide config nueva
  const nextRound = useCallback(async () => {
    const newRound = round + 1;
    const newEnds = Date.now() + ROUND_SECONDS * 1000;
    if (isHostInRoom && gameRoomCode) {
      await broadcastGameEvent("next_round", {
        round: newRound,
        roundEndsAt: newEnds,
        phase: "playing",
      });
    }
    setRound(newRound);
    setRoundEndsAt(newEnds);
    setTimeLeft(ROUND_SECONDS);
    setHasAnsweredThisRound(false);
    setStreak(0);
    void fetchRandomConfig();
  }, [round, isHostInRoom, gameRoomCode]);

  // Timer local basado en roundEndsAt
  useEffect(() => {
    if (!roundEndsAt) return;
    const i = setInterval(() => {
      const sec = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
      setTimeLeft(sec);
      if (sec === 0) clearInterval(i);
    }, 500);
    return () => clearInterval(i);
  }, [roundEndsAt]);

  // Crear blank subtitle cuando el host asigna config
  useEffect(() => {
    if (!subtitleConfig?.subtitles?.length) return;
    const target = subtitleConfig.subtitles[subtitleConfig.target_subtitle_index ?? 0];
    const blank = createBlankSubtitle(target.text, subtitleConfig.hidden_word, subtitleConfig.hidden_word_index);
    setBlankSubtitle(blank);
  }, [subtitleConfig]);

  const handleSendMessage = async (message: string) => {
    if (!blankSubtitle || hasAnsweredThisRound) return;
    const normalizedAnswer = message.toLowerCase().trim();
    const isCorrect = normalizedAnswer === blankSubtitle.hiddenWord;
    if (isCorrect) {
      setHasAnsweredThisRound(true);
      const points = 10 + Math.floor(timeLeft / 5) + streak * 2;
      setScore((prev) => prev + points);
      setStreak((prev) => prev + 1);
      await broadcastCorrectAnswer(message, points);
      playSound("correct", 0.6);
      toast.success(`¡Correcto! +${points} pts`);
    } else {
      setStreak(0);
      playSound("wrong", 0.4);
      toast.error("Incorrecto");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">The Movie Interpreter</h1>
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <Users className="w-4 h-4" />
          <span>{players.length}</span>
          <Clock className="w-4 h-4" />
          <span>{timeLeft}s</span>
          <span>Ronda {round}</span>
        </div>
      </header>

      {blankSubtitle && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-6">
          <p className="text-lg">{blankSubtitle.displayText}</p>
        </motion.div>
      )}

      <div className="flex justify-center mb-6">
        <Button onClick={fetchRandomConfig} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Nueva Config
        </Button>
      </div>

      <ParticipationChat messages={[]} onSendMessage={handleSendMessage} />

      {isHostInRoom && timeLeft === 0 && (
        <div className="flex justify-center mt-6">
          <Button onClick={nextRound} className="bg-blue-600 px-6 py-2 rounded-lg">
            Siguiente ronda
          </Button>
        </div>
      )}

      <CorrectAnswerAnimation points={0} isVisible={false} onComplete={() => {}} />
      <RoundRanking players={[]} isHost={isHostInRoom} onNextRound={nextRound} />
      <MicroLesson word={blankSubtitle?.hiddenWord || ""} onContinue={nextRound} />
    </div>
  );
}
