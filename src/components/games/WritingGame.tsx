import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Trophy, Clock, Zap, Sparkles } from "lucide-react";
import GameLobby from "./shared/GameLobby";
import RoundRanking from "./shared/RoundRanking";
import { useGameSounds } from "@/hooks/useGameSounds";

const WORDS_BY_DIFFICULTY = {
  easy: [
    "happy", "book", "house", "water", "food", "friend", "family", "work",
    "school", "money", "time", "love", "life", "world", "music"
  ],
  medium: [
    "adventure", "beautiful", "challenge", "discovery", "enthusiasm",
    "freedom", "grateful", "harmony", "imagination", "journey",
    "knowledge", "liberty", "mysterious", "nature", "opportunity"
  ],
  hard: [
    "accomplished", "conscientious", "extraordinary", "incomprehensible",
    "simultaneously", "unprecedented", "sophisticated", "quintessential",
    "metaphorical", "philosophical", "revolutionary", "circumstantial"
  ]
};

const ROUND_SECONDS = 60;
const MAX_CHARS = 280;

type Difficulty = "easy" | "medium" | "hard";
type GamePhase = "waiting" | "playing" | "evaluating" | "ranking";

interface EvaluationResult {
  score: number;
  feedback: {
    extension: number;
    naturalness: number;
    grammar: number;
    wordUsage: boolean;
  };
  comment: string;
}

interface WritingGameProps {
  roomCode?: string;
  multiplayerEnabled?: boolean;
}

export default function WritingGame({ roomCode, multiplayerEnabled = false }: WritingGameProps) {
  const { playSound } = useGameSounds();
  const { preloadSounds } = useGameSounds();

  const [displayName, setDisplayName] = useState("");
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(["medium"]);

  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [userSentence, setUserSentence] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const lastTimerSecondRef = useRef<number>(ROUND_SECONDS);

  const [gamePhase, setGamePhase] = useState<GamePhase>("waiting");
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  const getRandomWord = useCallback((difficulty: Difficulty) => {
    const words = WORDS_BY_DIFFICULTY[difficulty];
    return words[Math.floor(Math.random() * words.length)];
  }, []);

  const getRandomDifficulty = useCallback(() => {
    return selectedDifficulties[Math.floor(Math.random() * selectedDifficulties.length)];
  }, [selectedDifficulties]);

  const startRoundTimer = useCallback(() => {
    const nextEndsAt = Date.now() + ROUND_SECONDS * 1000;
    lastTimerSecondRef.current = ROUND_SECONDS;
    setRoundEndsAt(nextEndsAt);
    setTimeLeft(ROUND_SECONDS);
    return nextEndsAt;
  }, []);

  const generateRoundWords = useCallback(() => {
    const difficulty = getRandomDifficulty();
    const words = [
      getRandomWord(difficulty),
      getRandomWord(difficulty),
      getRandomWord(difficulty)
    ];
    setCurrentWords(words);
    return words;
  }, [getRandomDifficulty, getRandomWord]);

  const evaluateSentence = useCallback(async () => {
    if (!userSentence.trim()) {
      setResult({
        score: 0,
        feedback: { extension: 0, naturalness: 0, grammar: 0, wordUsage: false },
        comment: "No escribiste ninguna oración. ¡Intenta de nuevo!"
      });
      setGamePhase("ranking");
      return;
    }

    setGamePhase("evaluating");

    const usedAWord = currentWords.some(w =>
      userSentence.toLowerCase().includes(w.toLowerCase())
    );

    try {
      const { data, error } = await supabase.functions.invoke("evaluate-writing", {
        body: { words: currentWords, sentence: userSentence.trim() },
      });

      if (error) throw error;

      const evaluation: EvaluationResult = data;
      setResult(evaluation);
      setScore(prev => prev + evaluation.score);
      playSound("correct", 0.6);
    } catch {
      const fallbackScore = usedAWord ? 40 : 10;
      setResult({
        score: fallbackScore,
        feedback: {
          extension: 40,
          naturalness: 40,
          grammar: 40,
          wordUsage: usedAWord
        },
        comment: "No pudimos evaluar con IA, score aproximado."
      });
      setScore(prev => prev + fallbackScore);
    }

    setGamePhase("ranking");
  }, [currentWords, userSentence, playSound]);

  useEffect(() => {
    if (gamePhase !== "playing") return;
    if (!roundEndsAt) {
      startRoundTimer();
      return;
    }

    const timer = window.setInterval(() => {
      const remainingMs = (roundEndsAt || 0) - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSec !== lastTimerSecondRef.current) {
        if (remainingSec <= 6 && remainingSec > 1) {
          playSound("tick", 0.3);
        }

        if (remainingSec <= 0 && lastTimerSecondRef.current > 0) {
          playSound("roundEnd", 0.6);
          evaluateSentence();
        }

        lastTimerSecondRef.current = remainingSec;
        setTimeLeft(remainingSec);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [gamePhase, roundEndsAt, playSound, evaluateSentence, startRoundTimer]);

  const handleLobbyStart = useCallback(
    (payload: { difficulties: Difficulty[]; isHost: boolean; playerName: string }) => {
      setDisplayName(payload.playerName);
      setSelectedDifficulties(payload.difficulties);
      setUserSentence("");
      setResult(null);
      setRound(1);
      setScore(0);
      generateRoundWords();
      startRoundTimer();
      setGamePhase("playing");
      playSound("gameStart", 0.6);
    },
    [generateRoundWords, startRoundTimer, playSound]
  );

  const handleSubmit = () => {
    if (gamePhase === "playing" && userSentence.trim()) {
      evaluateSentence();
    }
  };

  const nextRound = useCallback(() => {
    if (round >= totalRounds) return;
    setRound(r => r + 1);
    setUserSentence("");
    setResult(null);
    generateRoundWords();
    startRoundTimer();
    setGamePhase("playing");
    playSound("gameStart", 0.5);
  }, [round, totalRounds, generateRoundWords, startRoundTimer, playSound]);

  const handlePlayAgain = useCallback(() => {
    playSound("gameStart", 0.5);
    setGamePhase("waiting");
    setRound(1);
    setScore(0);
    setResult(null);
    setUserSentence("");
  }, [playSound]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "text-green-400";
      case "medium": return "text-yellow-400";
      case "hard": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 60) return "text-yellow-500";
    if (s >= 40) return "text-orange-500";
    return "text-red-500";
  };

  if (gamePhase === "ranking" && result) {
    const isLastRound = round >= totalRounds;
    const rankingPlayers = [
      { rank: 1, username: displayName || "Player", points: score, correctAnswers: round, streak: 0, isCurrentUser: true }
    ];

    return (
      <>
        <RoundRanking
          players={rankingPlayers}
          roundNumber={round}
          totalRounds={totalRounds}
          countdownSeconds={8}
          onCountdownComplete={isLastRound ? handlePlayAgain : nextRound}
          isLastRound={isLastRound}
          allPlayersCorrect={result.feedback.wordUsage}
          isSoloMode={true}
        />

        <div className="w-96 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-lg">Evaluación IA</h3>
          </div>

          <div className="flex-1 p-4 space-y-4">
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground mb-1">Tu puntuación</p>
              <span className={`text-5xl font-black ${getScoreColor(result.score)}`}>
                {result.score}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Extensión</p>
                <p className={`text-lg font-bold ${getScoreColor(result.feedback.extension)}`}>
                  {result.feedback.extension}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Naturalidad</p>
                <p className={`text-lg font-bold ${getScoreColor(result.feedback.naturalness)}`}>
                  {result.feedback.naturalness}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Gramática</p>
                <p className={`text-lg font-bold ${getScoreColor(result.feedback.grammar)}`}>
                  {result.feedback.grammar}
                </p>
              </div>
            </div>

            <div className={`text-center p-2 rounded-lg text-sm ${result.feedback.wordUsage ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {result.feedback.wordUsage
                ? `✓ Usaste una palabra correctamente`
                : `✗ No usaste ninguna de las palabras`}
            </div>

            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-[10px] text-muted-foreground mb-1">Tu oración:</p>
              <p className="text-sm italic">"{userSentence}"</p>
            </div>

            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <p className="text-[10px] text-primary mb-1">💡 Feedback</p>
              <p className="text-sm text-foreground">{result.comment}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (gamePhase === "evaluating") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">Evaluando tu oración...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            <span className="font-bold text-lg">{score}</span>
          </div>
          <span className="text-sm text-muted-foreground">Ronda {round}/{totalRounds}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {gamePhase === "playing" && (
            <>
              <p className="text-sm text-muted-foreground mb-2">Usa estas 3 palabras:</p>
              <div className="flex gap-3 justify-center mb-8">
                {currentWords.map((word, i) => (
                  <div
                    key={i}
                    className={`
                      px-5 py-2 rounded-full font-extrabold text-2xl shadow-md border-2
                      ${i === 0 ? "bg-red-500/90 border-red-400 text-white" : ""}
                      ${i === 1 ? "bg-blue-500/90 border-blue-400 text-white" : ""}
                      ${i === 2 ? "bg-green-500/90 border-green-400 text-white" : ""}
                    `}
                  >
                    {word}
                  </div>
                ))}
              </div>
            </>
          )}

          {gamePhase === "waiting" && (
            <GameLobby
              gameSlug="writing-game"
              initialRoomCode={roomCode}
              multiplayerEnabled={multiplayerEnabled}
              onStartGame={handleLobbyStart}
            />
          )}
        </div>
      </div>

      {gamePhase === "playing" && (
        <div className="w-96 bg-card rounded-xl border border-border overflow-hidden flex flex-col p-4">
          <Textarea
            value={userSentence}
            onChange={(e) => setUserSentence(e.target.value.slice(0, MAX_CHARS))}
            placeholder={`Escribe una oración usando al menos una palabra...`}
            className="w-full h-[240px] resize-none text-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 border-4 border-amber-200 focus:border-amber-400 rounded-xl p-4 placeholder:text-muted-foreground/50 shadow-sm"
          />

          <div className="flex items-center justify-between mt-4">
            <Button
              onClick={handleSubmit}
              disabled={!userSentence.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 px-6"
            >
              Enviar
            </Button>

            <span className="text-sm text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
              {userSentence.length} / {MAX_CHARS}
            </span>
          </div>
        </div>
      )}

      {gamePhase === "waiting" && (
        <div className="w-96 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 border-b border-border">
            <h3 className="font-bold text-foreground text-lg">Writing Challenge</h3>
            <p className="text-sm text-muted-foreground">Practica tu escritura</p>
          </div>

          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-12 h-12 text-amber-400 mb-4" />
            <p className="text-muted-foreground mb-2">
              Escribe oraciones creativas usando 3 palabras aleatorias
            </p>
            <p className="text-xs text-muted-foreground">
              La IA evaluará tu extensión, naturalidad y gramática
            </p>
          </div>
        </div>
      )}
    </>
  );
}
